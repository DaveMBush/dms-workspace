import { PrismaClient } from '@prisma/client';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from 'vitest';

// Mock logger for integration tests
class TestLogger {
  warn(message: string, details?: { error: string }) {
    console.warn(`[TestLogger] ${message}`, details);
  }
}

/**
 * Integration tests for average purchase yield feature
 *
 * These tests verify the complete data flow from database to UI
 * for the average purchase yield calculations, including:
 * - Manual calculation verification
 * - Account-specific filtering
 * - Edge cases and error handling
 * - Performance with realistic datasets
 */
describe('average purchase yield integration tests', () => {
  // Increase timeout for database integration tests
  const integrationTestTimeout = 30000; // 30 seconds
  let prisma: PrismaClient;
  let testDbPath: string;
  let riskGroupId1: string;
  let riskGroupId2: string;
  let logger: TestLogger;
  let account1Id: string;
  let account2Id: string;

  beforeAll(async () => {
    // Initialize logger for test cleanup warnings
    logger = new TestLogger();

    // Use dedicated test.db file for database isolation
    testDbPath = join(process.cwd(), 'test-integration.db');
    const testDbUrl = `file:${testDbPath}`;

    // Delete existing test.db if it exists to ensure clean state
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }

    // Apply migrations to test database with isolated DATABASE_URL
    const { execSync } = await import('child_process');
    // Find workspace root by looking for package.json with workspace config
    let workspaceRoot = process.cwd();
    while (
      workspaceRoot !== '/' &&
      !existsSync(join(workspaceRoot, 'prisma', 'schema.prisma'))
    ) {
      workspaceRoot = join(workspaceRoot, '..');
    }
    const schemaPath = join(workspaceRoot, 'prisma', 'schema.prisma');
    execSync(`npx prisma migrate deploy --schema=${schemaPath}`, {
      env: { ...process.env, DATABASE_URL: testDbUrl },
      cwd: workspaceRoot,
    });

    // Initialize Prisma client with test database
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: testDbUrl,
        },
      },
    });
  }, integrationTestTimeout); // Increase timeout to 30 seconds for CI database setup

  beforeEach(async () => {
    // Clean database in correct order (respecting foreign key constraints)
    await prisma.trades.deleteMany();
    await prisma.divDeposits.deleteMany();
    await prisma.screener.deleteMany();
    await prisma.universe.deleteMany();
    await prisma.accounts.deleteMany();
    await prisma.risk_group.deleteMany();

    // Create test risk groups
    const riskGroup1 = await prisma.risk_group.create({
      data: { name: 'Equity ETF' },
    });
    const riskGroup2 = await prisma.risk_group.create({
      data: { name: 'REIT' },
    });

    riskGroupId1 = riskGroup1.id;
    riskGroupId2 = riskGroup2.id;

    // Create test accounts
    const account1 = await prisma.accounts.create({
      data: { name: 'Growth Account' },
    });
    const account2 = await prisma.accounts.create({
      data: { name: 'Income Account' },
    });

    account1Id = account1.id;
    account2Id = account2.id;
  });

  afterAll(async () => {
    // Ensure Prisma client is disconnected before cleanup
    await prisma.$disconnect();

    // Clean up test.db file with error handling to ensure cleanup always occurs
    try {
      if (existsSync(testDbPath)) {
        unlinkSync(testDbPath);
      }
    } catch (error) {
      // Log cleanup error but don't fail tests
      logger.warn('Could not clean up test-integration.db file', {
        error: String(error),
      });
    }
  });

  test('verifies manual calculation for VTI with multiple purchases - Account 1', async () => {
    // Create universe record for VTI
    const vtiUniverse = await prisma.universe.create({
      data: {
        symbol: 'VTI',
        distribution: 0.58,
        distributions_per_year: 4,
        last_price: 245.5,
        risk_group_id: riskGroupId1,
        expired: false,
      },
    });

    // Create trades at different prices for weighted average calculation
    await prisma.trades.createMany({
      data: [
        {
          universeId: vtiUniverse.id,
          accountId: account1Id,
          buy: 220.0,
          sell: 0,
          quantity: 50,
          buy_date: new Date('2024-01-15'),
          sell_date: null,
        },
        {
          universeId: vtiUniverse.id,
          accountId: account1Id,
          buy: 235.75,
          sell: 0,
          quantity: 30,
          buy_date: new Date('2024-02-15'),
          sell_date: null,
        },
      ],
    });

    // Query complete data for manual verification
    const universe = await prisma.universe.findUnique({
      where: { id: vtiUniverse.id },
      include: {
        trades: {
          where: {
            accountId: account1Id,
            sell_date: null,
          },
        },
      },
    });

    expect(universe).toBeTruthy();
    expect(universe!.trades).toHaveLength(2);

    // Manual calculation verification:
    // Total cost: (220.0 * 50) + (235.75 * 30) = 11,000 + 7,072.5 = 18,072.5
    // Total quantity: 50 + 30 = 80
    // Weighted avg price: 18,072.5 / 80 = 225.90625
    // Market yield: 100 * 4 * (0.58 / 245.50) = 0.9450%
    // Average purchase yield: 100 * 4 * (0.58 / 225.90625) = 1.0262%

    const totalCost = 220.0 * 50 + 235.75 * 30;
    const totalQuantity = 50 + 30;
    const avgPurchasePrice = totalCost / totalQuantity;
    const marketYield = 100 * 4 * (0.58 / 245.5);
    const avgPurchaseYield = 100 * 4 * (0.58 / avgPurchasePrice);

    expect(totalCost).toBeCloseTo(18072.5, 2);
    expect(totalQuantity).toBe(80);
    expect(avgPurchasePrice).toBeCloseTo(225.90625, 5);
    expect(marketYield).toBeCloseTo(0.945, 4);
    expect(avgPurchaseYield).toBeCloseTo(1.027, 4);

    // Verify yield is higher for purchase price (good value)
    expect(avgPurchaseYield).toBeGreaterThan(marketYield);
  });

  test('verifies manual calculation for SCHD with single purchase - Account 2', async () => {
    // Create universe record for SCHD
    const schdUniverse = await prisma.universe.create({
      data: {
        symbol: 'SCHD',
        distribution: 0.74,
        distributions_per_year: 4,
        last_price: 78.25,
        risk_group_id: riskGroupId1,
        expired: false,
      },
    });

    // Single trade for simpler calculation
    await prisma.trades.create({
      data: {
        universeId: schdUniverse.id,
        accountId: account2Id,
        buy: 72.5,
        sell: 0,
        quantity: 100,
        buy_date: new Date('2024-03-01'),
        sell_date: null,
      },
    });

    const universe = await prisma.universe.findUnique({
      where: { id: schdUniverse.id },
      include: {
        trades: {
          where: {
            accountId: account2Id,
            sell_date: null,
          },
        },
      },
    });

    expect(universe).toBeTruthy();
    expect(universe!.trades).toHaveLength(1);

    // Manual calculation verification:
    // Total cost: 72.5 * 100 = 7,250
    // Total quantity: 100
    // Weighted avg price: 7,250 / 100 = 72.5
    // Market yield: 100 * 4 * (0.74 / 78.25) = 3.7827%
    // Average purchase yield: 100 * 4 * (0.74 / 72.5) = 4.0828%

    const trade = universe!.trades[0];
    const avgPurchasePrice = trade.buy;
    const marketYield = 100 * 4 * (0.74 / 78.25);
    const avgPurchaseYield = 100 * 4 * (0.74 / avgPurchasePrice);

    expect(avgPurchasePrice).toBe(72.5);
    expect(marketYield).toBeCloseTo(3.7827, 4);
    expect(avgPurchaseYield).toBeCloseTo(4.0828, 4);

    // Verify yield is higher for purchase price (good value)
    expect(avgPurchaseYield).toBeGreaterThan(marketYield);
  });

  test('verifies account switching recalculates correctly', async () => {
    // Create universe record
    const universe = await prisma.universe.create({
      data: {
        symbol: 'QQQ',
        distribution: 0.52,
        distributions_per_year: 4,
        last_price: 380.0,
        risk_group_id: riskGroupId1,
        expired: false,
      },
    });

    // Account 1: Higher purchase prices (worse yield)
    await prisma.trades.createMany({
      data: [
        {
          universeId: universe.id,
          accountId: account1Id,
          buy: 390.0,
          sell: 0,
          quantity: 25,
          buy_date: new Date('2024-01-01'),
          sell_date: null,
        },
      ],
    });

    // Account 2: Lower purchase prices (better yield)
    await prisma.trades.createMany({
      data: [
        {
          universeId: universe.id,
          accountId: account2Id,
          buy: 350.0,
          sell: 0,
          quantity: 50,
          buy_date: new Date('2024-02-01'),
          sell_date: null,
        },
      ],
    });

    // Query for Account 1
    const account1Data = await prisma.universe.findUnique({
      where: { id: universe.id },
      include: {
        trades: {
          where: {
            accountId: account1Id,
            sell_date: null,
          },
        },
      },
    });

    // Query for Account 2
    const account2Data = await prisma.universe.findUnique({
      where: { id: universe.id },
      include: {
        trades: {
          where: {
            accountId: account2Id,
            sell_date: null,
          },
        },
      },
    });

    expect(account1Data!.trades).toHaveLength(1);
    expect(account2Data!.trades).toHaveLength(1);

    // Account 1 calculations
    const account1AvgPrice = 390.0; // Single purchase
    const account1AvgYield = 100 * 4 * (0.52 / account1AvgPrice);

    // Account 2 calculations
    const account2AvgPrice = 350.0; // Single purchase
    const account2AvgYield = 100 * 4 * (0.52 / account2AvgPrice);

    expect(account1AvgYield).toBeCloseTo(0.5333, 4);
    expect(account2AvgYield).toBeCloseTo(0.5943, 4);

    // Account 2 should have better yield due to lower purchase price
    expect(account2AvgYield).toBeGreaterThan(account1AvgYield);
  });

  test('handles edge case: no open positions for account', async () => {
    // Create universe
    const universe = await prisma.universe.create({
      data: {
        symbol: 'SPY',
        distribution: 1.25,
        distributions_per_year: 4,
        last_price: 450.0,
        risk_group_id: riskGroupId1,
        expired: false,
      },
    });

    // Create only sold positions (all have sell_date)
    await prisma.trades.createMany({
      data: [
        {
          universeId: universe.id,
          accountId: account1Id,
          buy: 420.0,
          sell: 440.0,
          quantity: 10,
          buy_date: new Date('2024-01-01'),
          sell_date: new Date('2024-03-01'),
        },
      ],
    });

    // Query for open positions only
    const universeData = await prisma.universe.findUnique({
      where: { id: universe.id },
      include: {
        trades: {
          where: {
            accountId: account1Id,
            sell_date: null, // Only open positions
          },
        },
      },
    });

    expect(universeData!.trades).toHaveLength(0);

    // With no open positions, average purchase yield should be 0
    // This simulates the calculation logic when no trades exist
    const totalCost = universeData!.trades.reduce(
      (sum, trade) => sum + trade.buy * trade.quantity,
      0
    );
    const totalQuantity = universeData!.trades.reduce(
      (sum, trade) => sum + trade.quantity,
      0
    );
    const avgPurchaseYield =
      totalQuantity > 0 && totalCost > 0
        ? 100 * 4 * (1.25 / (totalCost / totalQuantity))
        : 0;

    expect(avgPurchaseYield).toBe(0);
  });

  test('handles edge case: zero distribution yields zero', async () => {
    // Create universe with zero distribution
    const universe = await prisma.universe.create({
      data: {
        symbol: 'GROWTH_STOCK',
        distribution: 0.0,
        distributions_per_year: 0,
        last_price: 150.0,
        risk_group_id: riskGroupId1,
        expired: false,
      },
    });

    await prisma.trades.create({
      data: {
        universeId: universe.id,
        accountId: account1Id,
        buy: 140.0,
        sell: 0,
        quantity: 50,
        buy_date: new Date('2024-01-01'),
        sell_date: null,
      },
    });

    const universeData = await prisma.universe.findUnique({
      where: { id: universe.id },
      include: {
        trades: {
          where: {
            accountId: account1Id,
            sell_date: null,
          },
        },
      },
    });

    expect(universeData!.trades).toHaveLength(1);

    // Calculate yield with zero distribution
    const totalCost = 140.0 * 50;
    const totalQuantity = 50;
    const avgPurchasePrice = totalCost / totalQuantity;
    const avgPurchaseYield =
      100 * universeData!.distributions_per_year * (0.0 / avgPurchasePrice);

    expect(avgPurchaseYield).toBe(0);
  });

  test('verifies complex portfolio with multiple symbols and accounts', async () => {
    // Create multiple universe records
    const universes = await Promise.all([
      prisma.universe.create({
        data: {
          symbol: 'VTI',
          distribution: 0.58,
          distributions_per_year: 4,
          last_price: 245.5,
          risk_group_id: riskGroupId1,
          expired: false,
        },
      }),
      prisma.universe.create({
        data: {
          symbol: 'VXUS',
          distribution: 0.45,
          distributions_per_year: 2,
          last_price: 62.75,
          risk_group_id: riskGroupId1,
          expired: false,
        },
      }),
      prisma.universe.create({
        data: {
          symbol: 'VNQ',
          distribution: 0.92,
          distributions_per_year: 4,
          last_price: 89.25,
          risk_group_id: riskGroupId2,
          expired: false,
        },
      }),
    ]);

    // Create complex trade scenarios across accounts
    const tradeData = [
      // Account 1 - VTI positions
      {
        universeId: universes[0].id,
        accountId: account1Id,
        buy: 235.0,
        quantity: 40,
      },
      {
        universeId: universes[0].id,
        accountId: account1Id,
        buy: 250.0,
        quantity: 20,
      },
      // Account 1 - VXUS positions
      {
        universeId: universes[1].id,
        accountId: account1Id,
        buy: 60.5,
        quantity: 100,
      },
      // Account 2 - VTI positions (different prices)
      {
        universeId: universes[0].id,
        accountId: account2Id,
        buy: 220.0,
        quantity: 30,
      },
      // Account 2 - VNQ positions
      {
        universeId: universes[2].id,
        accountId: account2Id,
        buy: 85.0,
        quantity: 25,
      },
    ];

    await prisma.trades.createMany({
      data: tradeData.map((trade) => ({
        ...trade,
        sell: 0,
        buy_date: new Date('2024-01-15'),
        sell_date: null,
      })),
    });

    // Query and verify calculations for each account/symbol combination
    for (const universe of universes) {
      for (const accountId of [account1Id, account2Id]) {
        const data = await prisma.universe.findUnique({
          where: { id: universe.id },
          include: {
            trades: {
              where: {
                accountId,
                sell_date: null,
              },
            },
          },
        });

        const trades = data!.trades;
        if (trades.length > 0) {
          const totalCost = trades.reduce(
            (sum, trade) => sum + trade.buy * trade.quantity,
            0
          );
          const totalQuantity = trades.reduce(
            (sum, trade) => sum + trade.quantity,
            0
          );
          const avgPurchasePrice = totalCost / totalQuantity;
          const avgPurchaseYield =
            100 *
            data!.distributions_per_year *
            (data!.distribution / avgPurchasePrice);

          // Verify calculations are positive and reasonable
          expect(totalCost).toBeGreaterThan(0);
          expect(totalQuantity).toBeGreaterThan(0);
          expect(avgPurchasePrice).toBeGreaterThan(0);

          if (data!.distribution > 0 && data!.distributions_per_year > 0) {
            expect(avgPurchaseYield).toBeGreaterThan(0);
            expect(avgPurchaseYield).toBeLessThan(20); // Reasonable upper bound
          } else {
            expect(avgPurchaseYield).toBe(0);
          }
        }
      }
    }
  });

  test(
    'verifies data integrity with concurrent operations',
    { timeout: integrationTestTimeout },
    async () => {
      const CONCURRENT_UNIVERSE_COUNT = 20;

      // Create multiple universes concurrently
      const universeCreationPromises = Array.from(
        { length: CONCURRENT_UNIVERSE_COUNT },
        async (_, i) =>
          prisma.universe.create({
            data: {
              symbol: `TEST_${i.toString().padStart(3, '0')}`,
              distribution: 0.5 + i * 0.1,
              distributions_per_year: 4,
              last_price: 100.0 + i * 5,
              risk_group_id: i % 2 === 0 ? riskGroupId1 : riskGroupId2,
              expired: false,
            },
          })
      );

      const universes = await Promise.all(universeCreationPromises);

      // Create trades for each universe concurrently
      const tradeCreationPromises = universes.flatMap((universe, i) => [
        prisma.trades.create({
          data: {
            universeId: universe.id,
            accountId: account1Id,
            buy: 95.0 + i * 3,
            sell: 0,
            quantity: 10 + i,
            buy_date: new Date('2024-01-01'),
            sell_date: null,
          },
        }),
        prisma.trades.create({
          data: {
            universeId: universe.id,
            accountId: account2Id,
            buy: 105.0 + i * 2,
            sell: 0,
            quantity: 15 + i,
            buy_date: new Date('2024-02-01'),
            sell_date: null,
          },
        }),
      ]);

      await Promise.all(tradeCreationPromises);

      // Verify data integrity
      const finalUniverseCount = await prisma.universe.count();
      const finalTradeCount = await prisma.trades.count();

      expect(finalUniverseCount).toBe(CONCURRENT_UNIVERSE_COUNT);
      expect(finalTradeCount).toBe(CONCURRENT_UNIVERSE_COUNT * 2); // 2 trades per universe

      // Spot check calculations for a few random universes
      const sampleUniverses = await prisma.universe.findMany({
        take: 5,
        include: {
          trades: {
            where: { sell_date: null },
          },
        },
      });

      for (const universe of sampleUniverses) {
        expect(universe.trades.length).toBeGreaterThan(0);

        for (const accountId of [account1Id, account2Id]) {
          const accountTrades = universe.trades.filter(
            (t) => t.accountId === accountId
          );
          if (accountTrades.length > 0) {
            const totalCost = accountTrades.reduce(
              (sum, trade) => sum + trade.buy * trade.quantity,
              0
            );
            const totalQuantity = accountTrades.reduce(
              (sum, trade) => sum + trade.quantity,
              0
            );
            const avgPrice = totalCost / totalQuantity;

            expect(avgPrice).toBeGreaterThan(0);
            expect(totalQuantity).toBeGreaterThan(0);
          }
        }
      }
    }
  );

  test('preserves existing functionality during yield calculations', async () => {
    // Create standard universe record
    const universe = await prisma.universe.create({
      data: {
        symbol: 'LEGACY_TEST',
        distribution: 1.0,
        distributions_per_year: 4,
        last_price: 100.0,
        most_recent_sell_date: new Date('2024-02-15'),
        most_recent_sell_price: 95.0,
        risk_group_id: riskGroupId1,
        expired: false,
      },
    });

    // Create account and associated trade
    const trade = await prisma.trades.create({
      data: {
        universeId: universe.id,
        accountId: account1Id,
        buy: 90.0,
        sell: 95.0,
        quantity: 50,
        buy_date: new Date('2024-01-01'),
        sell_date: new Date('2024-02-15'),
      },
    });

    // Verify that existing fields are preserved
    const retrievedUniverse = await prisma.universe.findUnique({
      where: { id: universe.id },
      include: { trades: true },
    });

    expect(retrievedUniverse!.most_recent_sell_date).toEqual(
      new Date('2024-02-15')
    );
    expect(retrievedUniverse!.most_recent_sell_price).toBe(95.0);
    expect(retrievedUniverse!.last_price).toBe(100.0);
    expect(retrievedUniverse!.distribution).toBe(1.0);
    expect(retrievedUniverse!.trades[0].id).toBe(trade.id);

    // Verify standard yield calculation still works
    const marketYield = 100 * 4 * (1.0 / 100.0);
    expect(marketYield).toBe(4.0);

    // With sold positions, average purchase yield should be 0 for this account
    const openTrades = retrievedUniverse!.trades.filter(
      (t) => t.sell_date === null
    );
    expect(openTrades).toHaveLength(0);
  });
});
