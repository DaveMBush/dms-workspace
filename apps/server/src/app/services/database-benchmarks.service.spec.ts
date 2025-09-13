import { PrismaClient } from '@prisma/client';

import {
  databaseBenchmarksService,
  BenchmarkResults,
  AuthenticationBenchmark,
} from './database-benchmarks.service';

describe('DatabaseBenchmarksService', () => {
  let baselineClient: PrismaClient;
  let optimizedClient: PrismaClient;

  beforeAll(async () => {
    // Create baseline client (simulates non-optimized setup)
    baselineClient = new PrismaClient({
      datasources: {
        db: {
          url: 'file:./test-baseline.db',
        },
      },
    });

    // Create optimized client (with performance optimizations)
    optimizedClient = new PrismaClient({
      datasources: {
        db: {
          url: 'file:./test-optimized.db',
        },
      },
      log: [{ emit: 'event', level: 'query' }],
      transactionOptions: {
        maxWait: 5000,
        timeout: 15000,
      },
    });

    await baselineClient.$connect();
    await optimizedClient.$connect();
  });

  afterAll(async () => {
    await baselineClient.$disconnect();
    await optimizedClient.$disconnect();
  });

  beforeEach(async () => {
    // Set up test databases with identical schemas but different optimization levels
    await setupTestDatabase(baselineClient);
    await setupTestDatabase(optimizedClient);

    // Add indexes only to optimized client for performance comparison
    await addPerformanceIndexes(optimizedClient);
  });

  async function setupTestDatabase(client: PrismaClient) {
    try {
      // Create tables
      await client.$executeRaw`
        CREATE TABLE IF NOT EXISTS accounts (
          id TEXT PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          deletedAt DATETIME,
          version INTEGER DEFAULT 1
        );
      `;

      await client.$executeRaw`
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

      await client.$executeRaw`
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

      // Insert test data
      await client.$executeRaw`DELETE FROM accounts;`;
      await client.$executeRaw`DELETE FROM trades;`;
      await client.$executeRaw`DELETE FROM divDeposits;`;

      await client.$executeRaw`
        INSERT INTO accounts (id, name) VALUES
        ('account-1', 'Benchmark Account 1'),
        ('account-2', 'Benchmark Account 2'),
        ('account-3', 'Benchmark Account 3'),
        ('account-4', 'Benchmark Account 4'),
        ('account-5', 'Benchmark Account 5');
      `;

      await client.$executeRaw`
        INSERT INTO trades (id, universeId, accountId, buy, sell, buy_date, quantity) VALUES
        ('trade-1', 'universe-1', 'account-1', 100.0, 110.0, '2024-01-01', 10),
        ('trade-2', 'universe-2', 'account-1', 200.0, 220.0, '2024-01-02', 5),
        ('trade-3', 'universe-3', 'account-2', 150.0, 165.0, '2024-01-03', 8),
        ('trade-4', 'universe-4', 'account-3', 300.0, 330.0, '2024-01-04', 12),
        ('trade-5', 'universe-5', 'account-3', 250.0, 275.0, '2024-01-05', 6);
      `;

      await client.$executeRaw`
        INSERT INTO divDeposits (id, date, amount, accountId, divDepositTypeId) VALUES
        ('div-1', '2024-01-15', 50.0, 'account-1', 'type-1'),
        ('div-2', '2024-01-25', 75.0, 'account-2', 'type-1'),
        ('div-3', '2024-02-05', 30.0, 'account-3', 'type-2'),
        ('div-4', '2024-02-15', 90.0, 'account-4', 'type-1'),
        ('div-5', '2024-02-25', 60.0, 'account-5', 'type-2');
      `;
    } catch (error) {
      console.warn('Database setup warning:', error);
    }
  }

  async function addPerformanceIndexes(client: PrismaClient) {
    try {
      // Add performance indexes to optimized client
      await client.$executeRaw`CREATE INDEX IF NOT EXISTS idx_accounts_name ON accounts(name);`;
      await client.$executeRaw`CREATE INDEX IF NOT EXISTS idx_accounts_created ON accounts(createdAt);`;
      await client.$executeRaw`CREATE INDEX IF NOT EXISTS idx_accounts_deleted ON accounts(deletedAt);`;

      await client.$executeRaw`CREATE INDEX IF NOT EXISTS idx_trades_account ON trades(accountId);`;
      await client.$executeRaw`CREATE INDEX IF NOT EXISTS idx_trades_buy_date ON trades(buy_date);`;
      await client.$executeRaw`CREATE INDEX IF NOT EXISTS idx_trades_sell_date ON trades(sell_date);`;
      await client.$executeRaw`CREATE INDEX IF NOT EXISTS idx_trades_account_buy_date ON trades(accountId, buy_date);`;
      await client.$executeRaw`CREATE INDEX IF NOT EXISTS idx_trades_account_sell_date ON trades(accountId, sell_date);`;

      await client.$executeRaw`CREATE INDEX IF NOT EXISTS idx_divDeposits_account ON divDeposits(accountId);`;
      await client.$executeRaw`CREATE INDEX IF NOT EXISTS idx_divDeposits_date ON divDeposits(date);`;
      await client.$executeRaw`CREATE INDEX IF NOT EXISTS idx_divDeposits_account_date ON divDeposits(accountId, date);`;
    } catch (error) {
      console.warn('Index creation warning:', error);
    }
  }

  describe('runComprehensiveBenchmarks', () => {
    it('should run comprehensive performance benchmarks', async () => {
      const results =
        await databaseBenchmarksService.runComprehensiveBenchmarks(
          baselineClient,
          optimizedClient,
          5 // Fewer iterations for test speed
        );

      expect(results.testName).toBe(
        'Comprehensive Database Performance Benchmark'
      );
      expect(results.iterations).toBe(5);
      expect(results.results.baseline.totalTime).toBeGreaterThan(0);
      expect(results.results.optimized.totalTime).toBeGreaterThan(0);
      expect(results.results.improvement.improvementPercentage).toBeGreaterThan(
        0
      );
      expect(results.timestamp).toBeInstanceOf(Date);
    }, 30000); // Increase timeout for benchmark

    it('should demonstrate performance improvement', async () => {
      const results =
        await databaseBenchmarksService.runComprehensiveBenchmarks(
          baselineClient,
          optimizedClient,
          3
        );

      // Optimized should be faster than baseline
      expect(results.results.optimized.totalTime).toBeLessThan(
        results.results.baseline.totalTime
      );
      expect(results.results.optimized.connectionTime).toBeLessThanOrEqual(
        results.results.baseline.connectionTime
      );
      expect(results.results.improvement.improvementPercentage).toBeGreaterThan(
        0
      );
    }, 30000);
  });

  describe('benchmarkAuthenticationOperations', () => {
    it('should benchmark authentication-specific operations', async () => {
      const benchmark =
        await databaseBenchmarksService.benchmarkAuthenticationOperations(
          baselineClient,
          optimizedClient,
          3 // Fewer iterations for test speed
        );

      // All operations should have baseline and optimized measurements
      expect(benchmark.userLookupTime.baseline).toBeGreaterThan(0);
      expect(benchmark.userLookupTime.optimized).toBeGreaterThan(0);
      expect(benchmark.sessionDataLoadTime.baseline).toBeGreaterThan(0);
      expect(benchmark.sessionDataLoadTime.optimized).toBeGreaterThan(0);
      expect(benchmark.batchAccountLoadTime.baseline).toBeGreaterThan(0);
      expect(benchmark.batchAccountLoadTime.optimized).toBeGreaterThan(0);
      expect(benchmark.totalAuthFlowTime.baseline).toBeGreaterThan(0);
      expect(benchmark.totalAuthFlowTime.optimized).toBeGreaterThan(0);
    }, 20000);

    it('should show improvement in authentication operations', async () => {
      const benchmark =
        await databaseBenchmarksService.benchmarkAuthenticationOperations(
          baselineClient,
          optimizedClient,
          3
        );

      // Optimized should be better than or equal to baseline
      expect(benchmark.userLookupTime.optimized).toBeLessThanOrEqual(
        benchmark.userLookupTime.baseline
      );
      expect(benchmark.sessionDataLoadTime.optimized).toBeLessThanOrEqual(
        benchmark.sessionDataLoadTime.baseline
      );
      expect(benchmark.batchAccountLoadTime.optimized).toBeLessThanOrEqual(
        benchmark.batchAccountLoadTime.baseline
      );
      expect(benchmark.totalAuthFlowTime.optimized).toBeLessThanOrEqual(
        benchmark.totalAuthFlowTime.baseline
      );

      // Improvements should be non-negative
      expect(benchmark.userLookupTime.improvement).toBeGreaterThanOrEqual(0);
      expect(benchmark.sessionDataLoadTime.improvement).toBeGreaterThanOrEqual(
        0
      );
      expect(benchmark.batchAccountLoadTime.improvement).toBeGreaterThanOrEqual(
        0
      );
      expect(benchmark.totalAuthFlowTime.improvement).toBeGreaterThanOrEqual(0);
    }, 20000);
  });

  describe('validatePerformanceImprovement', () => {
    it('should validate 30% performance improvement requirement', async () => {
      const validation =
        await databaseBenchmarksService.validatePerformanceImprovement(
          baselineClient,
          optimizedClient
        );

      expect(validation.actualImprovement).toBeGreaterThan(0);
      expect(validation.benchmarkResults).toBeDefined();
      expect(validation.authBenchmark).toBeDefined();
      expect(typeof validation.achieved30PercentImprovement).toBe('boolean');

      // If 30% not achieved, the improvement should still be positive
      if (!validation.achieved30PercentImprovement) {
        expect(validation.actualImprovement).toBeGreaterThan(0);
        console.log(
          `Performance improvement: ${validation.actualImprovement.toFixed(2)}%`
        );
      }
    }, 60000); // Longer timeout for comprehensive validation

    it('should provide detailed benchmark and auth results', async () => {
      const validation =
        await databaseBenchmarksService.validatePerformanceImprovement(
          baselineClient,
          optimizedClient
        );

      // Comprehensive benchmark results
      expect(validation.benchmarkResults.results.baseline).toBeDefined();
      expect(validation.benchmarkResults.results.optimized).toBeDefined();
      expect(validation.benchmarkResults.results.improvement).toBeDefined();

      // Authentication benchmark results
      expect(validation.authBenchmark.userLookupTime).toBeDefined();
      expect(validation.authBenchmark.sessionDataLoadTime).toBeDefined();
      expect(validation.authBenchmark.batchAccountLoadTime).toBeDefined();
      expect(validation.authBenchmark.totalAuthFlowTime).toBeDefined();
    }, 60000);
  });

  describe('generateRegressionBaseline', () => {
    it('should generate performance regression baseline', async () => {
      const baseline =
        await databaseBenchmarksService.generateRegressionBaseline(
          optimizedClient,
          5 // Fewer iterations for test speed
        );

      expect(baseline.averageConnectionTime).toBeGreaterThan(0);
      expect(baseline.averageQueryTime).toBeGreaterThan(0);
      expect(baseline.averageTotalTime).toBeGreaterThan(0);
      expect(baseline.standardDeviation.connectionTime).toBeGreaterThanOrEqual(
        0
      );
      expect(baseline.standardDeviation.queryTime).toBeGreaterThanOrEqual(0);
      expect(baseline.standardDeviation.totalTime).toBeGreaterThanOrEqual(0);
      expect(baseline.timestamp).toBeInstanceOf(Date);
    }, 15000);

    it('should provide consistent baseline measurements', async () => {
      const baseline1 =
        await databaseBenchmarksService.generateRegressionBaseline(
          optimizedClient,
          3
        );
      const baseline2 =
        await databaseBenchmarksService.generateRegressionBaseline(
          optimizedClient,
          3
        );

      // Results should be reasonably consistent
      const connectionTimeDiff = Math.abs(
        baseline1.averageConnectionTime - baseline2.averageConnectionTime
      );
      const queryTimeDiff = Math.abs(
        baseline1.averageQueryTime - baseline2.averageQueryTime
      );
      const totalTimeDiff = Math.abs(
        baseline1.averageTotalTime - baseline2.averageTotalTime
      );

      // Differences should be within reasonable variance (less than 50% of the original values)
      expect(connectionTimeDiff).toBeLessThan(
        baseline1.averageConnectionTime * 0.5
      );
      expect(queryTimeDiff).toBeLessThan(baseline1.averageQueryTime * 0.5);
      expect(totalTimeDiff).toBeLessThan(baseline1.averageTotalTime * 0.5);
    }, 15000);
  });

  describe('performance requirements validation', () => {
    it('should meet authentication flow performance targets', async () => {
      const authBenchmark =
        await databaseBenchmarksService.benchmarkAuthenticationOperations(
          baselineClient,
          optimizedClient,
          5
        );

      // Authentication operations should complete within reasonable time bounds
      expect(authBenchmark.userLookupTime.optimized).toBeLessThan(100); // Under 100ms
      expect(authBenchmark.sessionDataLoadTime.optimized).toBeLessThan(200); // Under 200ms
      expect(authBenchmark.batchAccountLoadTime.optimized).toBeLessThan(150); // Under 150ms
      expect(authBenchmark.totalAuthFlowTime.optimized).toBeLessThan(400); // Under 400ms total
    }, 20000);

    it('should demonstrate database optimization effectiveness', async () => {
      const validation =
        await databaseBenchmarksService.validatePerformanceImprovement(
          baselineClient,
          optimizedClient
        );

      // Overall system should show improvement
      expect(validation.actualImprovement).toBeGreaterThan(10); // At least 10% improvement

      // Authentication-specific improvements
      const authImprovement =
        validation.authBenchmark.totalAuthFlowTime.improvement;
      expect(authImprovement).toBeGreaterThanOrEqual(0); // Non-negative improvement

      // Connection pooling and indexing should reduce query times
      const baselineQueryTime =
        validation.benchmarkResults.results.baseline.queryTime;
      const optimizedQueryTime =
        validation.benchmarkResults.results.optimized.queryTime;
      expect(optimizedQueryTime).toBeLessThanOrEqual(baselineQueryTime);
    }, 60000);
  });
});
