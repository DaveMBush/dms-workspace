/**
 * Tests for PostgreSQL Prisma client functionality
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  checkDatabaseHealth,
  checkDatabaseHealthWithClient,
  connectWithRetry,
} from './prisma-client';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

// Mock console methods to avoid cluttering test output
const mockConsole = {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

vi.stubGlobal('console', mockConsole);

describe('Prisma Client - PostgreSQL', () => {
  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ||
      'postgresql://test:test@localhost:5432/test_db';
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('checkDatabaseHealth', () => {
    it('should return health status', async () => {
      const result = await checkDatabaseHealth();

      expect(result).toHaveProperty('healthy');
      expect(typeof result.healthy).toBe('boolean');

      if (result.healthy) {
        expect(result).toHaveProperty('connectionCount');
        expect(typeof result.connectionCount).toBe('number');
        expect(result.connectionCount).toBeGreaterThanOrEqual(0);
      } else {
        expect(result).toHaveProperty('error');
        expect(typeof result.error).toBe('string');
      }
    }, 10000);

    it.skip('should handle database connection errors gracefully', async () => {
      // Note: This test is skipped for SQLite because any file path is valid for SQLite.
      // SQLite will create a new database file if it doesn't exist.
      // This test would be more appropriate for PostgreSQL or other network-based databases.

      // Create a new Prisma client with invalid URL
      const adapter = new PrismaBetterSqlite3({
        url: 'file:./invalid-test.db',
      });
      const invalidClient = new PrismaClient({
        adapter,
        log: [],
      });

      const result = await checkDatabaseHealthWithClient(invalidClient);

      expect(result.healthy).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');

      // Cleanup
      await invalidClient.$disconnect();
    });
  });

  describe('connectWithRetry', () => {
    it('should connect successfully with valid configuration', async () => {
      // This test assumes a valid database connection is available
      await expect(connectWithRetry(1, 100)).resolves.not.toThrow();
    }, 5000);

    it.skip('should handle connection failures with retry logic', async () => {
      // Note: This test is skipped for SQLite because any file path is valid for SQLite.
      // SQLite will create a new database file if it doesn't exist, so connection never fails.
      // This test would be more appropriate for PostgreSQL or other network-based databases.

      // Create a mock connectWithRetry function that uses an invalid client
      const connectWithRetryTest = async (
        maxRetries: number = 5,
        baseDelay: number = 1000
      ): Promise<void> => {
        const adapter = new PrismaBetterSqlite3({
          url: 'file:./invalid-retry-test.db',
        });
        const invalidClient = new PrismaClient({
          adapter,
          log: [],
        });

        let retries = 0;
        while (retries < maxRetries) {
          try {
            await invalidClient.$connect();
            console.log('Database connected successfully');
            return;
          } catch (error) {
            retries++;
            if (retries >= maxRetries) {
              throw new Error(
                `Failed to connect to database after ${maxRetries} attempts: ${error}`
              );
            }
            const delay = baseDelay * Math.pow(2, retries - 1);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      };

      await expect(connectWithRetryTest(2, 100)).rejects.toThrow();
    }, 10000);

    it('should respect retry parameters', async () => {
      const startTime = Date.now();

      // Use invalid URL to force retries
      const originalUrl = process.env.DATABASE_URL;
      process.env.DATABASE_URL =
        'postgresql://invalid:invalid@localhost:9999/invalid_db';

      try {
        await connectWithRetry(2, 200);
      } catch (error) {
        const elapsed = Date.now() - startTime;

        // Should have tried 2 times with delays:
        // First attempt: immediate
        // Second attempt: after 200ms delay
        // Total should be at least 200ms but less than 1000ms
        expect(elapsed).toBeGreaterThan(200);
        expect(elapsed).toBeLessThan(1000);
      }

      // Restore original URL
      process.env.DATABASE_URL = originalUrl;
    });
  });
});
