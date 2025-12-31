import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

import { databasePerformanceService } from './database-performance.service';

describe.skip('DatabasePerformanceService', () => {
  let testClient: PrismaClient;

  beforeAll(async () => {
    // Create test database client
    const adapter = new PrismaBetterSqlite3({
      url: 'file:./test-performance.db',
    });
    testClient = new PrismaClient({ adapter });

    // Ensure database is connected and migrated
    await testClient.$connect();
    await testClient.$executeRaw`PRAGMA journal_mode=WAL;`;
  });

  afterAll(async () => {
    // Clean up test database
    await testClient.$executeRaw`DROP TABLE IF EXISTS accounts;`;
    await testClient.$executeRaw`DROP TABLE IF EXISTS trades;`;
    await testClient.$executeRaw`DROP TABLE IF EXISTS divDeposits;`;
    await testClient.$disconnect();
  });

  beforeEach(async () => {
    // Clear metrics before each test
    databasePerformanceService.clearMetrics();

    // Create test tables if they don't exist
    try {
      await testClient.$executeRaw`
        CREATE TABLE IF NOT EXISTS accounts (
          id TEXT PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          deletedAt DATETIME,
          version INTEGER DEFAULT 1
        );
      `;

      await testClient.$executeRaw`
        CREATE TABLE IF NOT EXISTS trades (
          id TEXT PRIMARY KEY,
          universeId TEXT NOT NULL,
          accountId TEXT NOT NULL,
          buy REAL NOT NULL,
          sell REAL NOT NULL,
          buy_date DATETIME NOT NULL,
          quantity INTEGER NOT NULL,
          sell_date DATETIME,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          deletedAt DATETIME
        );
      `;

      await testClient.$executeRaw`
        CREATE TABLE IF NOT EXISTS divDeposits (
          id TEXT PRIMARY KEY,
          date DATETIME NOT NULL,
          amount REAL NOT NULL,
          accountId TEXT NOT NULL,
          divDepositTypeId TEXT NOT NULL,
          universeId TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          deletedAt DATETIME,
          version INTEGER DEFAULT 1
        );
      `;

      // Create performance-optimized indexes
      await testClient.$executeRaw`CREATE INDEX IF NOT EXISTS idx_accounts_name ON accounts(name);`;
      await testClient.$executeRaw`CREATE INDEX IF NOT EXISTS idx_accounts_created ON accounts(createdAt);`;
      await testClient.$executeRaw`CREATE INDEX IF NOT EXISTS idx_trades_account ON trades(accountId);`;
      await testClient.$executeRaw`CREATE INDEX IF NOT EXISTS idx_trades_buy_date ON trades(buy_date);`;
      await testClient.$executeRaw`CREATE INDEX IF NOT EXISTS idx_divDeposits_account ON divDeposits(accountId);`;
      await testClient.$executeRaw`CREATE INDEX IF NOT EXISTS idx_divDeposits_date ON divDeposits(date);`;

      // Insert test data
      await testClient.$executeRaw`
        INSERT OR IGNORE INTO accounts (id, name) VALUES
        ('test-account-1', 'Test Account 1'),
        ('test-account-2', 'Test Account 2'),
        ('test-account-3', 'Test Account 3');
      `;

      await testClient.$executeRaw`
        INSERT OR IGNORE INTO trades (id, universeId, accountId, buy, sell, buy_date, quantity) VALUES
        ('test-trade-1', 'universe-1', 'test-account-1', 100.0, 110.0, '2024-01-01', 10),
        ('test-trade-2', 'universe-2', 'test-account-1', 200.0, 220.0, '2024-01-02', 5),
        ('test-trade-3', 'universe-3', 'test-account-2', 150.0, 165.0, '2024-01-03', 8);
      `;

      await testClient.$executeRaw`
        INSERT OR IGNORE INTO divDeposits (id, date, amount, accountId, divDepositTypeId) VALUES
        ('test-div-1', '2024-01-15', 50.0, 'test-account-1', 'type-1'),
        ('test-div-2', '2024-01-25', 75.0, 'test-account-2', 'type-1');
      `;
    } catch (error) {
      console.warn('Test setup warning:', error);
    }
  });

  describe('profileConnectionOverhead', () => {
    it('should measure database connection time', async () => {
      const result = await databasePerformanceService.profileConnectionOverhead(
        testClient
      );

      expect(result.connectionTime).toBeGreaterThan(0);
      expect(result.connectionCount).toBeGreaterThanOrEqual(1);
      expect(typeof result.connectionTime).toBe('number');
      expect(typeof result.connectionCount).toBe('number');
    });

    it('should complete connection profiling within reasonable time', async () => {
      const startTime = Date.now();
      const result = await databasePerformanceService.profileConnectionOverhead(
        testClient
      );
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.connectionTime).toBeLessThan(1000); // Connection should be under 1 second
    });
  });

  describe('measureQueryPerformance', () => {
    it('should measure query execution time and return results', async () => {
      const mockQuery = jest.fn().mockResolvedValue({ test: 'data' });

      const { result, metrics } =
        await databasePerformanceService.measureQueryPerformance(
          mockQuery,
          'test-query',
          ['param1', 'param2']
        );

      expect(result).toEqual({ test: 'data' });
      expect(metrics.query).toBe('test-query');
      expect(metrics.params).toEqual(['param1', 'param2']);
      expect(metrics.duration).toBeGreaterThan(0);
      expect(metrics.startTime).toBeLessThanOrEqual(metrics.endTime);
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('should record slow queries above threshold', async () => {
      // Mock a slow query (simulate 100ms delay)
      const slowQuery = jest
        .fn()
        .mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(() => resolve({ slow: 'data' }), 100)
            )
        );

      await databasePerformanceService.measureQueryPerformance(
        slowQuery,
        'slow-test-query'
      );

      const slowQueries = databasePerformanceService.getRecentSlowQueries();
      expect(slowQueries.length).toBeGreaterThan(0);

      const slowQuery2 = slowQueries.find((q) => q.query === 'slow-test-query');
      expect(slowQuery2).toBeDefined();
      expect(slowQuery2!.duration).toBeGreaterThan(50); // Above slow query threshold
    });

    it('should handle query errors gracefully', async () => {
      const errorQuery = jest.fn().mockRejectedValue(new Error('Test error'));

      await expect(
        databasePerformanceService.measureQueryPerformance(
          errorQuery,
          'error-query'
        )
      ).rejects.toThrow('Test error');

      // Error should still be recorded as a slow query for analysis
      const slowQueries = databasePerformanceService.getRecentSlowQueries();
      const errorRecord = slowQueries.find((q) =>
        q.query.includes('error-query (FAILED)')
      );
      expect(errorRecord).toBeDefined();
    });
  });

  describe('profileAuthenticationQueries', () => {
    it('should profile authentication-related database operations', async () => {
      const result =
        await databasePerformanceService.profileAuthenticationQueries(
          testClient
        );

      expect(result.userLookupTime).toBeGreaterThan(0);
      expect(result.sessionDataTime).toBeGreaterThan(0);
      expect(result.totalAuthDbTime).toBeGreaterThan(0);
      expect(result.totalAuthDbTime).toBeGreaterThanOrEqual(
        result.userLookupTime + result.sessionDataTime
      );
    });

    it('should complete authentication profiling efficiently', async () => {
      const startTime = Date.now();
      const result =
        await databasePerformanceService.profileAuthenticationQueries(
          testClient
        );
      const duration = Date.now() - startTime;

      // Authentication queries should be fast
      expect(duration).toBeLessThan(2000);
      expect(result.userLookupTime).toBeLessThan(100);
      expect(result.sessionDataTime).toBeLessThan(200);
      expect(result.totalAuthDbTime).toBeLessThan(500);
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return comprehensive performance metrics', async () => {
      const metrics = await databasePerformanceService.getPerformanceMetrics(
        testClient
      );

      expect(metrics.connectionTime).toBeGreaterThan(0);
      expect(metrics.queryTime).toBeGreaterThan(0);
      expect(metrics.totalTime).toBeGreaterThan(0);
      expect(metrics.slowQueries).toBeInstanceOf(Array);
      expect(typeof metrics.poolUtilization).toBe('number');
    });

    it('should provide metrics that meet performance requirements', async () => {
      const metrics = await databasePerformanceService.getPerformanceMetrics(
        testClient
      );

      // Performance targets for optimized database operations
      expect(metrics.connectionTime).toBeLessThan(50); // Connection under 50ms
      expect(metrics.queryTime).toBeLessThan(100); // Queries under 100ms
      expect(metrics.totalTime).toBeLessThan(150); // Total under 150ms
    });
  });

  describe('benchmarkPerformanceImprovement', () => {
    it('should demonstrate 30% performance improvement', async () => {
      const benchmark =
        await databasePerformanceService.benchmarkPerformanceImprovement(
          testClient,
          5 // Fewer iterations for test speed
        );

      expect(benchmark.improvementPercentage).toBeGreaterThanOrEqual(30);
      expect(benchmark.baseline.totalTime).toBeGreaterThan(
        benchmark.optimized.totalTime
      );
      expect(benchmark.baseline.connectionTime).toBeGreaterThan(0);
      expect(benchmark.optimized.connectionTime).toBeGreaterThan(0);
    });

    it('should provide consistent benchmark results', async () => {
      const benchmark1 =
        await databasePerformanceService.benchmarkPerformanceImprovement(
          testClient,
          3
        );
      const benchmark2 =
        await databasePerformanceService.benchmarkPerformanceImprovement(
          testClient,
          3
        );

      // Results should be reasonably consistent (within 20% variance)
      const variance = Math.abs(
        benchmark1.improvementPercentage - benchmark2.improvementPercentage
      );
      expect(variance).toBeLessThan(20);
    });
  });

  describe('getQueryStatistics', () => {
    beforeEach(async () => {
      // Generate some query data
      await databasePerformanceService.measureQueryPerformance(
        () => testClient.accounts.findMany({ take: 1 }),
        'test-query-1'
      );
      await databasePerformanceService.measureQueryPerformance(
        () => testClient.accounts.findMany({ take: 1 }),
        'test-query-1'
      );
      await databasePerformanceService.measureQueryPerformance(
        () => testClient.accounts.findMany({ take: 2 }),
        'test-query-2'
      );
    });

    it('should return query statistics', async () => {
      const stats = databasePerformanceService.getQueryStatistics();

      expect(stats.length).toBeGreaterThan(0);

      const query1Stats = stats.find((s) => s.queryName === 'test-query-1');
      expect(query1Stats).toBeDefined();
      expect(query1Stats!.count).toBe(2);
      expect(query1Stats!.averageDuration).toBeGreaterThan(0);
      expect(query1Stats!.minDuration).toBeGreaterThan(0);
      expect(query1Stats!.maxDuration).toBeGreaterThanOrEqual(
        query1Stats!.minDuration
      );
    });

    it('should filter statistics by query name', async () => {
      const stats =
        databasePerformanceService.getQueryStatistics('test-query-1');

      expect(stats.length).toBe(1);
      expect(stats[0].queryName).toBe('test-query-1');
      expect(stats[0].count).toBe(2);
    });
  });

  describe('clearMetrics', () => {
    it('should clear all performance metrics', async () => {
      // Generate some metrics
      await databasePerformanceService.measureQueryPerformance(
        () => Promise.resolve('test'),
        'test-clear'
      );

      let slowQueries = databasePerformanceService.getRecentSlowQueries();
      let stats = databasePerformanceService.getQueryStatistics();

      // Clear metrics
      databasePerformanceService.clearMetrics();

      slowQueries = databasePerformanceService.getRecentSlowQueries();
      stats = databasePerformanceService.getQueryStatistics();

      expect(slowQueries).toHaveLength(0);
      expect(stats).toHaveLength(0);
    });
  });
});
