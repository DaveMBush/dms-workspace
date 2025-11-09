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

import { getRiskGroupData } from './get-risk-group-data.function';

/**
 * Integration tests for getRiskGroupData function
 *
 * Tests account-specific risk group calculations to ensure
 * proper filtering and aggregation across different scenarios.
 */
describe.skipIf(process.env.CI)('getRiskGroupData', () => {
  let prisma: PrismaClient;
  let testDbPath: string;
  let equitiesRiskGroupId: string;
  let incomeRiskGroupId: string;
  let taxFreeRiskGroupId: string;
  let accountAId: string;
  let accountBId: string;
  let accountCId: string;
  let universeEquitiesId: string;
  let universeIncomeId: string;
  let universeTaxFreeId: string;

  beforeAll(async () => {
    // Use dedicated test database for isolation
    testDbPath = join(process.cwd(), 'test-risk-group-data.db');
    const testDbUrl = `file:${testDbPath}`;

    // Delete existing test database to ensure clean state
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }

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
    await prisma.universe.deleteMany();
    await prisma.accounts.deleteMany();
    await prisma.risk_group.deleteMany();

    // Create test risk groups
    const equitiesRiskGroup = await prisma.risk_group.create({
      data: { name: 'Equities' },
    });
    const incomeRiskGroup = await prisma.risk_group.create({
      data: { name: 'Income' },
    });
    const taxFreeRiskGroup = await prisma.risk_group.create({
      data: { name: 'Tax Free Income' },
    });

    equitiesRiskGroupId = equitiesRiskGroup.id;
    incomeRiskGroupId = incomeRiskGroup.id;
    taxFreeRiskGroupId = taxFreeRiskGroup.id;

    // Create test accounts
    const accountA = await prisma.accounts.create({
      data: { name: 'Account A' },
    });
    const accountB = await prisma.accounts.create({
      data: { name: 'Account B' },
    });
    const accountC = await prisma.accounts.create({
      data: { name: 'Account C' },
    });

    accountAId = accountA.id;
    accountBId = accountB.id;
    accountCId = accountC.id;

    // Create test universe items
    const universeEquities = await prisma.universe.create({
      data: {
        symbol: 'EQTY',
        risk_group_id: equitiesRiskGroupId,
        distribution: 0,
        distributions_per_year: 0,
        last_price: 0,
        expired: false,
        is_closed_end_fund: false,
      },
    });

    const universeIncome = await prisma.universe.create({
      data: {
        symbol: 'INCM',
        risk_group_id: incomeRiskGroupId,
        distribution: 0,
        distributions_per_year: 0,
        last_price: 0,
        expired: false,
        is_closed_end_fund: false,
      },
    });

    const universeTaxFree = await prisma.universe.create({
      data: {
        symbol: 'TXFR',
        risk_group_id: taxFreeRiskGroupId,
        distribution: 0,
        distributions_per_year: 0,
        last_price: 0,
        expired: false,
        is_closed_end_fund: false,
      },
    });

    universeEquitiesId = universeEquities.id;
    universeIncomeId = universeIncome.id;
    universeTaxFreeId = universeTaxFree.id;

    // Create test trades for Account A (Equities-only, $10,000 total)
    const accountATrades = Array.from({ length: 10 }).map(() => ({
      accountId: accountAId,
      universeId: universeEquitiesId,
      buy: 100, // $100 per share
      sell: 0,
      quantity: 10, // 10 shares = $1,000 per trade
      buy_date: new Date('2025-01-05'),
      sell_date: null,
    }));
    await prisma.trades.createMany({ data: accountATrades });

    // Create test trades for Account B (Income-only, $5,000 total)
    const accountBTrades = Array.from({ length: 5 }).map(() => ({
      accountId: accountBId,
      universeId: universeIncomeId,
      buy: 100,
      sell: 0,
      quantity: 10, // $1,000 per trade
      buy_date: new Date('2025-01-10'),
      sell_date: null,
    }));
    await prisma.trades.createMany({ data: accountBTrades });

    // Create test trades for Account C (Mixed)
    // 5 Equities trades ($5,000), 3 Income trades ($3,000), 2 Tax Free trades ($2,000)
    const accountCEquitiesTrades = Array.from({ length: 5 }).map(() => ({
      accountId: accountCId,
      universeId: universeEquitiesId,
      buy: 100,
      sell: 0,
      quantity: 10, // $1,000 per trade
      buy_date: new Date('2025-01-15'),
      sell_date: null,
    }));
    const accountCIncomeTrades = Array.from({ length: 3 }).map(() => ({
      accountId: accountCId,
      universeId: universeIncomeId,
      buy: 100,
      sell: 0,
      quantity: 10, // $1,000 per trade
      buy_date: new Date('2025-01-16'),
      sell_date: null,
    }));
    const accountCTaxFreeTrades = Array.from({ length: 2 }).map(() => ({
      accountId: accountCId,
      universeId: universeTaxFreeId,
      buy: 100,
      sell: 0,
      quantity: 10, // $1,000 per trade
      buy_date: new Date('2025-01-17'),
      sell_date: null,
    }));
    await prisma.trades.createMany({
      data: [
        ...accountCEquitiesTrades,
        ...accountCIncomeTrades,
        ...accountCTaxFreeTrades,
      ],
    });
  });

  afterAll(async () => {
    // Ensure Prisma client is disconnected before cleanup
    await prisma.$disconnect();

    // Clean up test database file
    try {
      if (existsSync(testDbPath)) {
        unlinkSync(testDbPath);
      }
    } catch (error) {
      console.warn('Could not clean up test database:', error);
    }
  });

  describe('with accountId parameter', () => {
    test('should return only trades for specified account', async () => {
      const result = await getRiskGroupData(2025, 1, accountAId, prisma);

      // Account A should only have Equities
      expect(result).toHaveLength(1);
      expect(result[0].riskGroupName).toBe('Equities');
      expect(result[0].tradeCount).toBe(10);
    });

    test('should calculate risk group totals correctly for single account', async () => {
      const result = await getRiskGroupData(2025, 1, accountAId, prisma);

      expect(result[0].totalCostBasis).toBe(10000); // 10 trades * $1,000
      expect(result[0].tradeCount).toBe(10);
    });

    test('should not include trades from other accounts', async () => {
      const result = await getRiskGroupData(2025, 1, accountAId, prisma);

      // Should only have Equities, not Income or Tax Free from other accounts
      const incomeRisk = result.find((r) => r.riskGroupName === 'Income');
      const taxFreeRisk = result.find(
        (r) => r.riskGroupName === 'Tax Free Income'
      );

      expect(incomeRisk).toBeUndefined();
      expect(taxFreeRisk).toBeUndefined();
    });
  });

  describe('without accountId parameter', () => {
    test('should return trades from all accounts', async () => {
      const result = await getRiskGroupData(2025, 1, undefined, prisma);

      // Should have all three risk groups represented
      expect(result.length).toBeGreaterThanOrEqual(1);
      const riskGroupNames = result.map((r) => r.riskGroupName);
      expect(riskGroupNames).toContain('Equities');
      expect(riskGroupNames).toContain('Income');
    });

    test('should aggregate risk group totals across all accounts', async () => {
      const result = await getRiskGroupData(2025, 1, undefined, prisma);

      // Find Equities (Account A: 10k + Account C: 5k = 15k)
      const equities = result.find((r) => r.riskGroupName === 'Equities');
      expect(equities?.totalCostBasis).toBe(15000);
      expect(equities?.tradeCount).toBe(15);

      // Find Income (Account B: 5k + Account C: 3k = 8k)
      const income = result.find((r) => r.riskGroupName === 'Income');
      expect(income?.totalCostBasis).toBe(8000);
      expect(income?.tradeCount).toBe(8);

      // Find Tax Free (Account C only: 2k)
      const taxFree = result.find((r) => r.riskGroupName === 'Tax Free Income');
      expect(taxFree?.totalCostBasis).toBe(2000);
      expect(taxFree?.tradeCount).toBe(2);
    });

    test('should calculate global summary correctly', async () => {
      const result = await getRiskGroupData(2025, 1, undefined, prisma);

      const totalCostBasis = result.reduce(
        (sum, r) => sum + r.totalCostBasis,
        0
      );
      const totalTrades = result.reduce((sum, r) => sum + r.tradeCount, 0);

      // Total: 10k + 5k + 5k + 3k + 2k = 25k
      expect(totalCostBasis).toBe(25000);
      // Total: 10 + 5 + 5 + 3 + 2 = 25 trades
      expect(totalTrades).toBe(25);
    });
  });

  describe('with multiple accounts having different risk groups', () => {
    test('should segregate risk groups by account correctly', async () => {
      // Account A - should only show Equities
      const resultA = await getRiskGroupData(2025, 1, accountAId, prisma);
      expect(resultA).toHaveLength(1);
      expect(resultA[0].riskGroupName).toBe('Equities');
      expect(resultA[0].totalCostBasis).toBe(10000);

      // Account B - should only show Income
      const resultB = await getRiskGroupData(2025, 1, accountBId, prisma);
      expect(resultB).toHaveLength(1);
      expect(resultB[0].riskGroupName).toBe('Income');
      expect(resultB[0].totalCostBasis).toBe(5000);

      // Account C - should show all three
      const resultC = await getRiskGroupData(2025, 1, accountCId, prisma);
      expect(resultC).toHaveLength(3);
      const resultCNames = resultC.map((r) => r.riskGroupName).sort();
      expect(resultCNames).toEqual(['Equities', 'Income', 'Tax Free Income']);
    });

    test('should show zero for risk groups not in account', async () => {
      const resultA = await getRiskGroupData(2025, 1, accountAId, prisma);

      // Account A has no Income or Tax Free
      const hasIncome = resultA.some((r) => r.riskGroupName === 'Income');
      const hasTaxFree = resultA.some(
        (r) => r.riskGroupName === 'Tax Free Income'
      );

      expect(hasIncome).toBe(false);
      expect(hasTaxFree).toBe(false);
    });

    test('global results should show both Equities and Income', async () => {
      const result = await getRiskGroupData(2025, 1, undefined, prisma);

      const hasEquities = result.some((r) => r.riskGroupName === 'Equities');
      const hasIncome = result.some((r) => r.riskGroupName === 'Income');

      expect(hasEquities).toBe(true);
      expect(hasIncome).toBe(true);
    });
  });

  describe('edge cases', () => {
    test('should handle account with no trades', async () => {
      // Create a new account with no trades
      const emptyAccount = await prisma.accounts.create({
        data: { name: 'Empty Account' },
      });

      const result = await getRiskGroupData(2025, 1, emptyAccount.id, prisma);

      expect(result).toHaveLength(0);
    });

    test('should handle invalid/non-existent accountId', async () => {
      const result = await getRiskGroupData(2025, 1, 'non-existent-id', prisma);

      expect(result).toHaveLength(0);
    });

    test('should handle trades outside the date range', async () => {
      // Add a trade in December 2024 (outside January 2025 range)
      await prisma.trades.create({
        data: {
          accountId: accountAId,
          universeId: universeEquitiesId,
          buy: 100,
          sell: 0,
          quantity: 10,
          buy_date: new Date('2024-12-15'),
          sell_date: new Date('2024-12-20'), // Sold in December
        },
      });

      const result = await getRiskGroupData(2025, 1, accountAId, prisma);

      // Should only count the 10 original trades from January, not the December one
      expect(result[0].tradeCount).toBe(10);
      expect(result[0].totalCostBasis).toBe(10000);
    });

    test('should include trades sold within the month', async () => {
      // Add a trade bought and sold in January
      await prisma.trades.create({
        data: {
          accountId: accountAId,
          universeId: universeEquitiesId,
          buy: 100,
          sell: 110,
          quantity: 10,
          buy_date: new Date('2025-01-05'),
          sell_date: new Date('2025-01-25'),
        },
      });

      const result = await getRiskGroupData(2025, 1, accountAId, prisma);

      // Should include the new trade (11 total instead of 10)
      expect(result[0].tradeCount).toBe(11);
      expect(result[0].totalCostBasis).toBe(11000);
    });

    test('should handle date boundary conditions - start of month', async () => {
      // Add trade on exact first day of month
      await prisma.trades.create({
        data: {
          accountId: accountAId,
          universeId: universeEquitiesId,
          buy: 100,
          sell: 0,
          quantity: 10,
          buy_date: new Date('2025-01-01T00:00:00Z'),
          sell_date: null,
        },
      });

      const result = await getRiskGroupData(2025, 1, accountAId, prisma);

      // Should include the boundary trade
      expect(result[0].tradeCount).toBe(11);
    });

    test('should handle date boundary conditions - end of month', async () => {
      // Add trade sold on last day of month
      await prisma.trades.create({
        data: {
          accountId: accountAId,
          universeId: universeEquitiesId,
          buy: 100,
          sell: 110,
          quantity: 10,
          buy_date: new Date('2025-01-15'),
          sell_date: new Date('2025-01-31T23:59:59Z'),
        },
      });

      const result = await getRiskGroupData(2025, 1, accountAId, prisma);

      // Should include the boundary trade
      expect(result[0].tradeCount).toBe(11);
    });
  });
});
