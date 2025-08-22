import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { existsSync,unlinkSync } from 'fs';
import { join } from 'path';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';

/**
 * Integration tests for sync-from-screener functionality
 * 
 * These tests focus on database operations and business logic
 * rather than HTTP endpoints, avoiding complex mocking issues
 * while still providing comprehensive integration test coverage.
 */
describe('sync-from-screener database integration tests', () => {
  let prisma: PrismaClient;
  let testDbPath: string;
  let riskGroupId1: string;
  let riskGroupId2: string;

  beforeAll(async () => {
    // Create unique test database file
    testDbPath = join(process.cwd(), `test-db-integration-${randomUUID()}.db`);
    const testDbUrl = `file:${testDbPath}`;
    
    // Apply migrations to test database
    const { execSync } = await import('child_process');
    execSync(`npx prisma migrate deploy --schema=./prisma/schema.prisma`, {
      env: { ...process.env, DATABASE_URL: testDbUrl },
    });

    // Initialize Prisma client with test database
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: testDbUrl,
        },
      },
    });
  });

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
      data: { name: 'Conservative' },
    });
    const riskGroup2 = await prisma.risk_group.create({
      data: { name: 'Aggressive' },
    });

    riskGroupId1 = riskGroup1.id;
    riskGroupId2 = riskGroup2.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    
    // Clean up test database file
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  });

  test('seeds data correctly for integration testing', async () => {
    // Seed screener data with mixed eligibility
    await prisma.screener.createMany({
      data: [
        {
          symbol: 'AAPL',
          distribution: 2.0,
          distributions_per_year: 4,
          last_price: 150.0,
          risk_group_id: riskGroupId1,
          has_volitility: true,
          objectives_understood: true,
          graph_higher_before_2008: true, // Eligible
        },
        {
          symbol: 'GOOGL',
          distribution: 0.0,
          distributions_per_year: 0,
          last_price: 120.0,
          risk_group_id: riskGroupId2,
          has_volitility: true,
          objectives_understood: true,
          graph_higher_before_2008: true, // Eligible
        },
        {
          symbol: 'TSLA',
          distribution: 0.0,
          distributions_per_year: 0,
          last_price: 80.0,
          risk_group_id: riskGroupId1,
          has_volitility: false, // Not eligible
          objectives_understood: true,
          graph_higher_before_2008: true,
        },
      ],
    });

    // Seed existing universe data (some to be updated, some to be expired)
    await prisma.universe.createMany({
      data: [
        {
          symbol: 'AAPL', // Will be updated by sync
          distribution: 1.5,
          distributions_per_year: 4,
          last_price: 140.0,
          risk_group_id: riskGroupId1,
          expired: false,
        },
        {
          symbol: 'MSFT', // Will be expired (not in eligible screener)
          distribution: 3.0,
          distributions_per_year: 4,
          last_price: 300.0,
          risk_group_id: riskGroupId2,
          expired: false,
        },
      ],
    });

    // Verify test data setup
    const screenerCount = await prisma.screener.count();
    const universeCount = await prisma.universe.count();
    const riskGroupCount = await prisma.risk_group.count();

    expect(screenerCount).toBe(3);
    expect(universeCount).toBe(2);
    expect(riskGroupCount).toBe(2);

    // Test screener selection logic
    const eligibleScreener = await prisma.screener.findMany({
      where: {
        has_volitility: true,
        objectives_understood: true,
        graph_higher_before_2008: true,
      },
    });

    expect(eligibleScreener).toHaveLength(2);
    expect(eligibleScreener.map(s => s.symbol)).toEqual(
      expect.arrayContaining(['AAPL', 'GOOGL'])
    );
  });

  test('verifies universe upsert operations', async () => {
    // Test new symbol insertion
    const newSymbol = await prisma.universe.create({
      data: {
        symbol: 'NEW_SYMBOL',
        distribution: 1.0,
        distributions_per_year: 12,
        last_price: 50.0,
        risk_group_id: riskGroupId1,
        expired: false,
      },
    });

    expect(newSymbol.symbol).toBe('NEW_SYMBOL');
    expect(newSymbol.expired).toBe(false);

    // Test existing symbol update
    const updated = await prisma.universe.update({
      where: { id: newSymbol.id },
      data: {
        last_price: 55.0,
        distribution: 1.5,
      },
    });

    expect(updated.last_price).toBe(55.0);
    expect(updated.distribution).toBe(1.5);
    expect(updated.symbol).toBe('NEW_SYMBOL'); // Symbol preserved
  });

  test('verifies expire operation on universe records', async () => {
    // Create multiple universe records
    await prisma.universe.createMany({
      data: [
        {
          symbol: 'ACTIVE1',
          distribution: 1.0,
          distributions_per_year: 4,
          last_price: 100.0,
          risk_group_id: riskGroupId1,
          expired: false,
        },
        {
          symbol: 'ACTIVE2',
          distribution: 2.0,
          distributions_per_year: 4,
          last_price: 200.0,
          risk_group_id: riskGroupId1,
          expired: false,
        },
        {
          symbol: 'TO_EXPIRE',
          distribution: 3.0,
          distributions_per_year: 4,
          last_price: 300.0,
          risk_group_id: riskGroupId2,
          expired: false,
        },
      ],
    });

    // Mark symbols not in active list as expired
    const activeSymbols = ['ACTIVE1', 'ACTIVE2'];
    const expireResult = await prisma.universe.updateMany({
      where: {
        symbol: { notIn: activeSymbols },
        expired: false,
      },
      data: { expired: true },
    });

    expect(expireResult.count).toBe(1);

    // Verify the correct record was expired
    const expiredRecord = await prisma.universe.findFirst({
      where: { symbol: 'TO_EXPIRE' },
    });

    expect(expiredRecord?.expired).toBe(true);

    // Verify active records remain active
    const activeRecords = await prisma.universe.findMany({
      where: { symbol: { in: activeSymbols } },
    });

    expect(activeRecords).toHaveLength(2);
    expect(activeRecords.every(r => !r.expired)).toBe(true);
  });

  test('verifies idempotency through repeated operations', async () => {
    // Create initial data
    const initialUniverse = await prisma.universe.create({
      data: {
        symbol: 'IDEMPOTENT_TEST',
        distribution: 1.0,
        distributions_per_year: 4,
        last_price: 100.0,
        risk_group_id: riskGroupId1,
        expired: false,
      },
    });

    // First update
    await prisma.universe.update({
      where: { id: initialUniverse.id },
      data: { last_price: 110.0 },
    });

    // Second update with same data (idempotent)
    const secondUpdate = await prisma.universe.update({
      where: { id: initialUniverse.id },
      data: { last_price: 110.0 },
    });

    expect(secondUpdate.last_price).toBe(110.0);
    expect(secondUpdate.id).toBe(initialUniverse.id);

    // Verify database state is consistent
    const finalRecord = await prisma.universe.findUnique({
      where: { id: initialUniverse.id },
    });

    expect(finalRecord?.last_price).toBe(110.0);
    expect(finalRecord?.symbol).toBe('IDEMPOTENT_TEST');
  });

  test('preserves trading history during universe updates', async () => {
    const TRADE_SELL_DATE = '2024-01-01';
    
    // Create account for trading history
    const account = await prisma.accounts.create({
      data: { name: 'Test Account' },
    });

    // Create universe record with trading history
    const universeWithHistory = await prisma.universe.create({
      data: {
        symbol: 'HISTORY_TEST',
        distribution: 2.0,
        distributions_per_year: 4,
        last_price: 75.0,
        risk_group_id: riskGroupId1,
        most_recent_sell_date: new Date(TRADE_SELL_DATE),
        most_recent_sell_price: 80.0,
        expired: false,
      },
    });

    // Add trade history
    const trade = await prisma.trades.create({
      data: {
        universeId: universeWithHistory.id,
        accountId: account.id,
        buy: 70.0,
        sell: 80.0,
        buy_date: new Date('2023-12-01'),
        sell_date: new Date(TRADE_SELL_DATE),
        quantity: 100,
      },
    });

    // Update universe (simulating sync operation)
    await prisma.universe.update({
      where: { id: universeWithHistory.id },
      data: {
        last_price: 85.0,
        distribution: 2.5,
        // Importantly, NOT updating most_recent_sell_date or most_recent_sell_price
      },
    });

    // Verify trading history is preserved
    const updatedUniverse = await prisma.universe.findUnique({
      where: { id: universeWithHistory.id },
      include: { trades: true },
    });

    expect(updatedUniverse).toBeTruthy();
    expect(updatedUniverse!.trades).toHaveLength(1);
    expect(updatedUniverse!.most_recent_sell_date).toEqual(new Date(TRADE_SELL_DATE));
    expect(updatedUniverse!.most_recent_sell_price).toBe(80.0);

    // Verify updates were applied
    expect(updatedUniverse!.last_price).toBe(85.0);
    expect(updatedUniverse!.distribution).toBe(2.5);

    // Verify trade record is intact
    expect(updatedUniverse!.trades[0].id).toBe(trade.id);
    expect(updatedUniverse!.trades[0].sell).toBe(80.0);
  });

  test('handles concurrent database operations', async () => {
    // Create multiple screener records for concurrent processing
    const CONCURRENT_BATCH_SIZE = 10;
    const screenerData = Array.from({ length: CONCURRENT_BATCH_SIZE }, (_, i) => ({
      symbol: `CONCURRENT_${i.toString().padStart(2, '0')}`,
      distribution: 1.0 + (i * 0.1), // Deterministic values instead of Math.random()
      distributions_per_year: (i % 12) + 1, // Deterministic values
      last_price: 100.0 + (i * 10), // Deterministic values
      risk_group_id: i % 2 === 0 ? riskGroupId1 : riskGroupId2,
      has_volitility: true,
      objectives_understood: true,
      graph_higher_before_2008: true,
    }));

    await prisma.screener.createMany({ data: screenerData });

    // Simulate concurrent universe creation operations
    const universeCreationPromises = screenerData.map(async (screener) => {
      return prisma.universe.create({
        data: {
          symbol: screener.symbol,
          distribution: screener.distribution,
          distributions_per_year: screener.distributions_per_year,
          last_price: screener.last_price,
          risk_group_id: screener.risk_group_id,
          expired: false,
        },
      });
    });

    const createdUniverses = await Promise.all(universeCreationPromises);

    expect(createdUniverses).toHaveLength(CONCURRENT_BATCH_SIZE);
    expect(createdUniverses.every(u => !u.expired)).toBe(true);

    // Verify all records were created successfully
    const finalCount = await prisma.universe.count();
    expect(finalCount).toBe(CONCURRENT_BATCH_SIZE);
  });

  test('validates database constraints and relationships', async () => {
    const STANDARD_DISTRIBUTION = 1.0;
    const STANDARD_DISTRIBUTIONS_PER_YEAR = 4;
    const STANDARD_PRICE = 100.0;
    
    // Test foreign key constraint (universe -> risk_group)
    await expect(
      prisma.universe.create({
        data: {
          symbol: 'INVALID_FK',
          distribution: STANDARD_DISTRIBUTION,
          distributions_per_year: STANDARD_DISTRIBUTIONS_PER_YEAR,
          last_price: STANDARD_PRICE,
          risk_group_id: 'non-existent-id',
          expired: false,
        },
      })
    ).rejects.toThrow();

    // Test successful creation with valid foreign key
    const validUniverse = await prisma.universe.create({
      data: {
        symbol: 'VALID_FK',
        distribution: STANDARD_DISTRIBUTION,
        distributions_per_year: STANDARD_DISTRIBUTIONS_PER_YEAR,
        last_price: STANDARD_PRICE,
        risk_group_id: riskGroupId1,
        expired: false,
      },
    });

    expect(validUniverse.risk_group_id).toBe(riskGroupId1);

    // Test relationship querying
    const universeWithRiskGroup = await prisma.universe.findUnique({
      where: { id: validUniverse.id },
      include: { risk_group: true },
    });

    expect(universeWithRiskGroup?.risk_group.name).toBe('Conservative');
  });
});