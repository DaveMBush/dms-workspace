import { PrismaClient } from '@prisma/client';

import {
  optimizedPrisma,
  optimizedUserLookup,
  optimizedSessionDataLoad,
  optimizedBatchAccountLoad,
  optimizedHealthCheck,
  closeOptimizedDatabaseConnection,
} from './optimized-prisma-client';

describe('OptimizedPrismaClient', () => {
  let testClient: PrismaClient;

  beforeAll(async () => {
    // Create test client for comparison
    testClient = new PrismaClient({
      datasources: {
        db: {
          url: 'file:./test-optimized-integration.db',
        },
      },
    });

    await testClient.$connect();
  });

  afterAll(async () => {
    await testClient.$disconnect();
    await closeOptimizedDatabaseConnection();
  });

  beforeEach(async () => {
    // Set up test data
    await setupTestData(testClient);
  });

  async function setupTestData(client: PrismaClient) {
    try {
      // Create test tables
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

      // Add optimized indexes
      await client.$executeRaw`CREATE INDEX IF NOT EXISTS idx_accounts_name ON accounts(name);`;
      await client.$executeRaw`CREATE INDEX IF NOT EXISTS idx_accounts_created ON accounts(createdAt);`;
      await client.$executeRaw`CREATE INDEX IF NOT EXISTS idx_trades_account ON trades(accountId);`;
      await client.$executeRaw`CREATE INDEX IF NOT EXISTS idx_trades_buy_date ON trades(buy_date);`;
      await client.$executeRaw`CREATE INDEX IF NOT EXISTS idx_divDeposits_account ON divDeposits(accountId);`;
      await client.$executeRaw`CREATE INDEX IF NOT EXISTS idx_divDeposits_date ON divDeposits(date);`;

      // Clear and insert test data
      await client.$executeRaw`DELETE FROM divDeposits;`;
      await client.$executeRaw`DELETE FROM trades;`;
      await client.$executeRaw`DELETE FROM accounts;`;

      await client.$executeRaw`
        INSERT INTO accounts (id, name, createdAt) VALUES
        ('opt-account-1', 'Optimized Test Account 1', '2024-01-01'),
        ('opt-account-2', 'Optimized Test Account 2', '2024-01-02'),
        ('opt-account-3', 'Optimized Test Account 3', '2024-01-03');
      `;

      await client.$executeRaw`
        INSERT INTO trades (id, universeId, accountId, buy, sell, buy_date, quantity, sell_date) VALUES
        ('opt-trade-1', 'universe-1', 'opt-account-1', 100.0, 110.0, '2024-01-10', 10, '2024-01-15'),
        ('opt-trade-2', 'universe-2', 'opt-account-1', 200.0, 220.0, '2024-01-11', 5, NULL),
        ('opt-trade-3', 'universe-3', 'opt-account-2', 150.0, 165.0, '2024-01-12', 8, '2024-01-18'),
        ('opt-trade-4', 'universe-4', 'opt-account-3', 300.0, 330.0, '2024-01-13', 12, NULL);
      `;

      await client.$executeRaw`
        INSERT INTO divDeposits (id, date, amount, accountId, divDepositTypeId) VALUES
        ('opt-div-1', '2024-01-20', 50.0, 'opt-account-1', 'type-1'),
        ('opt-div-2', '2024-01-21', 75.0, 'opt-account-2', 'type-1'),
        ('opt-div-3', '2024-01-22', 30.0, 'opt-account-3', 'type-2');
      `;
    } catch (error) {
      console.warn('Test data setup warning:', error);
    }
  }

  describe('optimizedUserLookup', () => {
    it('should perform optimized user lookup efficiently', async () => {
      const startTime = performance.now();
      const { result, metrics } = await optimizedUserLookup();
      const endTime = performance.now();

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('createdAt');

      // Performance expectations
      expect(metrics.duration).toBeLessThan(100); // Under 100ms
      expect(endTime - startTime).toBeLessThan(200); // Total under 200ms
    });

    it('should perform optimized user lookup with specific user ID', async () => {
      const { result, metrics } = await optimizedUserLookup('opt-account-1');

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeLessThanOrEqual(1);

      if (result.length > 0) {
        expect(result[0].id).toBe('opt-account-1');
        expect(result[0].name).toBe('Optimized Test Account 1');
      }

      expect(metrics.query).toBe('optimized:user_lookup');
      expect(metrics.params).toEqual(['opt-account-1']);
      expect(metrics.duration).toBeLessThan(50); // Single user lookup should be very fast
    });

    it('should limit results appropriately', async () => {
      const { result } = await optimizedUserLookup();

      expect(result.length).toBeLessThanOrEqual(10); // Should respect take limit
    });
  });

  describe('optimizedSessionDataLoad', () => {
    it('should load session data efficiently with proper data structure', async () => {
      const startTime = performance.now();
      const { result, metrics } = await optimizedSessionDataLoad(
        'opt-account-1'
      );
      const endTime = performance.now();

      expect(result).toBeDefined();
      if (result) {
        expect(result).toHaveProperty('id', 'opt-account-1');
        expect(result).toHaveProperty('name');
        expect(result).toHaveProperty('trades');
        expect(result).toHaveProperty('divDeposits');

        // Trades should be limited and properly selected
        expect(result.trades).toBeInstanceOf(Array);
        expect(result.trades.length).toBeLessThanOrEqual(5);
        if (result.trades.length > 0) {
          expect(result.trades[0]).toHaveProperty('id');
          expect(result.trades[0]).toHaveProperty('buy');
          expect(result.trades[0]).toHaveProperty('quantity');
          expect(result.trades[0]).toHaveProperty('buy_date');
        }

        // DivDeposits should be limited and properly selected
        expect(result.divDeposits).toBeInstanceOf(Array);
        expect(result.divDeposits.length).toBeLessThanOrEqual(5);
        if (result.divDeposits.length > 0) {
          expect(result.divDeposits[0]).toHaveProperty('id');
          expect(result.divDeposits[0]).toHaveProperty('date');
          expect(result.divDeposits[0]).toHaveProperty('amount');
        }
      }

      // Performance expectations
      expect(metrics.duration).toBeLessThan(150); // Under 150ms
      expect(endTime - startTime).toBeLessThan(300); // Total under 300ms
    });

    it('should handle non-existent account gracefully', async () => {
      const { result, metrics } = await optimizedSessionDataLoad(
        'non-existent-account'
      );

      expect(result).toBeNull();
      expect(metrics.duration).toBeLessThan(50); // Should be very fast for missing records
    });

    it('should order data correctly', async () => {
      const { result } = await optimizedSessionDataLoad('opt-account-1');

      if (result && result.trades.length > 1) {
        // Trades should be ordered by buy_date desc (most recent first)
        const trade1Date = new Date(result.trades[0].buy_date);
        const trade2Date = new Date(result.trades[1].buy_date);
        expect(trade1Date.getTime()).toBeGreaterThanOrEqual(
          trade2Date.getTime()
        );
      }

      if (result && result.divDeposits.length > 1) {
        // DivDeposits should be ordered by date desc (most recent first)
        const div1Date = new Date(result.divDeposits[0].date);
        const div2Date = new Date(result.divDeposits[1].date);
        expect(div1Date.getTime()).toBeGreaterThanOrEqual(div2Date.getTime());
      }
    });
  });

  describe('optimizedBatchAccountLoad', () => {
    it('should load multiple accounts efficiently', async () => {
      const accountIds = ['opt-account-1', 'opt-account-2', 'opt-account-3'];
      const startTime = performance.now();
      const { result, metrics } = await optimizedBatchAccountLoad(accountIds);
      const endTime = performance.now();

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(3);

      result.forEach((account, index) => {
        expect(account).toHaveProperty('id');
        expect(account).toHaveProperty('name');
        expect(account).toHaveProperty('trades');
        expect(account).toHaveProperty('divDeposits');
        expect(accountIds).toContain(account.id);
      });

      // Performance expectations
      expect(metrics.duration).toBeLessThan(200); // Under 200ms for batch load
      expect(endTime - startTime).toBeLessThan(400); // Total under 400ms
    });

    it('should handle empty account list', async () => {
      const { result } = await optimizedBatchAccountLoad([]);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(0);
    });

    it('should handle partial matches', async () => {
      const accountIds = [
        'opt-account-1',
        'non-existent-account',
        'opt-account-2',
      ];
      const { result, metrics } = await optimizedBatchAccountLoad(accountIds);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(2); // Only existing accounts

      const resultIds = result.map((account) => account.id);
      expect(resultIds).toContain('opt-account-1');
      expect(resultIds).toContain('opt-account-2');
      expect(resultIds).not.toContain('non-existent-account');
    });

    it('should order results consistently', async () => {
      const accountIds = ['opt-account-3', 'opt-account-1', 'opt-account-2'];
      const { result } = await optimizedBatchAccountLoad(accountIds);

      // Results should be ordered by name (asc) regardless of input order
      expect(result[0].name).toBe('Optimized Test Account 1');
      expect(result[1].name).toBe('Optimized Test Account 2');
      expect(result[2].name).toBe('Optimized Test Account 3');
    });
  });

  describe('optimizedHealthCheck', () => {
    it('should perform health check with performance metrics', async () => {
      const startTime = performance.now();
      const health = await optimizedHealthCheck();
      const endTime = performance.now();

      expect(health).toHaveProperty('healthy');
      expect(health).toHaveProperty('connectionTime');
      expect(health).toHaveProperty('connectionCount');
      expect(health).toHaveProperty('performanceMetrics');

      expect(health.healthy).toBe(true);
      expect(health.connectionTime).toBeGreaterThan(0);
      expect(health.connectionCount).toBeGreaterThanOrEqual(1);

      // Performance metrics should be present
      expect(health.performanceMetrics).toHaveProperty('connectionTime');
      expect(health.performanceMetrics).toHaveProperty('queryTime');
      expect(health.performanceMetrics).toHaveProperty('totalTime');
      expect(health.performanceMetrics).toHaveProperty('slowQueries');

      // Health check should be fast
      expect(endTime - startTime).toBeLessThan(500); // Under 500ms
    });

    it('should provide accurate connection metrics', async () => {
      const health = await optimizedHealthCheck();

      expect(typeof health.connectionTime).toBe('number');
      expect(typeof health.connectionCount).toBe('number');
      expect(health.connectionTime).toBeLessThan(100); // Connection should be fast
    });
  });

  describe('Performance Integration Tests', () => {
    it('should demonstrate end-to-end authentication flow performance', async () => {
      const startTime = performance.now();

      // Simulate authentication flow: user lookup -> session data -> health check
      const userLookup = await optimizedUserLookup('opt-account-1');
      const sessionData = await optimizedSessionDataLoad('opt-account-1');
      const health = await optimizedHealthCheck();

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // All operations should succeed
      expect(userLookup.result.length).toBeGreaterThan(0);
      expect(sessionData.result).toBeDefined();
      expect(health.healthy).toBe(true);

      // Total authentication flow should be under 500ms
      expect(totalTime).toBeLessThan(500);

      // Individual operation performance
      expect(userLookup.metrics.duration).toBeLessThan(100);
      expect(sessionData.metrics.duration).toBeLessThan(200);
      expect(health.connectionTime).toBeLessThan(100);

      console.log(`Authentication flow completed in ${totalTime.toFixed(2)}ms`);
    });

    it('should handle concurrent operations efficiently', async () => {
      const startTime = performance.now();

      // Simulate concurrent authentication requests
      const concurrentOperations = [
        optimizedUserLookup('opt-account-1'),
        optimizedUserLookup('opt-account-2'),
        optimizedSessionDataLoad('opt-account-1'),
        optimizedSessionDataLoad('opt-account-2'),
        optimizedBatchAccountLoad(['opt-account-1', 'opt-account-2']),
      ];

      const results = await Promise.all(concurrentOperations);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // All operations should complete successfully
      results.forEach((result) => {
        expect(result.result).toBeDefined();
        expect(result.metrics.duration).toBeLessThan(300);
      });

      // Concurrent operations should complete efficiently
      expect(totalTime).toBeLessThan(1000); // Under 1 second

      console.log(
        `Concurrent operations completed in ${totalTime.toFixed(2)}ms`
      );
    });

    it('should maintain performance under repeated load', async () => {
      const iterations = 10;
      const operationTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await optimizedSessionDataLoad('opt-account-1');
        const endTime = performance.now();
        operationTimes.push(endTime - startTime);
      }

      // Calculate performance statistics
      const averageTime =
        operationTimes.reduce((sum, time) => sum + time, 0) / iterations;
      const maxTime = Math.max(...operationTimes);
      const minTime = Math.min(...operationTimes);

      // Performance should be consistent
      expect(averageTime).toBeLessThan(200);
      expect(maxTime).toBeLessThan(300);
      expect(minTime).toBeGreaterThan(0);

      // Performance shouldn't degrade significantly over repeated operations
      const firstHalf = operationTimes.slice(0, 5);
      const secondHalf = operationTimes.slice(5, 10);
      const firstHalfAvg = firstHalf.reduce((sum, time) => sum + time, 0) / 5;
      const secondHalfAvg = secondHalf.reduce((sum, time) => sum + time, 0) / 5;

      // Second half shouldn't be more than 50% slower than first half
      expect(secondHalfAvg).toBeLessThan(firstHalfAvg * 1.5);

      console.log(
        `Repeated load test - Average: ${averageTime.toFixed(
          2
        )}ms, Min: ${minTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms`
      );
    });
  });

  describe('Connection Management', () => {
    it('should handle connection pool efficiently', async () => {
      // Test multiple concurrent operations to stress connection pool
      const operations = Array.from({ length: 5 }, (_, i) =>
        optimizedSessionDataLoad(`opt-account-${(i % 3) + 1}`)
      );

      const startTime = performance.now();
      const results = await Promise.all(operations);
      const endTime = performance.now();

      // All operations should complete
      results.forEach((result) => {
        expect(result.result).toBeDefined();
      });

      // Connection pooling should allow efficient concurrent access
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should maintain connection health during operations', async () => {
      // Perform several operations
      await optimizedUserLookup();
      await optimizedSessionDataLoad('opt-account-1');
      await optimizedBatchAccountLoad(['opt-account-1', 'opt-account-2']);

      // Check connection health after operations
      const health = await optimizedHealthCheck();

      expect(health.healthy).toBe(true);
      expect(health.connectionTime).toBeLessThan(100);
    });
  });
});
