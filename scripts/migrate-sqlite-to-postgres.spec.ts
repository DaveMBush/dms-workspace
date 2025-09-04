/**
 * Tests for SQLite to PostgreSQL migration functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  DatabaseMigrator,
  MigrationConfig,
} from './migrate-sqlite-to-postgres';
import fs from 'fs/promises';
import path from 'path';

// Mock file system operations
vi.mock('fs/promises');
const mockFs = vi.mocked(fs);

// Mock Prisma clients
const mockSqliteClient = {
  $connect: vi.fn(),
  $disconnect: vi.fn(),
  accounts: { findMany: vi.fn() },
  risk_group: { findMany: vi.fn() },
  universe: { findMany: vi.fn() },
  trades: { findMany: vi.fn() },
  holidays: { findMany: vi.fn() },
  divDepositType: { findMany: vi.fn() },
  divDeposits: { findMany: vi.fn() },
  screener: { findMany: vi.fn() },
};

const mockPostgresClient = {
  $connect: vi.fn(),
  $disconnect: vi.fn(),
  accounts: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
    count: vi.fn(),
  },
  risk_group: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
    count: vi.fn(),
  },
  universe: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
    count: vi.fn(),
  },
  trades: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
    count: vi.fn(),
  },
  holidays: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
    count: vi.fn(),
  },
  divDepositType: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
    count: vi.fn(),
  },
  divDeposits: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
    count: vi.fn(),
  },
  screener: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
    count: vi.fn(),
  },
};

// Mock Prisma Client constructors
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation((config) => {
    if (
      config?.datasources?.db?.url?.includes('sqlite') ||
      config?.datasources?.db?.url?.includes('file:')
    ) {
      return mockSqliteClient;
    }
    return mockPostgresClient;
  }),
}));

describe('DatabaseMigrator', () => {
  let config: MigrationConfig;
  let migrator: DatabaseMigrator;

  beforeEach(() => {
    vi.clearAllMocks();

    config = {
      sqliteUrl: 'file:./test.db',
      postgresUrl: 'postgresql://test:test@localhost:5432/test_db',
      backupDir: './test-backups',
      dryRun: true,
      verbose: false,
    };

    migrator = new DatabaseMigrator(config);

    // Setup default mock implementations
    mockSqliteClient.$connect.mockResolvedValue(undefined);
    mockSqliteClient.$disconnect.mockResolvedValue(undefined);
    mockPostgresClient.$connect.mockResolvedValue(undefined);
    mockPostgresClient.$disconnect.mockResolvedValue(undefined);

    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with provided configuration', () => {
      expect(migrator).toBeInstanceOf(DatabaseMigrator);
    });
  });

  describe('migrate - dry run', () => {
    it('should complete dry run migration successfully', async () => {
      // Setup mock data
      const mockData = [
        {
          id: '1',
          name: 'Test Account',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          version: 1,
        },
      ];

      mockSqliteClient.accounts.findMany.mockResolvedValue(mockData);
      mockSqliteClient.risk_group.findMany.mockResolvedValue([]);
      mockSqliteClient.universe.findMany.mockResolvedValue([]);
      mockSqliteClient.trades.findMany.mockResolvedValue([]);
      mockSqliteClient.holidays.findMany.mockResolvedValue([]);
      mockSqliteClient.divDepositType.findMany.mockResolvedValue([]);
      mockSqliteClient.divDeposits.findMany.mockResolvedValue([]);
      mockSqliteClient.screener.findMany.mockResolvedValue([]);

      const result = await migrator.migrate();

      expect(result.tablesProcessed).toBe(8); // 8 tables in migration order
      expect(result.recordsMigrated).toBe(1); // 1 record from accounts
      expect(result.errors).toHaveLength(0);
      expect(result.endTime).toBeDefined();

      // Verify database connections were established
      expect(mockSqliteClient.$connect).toHaveBeenCalled();
      expect(mockPostgresClient.$connect).toHaveBeenCalled();

      // Verify cleanup was called
      expect(mockSqliteClient.$disconnect).toHaveBeenCalled();
      expect(mockPostgresClient.$disconnect).toHaveBeenCalled();

      // In dry run mode, no actual data should be written
      expect(mockPostgresClient.accounts.deleteMany).not.toHaveBeenCalled();
      expect(mockPostgresClient.accounts.createMany).not.toHaveBeenCalled();
    });

    it('should handle empty tables gracefully', async () => {
      // Setup all tables as empty
      mockSqliteClient.accounts.findMany.mockResolvedValue([]);
      mockSqliteClient.risk_group.findMany.mockResolvedValue([]);
      mockSqliteClient.universe.findMany.mockResolvedValue([]);
      mockSqliteClient.trades.findMany.mockResolvedValue([]);
      mockSqliteClient.holidays.findMany.mockResolvedValue([]);
      mockSqliteClient.divDepositType.findMany.mockResolvedValue([]);
      mockSqliteClient.divDeposits.findMany.mockResolvedValue([]);
      mockSqliteClient.screener.findMany.mockResolvedValue([]);

      const result = await migrator.migrate();

      expect(result.tablesProcessed).toBe(8);
      expect(result.recordsMigrated).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('migrate - actual migration', () => {
    beforeEach(() => {
      config.dryRun = false;
      migrator = new DatabaseMigrator(config);
    });

    it('should perform actual migration when not in dry run mode', async () => {
      const mockData = [
        {
          id: '1',
          name: 'Test Account',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          version: 1,
        },
      ];

      mockSqliteClient.accounts.findMany.mockResolvedValue(mockData);
      mockSqliteClient.risk_group.findMany.mockResolvedValue([]);
      mockSqliteClient.universe.findMany.mockResolvedValue([]);
      mockSqliteClient.trades.findMany.mockResolvedValue([]);
      mockSqliteClient.holidays.findMany.mockResolvedValue([]);
      mockSqliteClient.divDepositType.findMany.mockResolvedValue([]);
      mockSqliteClient.divDeposits.findMany.mockResolvedValue([]);
      mockSqliteClient.screener.findMany.mockResolvedValue([]);

      mockPostgresClient.accounts.deleteMany.mockResolvedValue({ count: 0 });
      mockPostgresClient.accounts.createMany.mockResolvedValue({ count: 1 });

      await migrator.migrate();

      // Verify backup was created
      expect(mockFs.mkdir).toHaveBeenCalledWith(config.backupDir, {
        recursive: true,
      });
      expect(mockFs.writeFile).toHaveBeenCalled();

      // Verify data migration
      expect(mockPostgresClient.accounts.deleteMany).toHaveBeenCalled();
      expect(mockPostgresClient.accounts.createMany).toHaveBeenCalledWith({
        data: mockData,
        skipDuplicates: true,
      });
    });

    it('should handle migration errors appropriately', async () => {
      mockSqliteClient.accounts.findMany.mockRejectedValue(
        new Error('SQLite connection failed')
      );

      mockSqliteClient.risk_group.findMany.mockResolvedValue([]);
      mockSqliteClient.universe.findMany.mockResolvedValue([]);
      mockSqliteClient.trades.findMany.mockResolvedValue([]);
      mockSqliteClient.holidays.findMany.mockResolvedValue([]);
      mockSqliteClient.divDepositType.findMany.mockResolvedValue([]);
      mockSqliteClient.divDeposits.findMany.mockResolvedValue([]);
      mockSqliteClient.screener.findMany.mockResolvedValue([]);

      await expect(migrator.migrate()).rejects.toThrow();

      // Verify cleanup still happens
      expect(mockSqliteClient.$disconnect).toHaveBeenCalled();
      expect(mockPostgresClient.$disconnect).toHaveBeenCalled();
    });
  });

  describe('connection validation', () => {
    it('should handle SQLite connection failures', async () => {
      mockSqliteClient.$connect.mockRejectedValue(
        new Error('SQLite connection failed')
      );

      await expect(migrator.migrate()).rejects.toThrow(
        'SQLite connection failed'
      );
    });

    it('should handle PostgreSQL connection failures', async () => {
      mockPostgresClient.$connect.mockRejectedValue(
        new Error('PostgreSQL connection failed')
      );

      await expect(migrator.migrate()).rejects.toThrow(
        'PostgreSQL connection failed'
      );
    });
  });
});
