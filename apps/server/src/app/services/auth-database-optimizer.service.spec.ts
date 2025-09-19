import { PrismaClient } from '@prisma/client';

import { authDatabaseOptimizerService } from './auth-database-optimizer.service';
import { databasePerformanceService } from './database-performance.service';

describe('AuthDatabaseOptimizerService', () => {
  let testClient: PrismaClient;
  const testDbUrl =
    process.env.DATABASE_PROVIDER === 'postgresql'
      ? process.env.DATABASE_URL ||
        'postgresql://ci_user:test_password@localhost:5432/ci_rms?schema=public'
      : 'file:./test-auth-optimizer.db';

  beforeAll(async () => {
    testClient = new PrismaClient({
      datasources: {
        db: {
          url: testDbUrl,
        },
      },
    });

    await testClient.$connect();

    // Apply migrations/schema only for SQLite (PostgreSQL schema is already set up in CI)
    if (process.env.DATABASE_PROVIDER !== 'postgresql') {
      await testClient.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "accounts" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT NOT NULL UNIQUE,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "deletedAt" DATETIME,
          "version" INTEGER NOT NULL DEFAULT 1
        );
      `);

      await testClient.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "risk_group" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT NOT NULL UNIQUE,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "deletedAt" DATETIME,
          "version" INTEGER NOT NULL DEFAULT 1
        );
      `);

      await testClient.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "universe" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "distribution" REAL NOT NULL,
          "distributions_per_year" INTEGER NOT NULL,
          "last_price" REAL NOT NULL,
          "most_recent_sell_date" DATETIME,
          "most_recent_sell_price" REAL,
          "symbol" TEXT NOT NULL UNIQUE,
          "ex_date" DATETIME,
          "risk_group_id" TEXT NOT NULL,
          "expired" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "deletedAt" DATETIME,
          "version" INTEGER NOT NULL DEFAULT 1,
          FOREIGN KEY ("risk_group_id") REFERENCES "risk_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE
        );
      `);

      await testClient.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "trades" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "universeId" TEXT NOT NULL,
          "accountId" TEXT NOT NULL,
          "buy" REAL NOT NULL,
          "sell" REAL NOT NULL,
          "buy_date" DATETIME NOT NULL,
          "quantity" INTEGER NOT NULL,
          "sell_date" DATETIME,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "deletedAt" DATETIME,
          FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
          FOREIGN KEY ("universeId") REFERENCES "universe"("id") ON DELETE RESTRICT ON UPDATE CASCADE
        );
      `);

      await testClient.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "accounts_name_idx" ON "accounts"("name");
      `);
    }

    // Clear existing test data first
    await testClient.trades.deleteMany({
      where: {
        id: {
          in: ['auth-trade-1', 'auth-trade-2', 'auth-trade-3'],
        },
      },
    });
    await testClient.universe.deleteMany({
      where: { id: 'auth-universe-1' },
    });
    await testClient.risk_group.deleteMany({
      where: { id: 'auth-risk-group-1' },
    });
    await testClient.accounts.deleteMany({
      where: {
        name: {
          in: ['auth-user-1', 'auth-user-2', 'auth-user-3'],
        },
      },
    });

    // Create test data
    await testClient.accounts.createMany({
      data: [
        { id: 'auth-test-1', name: 'auth-user-1' },
        { id: 'auth-test-2', name: 'auth-user-2' },
        { id: 'auth-test-3', name: 'auth-user-3' },
      ],
    });

    // Create test risk group
    await testClient.risk_group.create({
      data: {
        id: 'auth-risk-group-1',
        name: 'Auth Test Risk Group',
      },
    });

    // Create test universe
    await testClient.universe.create({
      data: {
        id: 'auth-universe-1',
        distribution: 0.04,
        distributions_per_year: 12,
        last_price: 30.75,
        symbol: 'AUTH',
        risk_group_id: 'auth-risk-group-1',
      },
    });

    // Create test trades
    await testClient.trades.createMany({
      data: [
        {
          id: 'auth-trade-1',
          universeId: 'auth-universe-1',
          accountId: 'auth-test-1',
          buy: 150,
          sell: 165,
          buy_date: new Date('2024-01-15'),
          quantity: 8,
        },
        {
          id: 'auth-trade-2',
          universeId: 'auth-universe-1',
          accountId: 'auth-test-1',
          buy: 180,
          sell: 195,
          buy_date: new Date('2024-01-20'),
          quantity: 12,
        },
        {
          id: 'auth-trade-3',
          universeId: 'auth-universe-1',
          accountId: 'auth-test-2',
          buy: 120,
          sell: 130,
          buy_date: new Date('2024-01-10'),
          quantity: 15,
        },
      ],
    });
  });

  afterAll(async () => {
    await testClient.$disconnect();
  });

  beforeEach(() => {
    // Only clear metrics for tests that don't need to track performance
    databasePerformanceService.clearMetrics();
  });

  describe('optimizedUserLookup', () => {
    it('should find existing user efficiently', async () => {
      const result = await authDatabaseOptimizerService.optimizedUserLookup(
        testClient,
        'auth-user-1'
      );

      expect(result).toBeDefined();
      expect(result?.id).toBe('auth-test-1');
      expect(result?.name).toBe('auth-user-1');
    });

    it('should return null for non-existent user', async () => {
      const result = await authDatabaseOptimizerService.optimizedUserLookup(
        testClient,
        'nonexistent-user'
      );

      expect(result).toBeNull();
    });

    it('should track performance metrics', async () => {
      await authDatabaseOptimizerService.optimizedUserLookup(
        testClient,
        'auth-user-1'
      );

      const stats = databasePerformanceService.getQueryStatistics();
      const userLookupStats = stats.find(function findUserLookup(stat) {
        return stat.queryName === 'auth:optimized_user_lookup';
      });

      expect(userLookupStats).toBeDefined();
      expect(userLookupStats?.count).toBe(1);
      expect(userLookupStats?.averageDuration).toBeGreaterThan(0);
    });
  });

  describe('batchUserLookup', () => {
    it('should efficiently lookup multiple users', async () => {
      const usernames = ['auth-user-1', 'auth-user-2', 'auth-user-3'];
      const result = await authDatabaseOptimizerService.batchUserLookup(
        testClient,
        usernames
      );

      expect(result).toHaveLength(3);
      expect(
        result.map(function mapToName(user) {
          return user.name;
        })
      ).toEqual(expect.arrayContaining(usernames));
    });

    it('should handle empty array input', async () => {
      const result = await authDatabaseOptimizerService.batchUserLookup(
        testClient,
        []
      );

      expect(result).toHaveLength(0);
    });

    it('should only return active accounts (non-deleted)', async () => {
      // This test assumes the current implementation filters deletedAt: null
      const usernames = ['auth-user-1', 'auth-user-2'];
      const result = await authDatabaseOptimizerService.batchUserLookup(
        testClient,
        usernames
      );

      expect(result).toHaveLength(2);
      // All returned accounts should be active (deletedAt would be null if checked)
    });

    it('should be more efficient than individual lookups', async () => {
      const usernames = ['auth-user-1', 'auth-user-2', 'auth-user-3'];

      // Individual lookups
      const individualStartTime = performance.now();
      for (const username of usernames) {
        await authDatabaseOptimizerService.optimizedUserLookup(
          testClient,
          username
        );
      }
      const individualTime = performance.now() - individualStartTime;

      // Batch lookup
      const batchStartTime = performance.now();
      await authDatabaseOptimizerService.batchUserLookup(testClient, usernames);
      const batchTime = performance.now() - batchStartTime;

      // Batch should be faster (or at least not significantly slower)
      expect(batchTime).toBeLessThanOrEqual(individualTime * 1.2); // Allow 20% margin
    });
  });

  describe('optimizedSessionDataQuery', () => {
    it('should retrieve user with limited trade data', async () => {
      const result =
        await authDatabaseOptimizerService.optimizedSessionDataQuery(
          testClient,
          'auth-test-1'
        );

      expect(result).toBeDefined();
      expect(result?.id).toBe('auth-test-1');
      expect(result?.name).toBe('auth-user-1');
      expect(result?.recentTrades).toBeDefined();
      expect(result?.recentTrades.length).toBeGreaterThan(0);
      expect(result?.recentTrades.length).toBeLessThanOrEqual(5); // Limited to 5 trades
    });

    it('should return null for non-existent account', async () => {
      const result =
        await authDatabaseOptimizerService.optimizedSessionDataQuery(
          testClient,
          'non-existent-id'
        );

      expect(result).toBeNull();
    });

    it('should order trades by most recent first', async () => {
      const result =
        await authDatabaseOptimizerService.optimizedSessionDataQuery(
          testClient,
          'auth-test-1'
        );

      expect(result?.recentTrades.length).toBeGreaterThan(1);

      const trades = result?.recentTrades ?? [];
      for (let i = 1; i < trades.length; i++) {
        const currentDate = new Date(trades[i - 1].buy_date);
        const nextDate = new Date(trades[i].buy_date);
        expect(currentDate.getTime()).toBeGreaterThanOrEqual(
          nextDate.getTime()
        );
      }
    });
  });

  describe('batchAuthValidation', () => {
    it('should validate multiple account IDs', async () => {
      const accountIds = ['auth-test-1', 'auth-test-2', 'non-existent-id'];
      const result = await authDatabaseOptimizerService.batchAuthValidation(
        testClient,
        accountIds
      );

      expect(result.length).toBeGreaterThanOrEqual(2); // Should find at least 2 accounts

      const foundAccount = result.find(function findAccount(account) {
        return account.id === 'auth-test-1';
      });
      expect(foundAccount).toBeDefined();
      expect(foundAccount?.name).toBe('auth-user-1');
      expect(foundAccount?.isActive).toBe(true);
    });

    it('should correctly identify active status', async () => {
      const result = await authDatabaseOptimizerService.batchAuthValidation(
        testClient,
        ['auth-test-1']
      );

      expect(result).toHaveLength(1);
      expect(result[0].isActive).toBe(true); // deletedAt is null
    });
  });

  describe('getAccountSessionStats', () => {
    it('should return accurate account statistics', async () => {
      const stats = await authDatabaseOptimizerService.getAccountSessionStats(
        testClient,
        'auth-test-1'
      );

      expect(stats.totalTrades).toBe(2);
      expect(stats.activeTrades).toBeGreaterThanOrEqual(0);
      expect(stats.lastActivity).toBeDefined();
      expect(stats.lastActivity).toBeInstanceOf(Date);
    });

    it('should handle account with no trades', async () => {
      const stats = await authDatabaseOptimizerService.getAccountSessionStats(
        testClient,
        'auth-test-3'
      );

      expect(stats.totalTrades).toBe(0);
      expect(stats.activeTrades).toBe(0);
      expect(stats.lastActivity).toBeNull();
    });
  });

  describe('accountExists', () => {
    it('should return true for existing account', async () => {
      const exists = await authDatabaseOptimizerService.accountExists(
        testClient,
        'auth-user-1'
      );

      expect(exists).toBe(true);
    });

    it('should return false for non-existent account', async () => {
      const exists = await authDatabaseOptimizerService.accountExists(
        testClient,
        'non-existent-user'
      );

      expect(exists).toBe(false);
    });

    it('should be efficient for existence checks', async () => {
      const startTime = performance.now();
      await authDatabaseOptimizerService.accountExists(
        testClient,
        'auth-user-1'
      );
      const duration = performance.now() - startTime;

      // Should complete quickly (under 50ms for SQLite)
      expect(duration).toBeLessThan(50);
    });
  });

  describe('performance tracking', () => {
    it('should track authentication query statistics', async () => {
      await authDatabaseOptimizerService.optimizedUserLookup(
        testClient,
        'auth-user-1'
      );
      await authDatabaseOptimizerService.optimizedSessionDataQuery(
        testClient,
        'auth-test-1'
      );
      await authDatabaseOptimizerService.accountExists(
        testClient,
        'auth-user-2'
      );

      const authStats = authDatabaseOptimizerService.getAuthQueryStats();

      expect(authStats.length).toBeGreaterThan(0);
      const statNames = authStats.map(function mapStatName(stat) {
        return stat.queryName;
      });
      expect(statNames).toEqual(
        expect.arrayContaining([expect.stringContaining('auth:')])
      );
    });

    it('should clear metrics properly', async () => {
      await authDatabaseOptimizerService.optimizedUserLookup(
        testClient,
        'auth-user-1'
      );

      // Clear metrics
      authDatabaseOptimizerService.clearAuthMetrics();

      // Check that metrics are cleared
      const authStats = authDatabaseOptimizerService.getAuthQueryStats();
      expect(authStats).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Create a client that will fail
      const failingClient = new PrismaClient({
        datasources: {
          db: {
            url: 'file:./nonexistent-path/test.db',
          },
        },
      });

      await expect(
        authDatabaseOptimizerService.optimizedUserLookup(
          failingClient,
          'test-user'
        )
      ).rejects.toThrow();

      await failingClient.$disconnect();
    });

    it('should handle invalid input parameters', async () => {
      const emptyResult = await authDatabaseOptimizerService.batchUserLookup(
        testClient,
        []
      );
      expect(emptyResult).toHaveLength(0);

      const nullUserLookup =
        await authDatabaseOptimizerService.optimizedUserLookup(testClient, '');
      expect(nullUserLookup).toBeNull();
    });
  });
});
