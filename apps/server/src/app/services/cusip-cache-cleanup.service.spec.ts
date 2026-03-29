import { PrismaClient } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../prisma/prisma-client', function () {
  return {
    prisma: {},
  };
});

import { cusipCacheCleanupService } from './cusip-cache-cleanup.service';

function createMockPrismaClient(): PrismaClient {
  const client = {
    cusip_cache: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    cusip_cache_archive: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    cusip_cache_audit: {
      create: vi.fn(),
    },
  } as unknown as PrismaClient;
  (client as Record<string, unknown>).$transaction = vi.fn(async function (
    fn: (tx: PrismaClient) => Promise<unknown>
  ) {
    return fn(client);
  });
  return client;
}

describe('cusipCacheCleanupService', function () {
  let mockPrisma: PrismaClient;
  const originalEnv = { ...process.env };

  beforeEach(function () {
    mockPrisma = createMockPrismaClient();
  });

  afterEach(function () {
    process.env = { ...originalEnv };
  });

  describe('archiveStaleEntries', function () {
    test('should return empty result when no stale entries exist', async function () {
      (
        mockPrisma.cusip_cache.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue([]);

      const result = await cusipCacheCleanupService.archiveStaleEntries(
        365,
        mockPrisma
      );

      expect(result.archivedCount).toBe(0);
      expect(result.entries).toEqual([]);
    });

    test('should archive stale entries and delete originals', async function () {
      const staleEntry = {
        id: 'entry-1',
        cusip: '037833100',
        symbol: 'AAPL',
        source: 'THIRTEENF',
        resolvedAt: new Date('2024-01-01'),
        lastUsedAt: new Date('2024-06-01'),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-06-01'),
      };

      (
        mockPrisma.cusip_cache.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue([staleEntry]);
      (
        mockPrisma.cusip_cache_archive.create as ReturnType<typeof vi.fn>
      ).mockResolvedValue({ id: 'archive-1' });
      (
        mockPrisma.cusip_cache.deleteMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue({ count: 1 });

      const result = await cusipCacheCleanupService.archiveStaleEntries(
        30,
        mockPrisma
      );

      expect(result.archivedCount).toBe(1);
      expect(result.entries[0].cusip).toBe('037833100');
      expect(mockPrisma.cusip_cache_archive.create).toHaveBeenCalled();
      expect(
        (
          mockPrisma as unknown as Record<
            string,
            Record<string, Record<string, ReturnType<typeof vi.fn>>>
          >
        ).cusip_cache_audit.create
      ).toHaveBeenCalledWith({
        data: expect.objectContaining({
          cusip: '037833100',
          action: 'DELETE',
        }),
      });
      expect(mockPrisma.cusip_cache.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['entry-1'] } },
      });
    });

    test('should reject non-positive ageDays', async function () {
      await expect(
        cusipCacheCleanupService.archiveStaleEntries(0, mockPrisma)
      ).rejects.toThrow('ageDays must be a positive integer');

      await expect(
        cusipCacheCleanupService.archiveStaleEntries(-5, mockPrisma)
      ).rejects.toThrow('ageDays must be a positive integer');
    });

    test('should use default ageDays from env when not provided', async function () {
      delete process.env.CUSIP_CACHE_CLEANUP_AGE_DAYS;
      (
        mockPrisma.cusip_cache.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue([]);

      const result = await cusipCacheCleanupService.archiveStaleEntries(
        undefined,
        mockPrisma
      );

      expect(result.archivedCount).toBe(0);
    });

    test('should reject non-integer ageDays', async function () {
      await expect(
        cusipCacheCleanupService.archiveStaleEntries(3.5, mockPrisma)
      ).rejects.toThrow('ageDays must be a positive integer');
    });
  });

  describe('getArchived', function () {
    test('should use default limit and offset when not provided', async function () {
      (
        mockPrisma.cusip_cache_archive.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue([]);
      (
        mockPrisma.cusip_cache_archive.count as ReturnType<typeof vi.fn>
      ).mockResolvedValue(0);

      const result = await cusipCacheCleanupService.getArchived({}, mockPrisma);

      expect(result.entries).toEqual([]);
      expect(result.total).toBe(0);
      expect(mockPrisma.cusip_cache_archive.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50, skip: 0 })
      );
    });

    test('should return archived entries with pagination', async function () {
      const mockEntries = [
        {
          id: 'archive-1',
          cusip: '037833100',
          symbol: 'AAPL',
          source: 'THIRTEENF',
          resolvedAt: new Date(),
          archivedAt: new Date(),
          reason: 'Unused for 365+ days',
        },
      ];

      (
        mockPrisma.cusip_cache_archive.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockEntries);
      (
        mockPrisma.cusip_cache_archive.count as ReturnType<typeof vi.fn>
      ).mockResolvedValue(1);

      const result = await cusipCacheCleanupService.getArchived(
        { limit: 10, offset: 0 },
        mockPrisma
      );

      expect(result.entries).toEqual(mockEntries);
      expect(result.total).toBe(1);
    });
  });

  describe('isCleanupEnabled', function () {
    test('should return false by default', function () {
      delete process.env.CUSIP_CACHE_CLEANUP_ENABLED;
      expect(cusipCacheCleanupService.isCleanupEnabled()).toBe(false);
    });

    test('should return true when env var is set', function () {
      process.env.CUSIP_CACHE_CLEANUP_ENABLED = 'true';
      expect(cusipCacheCleanupService.isCleanupEnabled()).toBe(true);
    });
  });

  describe('getCleanupAgeDays', function () {
    test('should return 365 by default', function () {
      delete process.env.CUSIP_CACHE_CLEANUP_AGE_DAYS;
      expect(cusipCacheCleanupService.getCleanupAgeDays()).toBe(365);
    });

    test('should return env value when set', function () {
      process.env.CUSIP_CACHE_CLEANUP_AGE_DAYS = '180';
      expect(cusipCacheCleanupService.getCleanupAgeDays()).toBe(180);
    });
    test('should return 365 for invalid env value', function () {
      process.env.CUSIP_CACHE_CLEANUP_AGE_DAYS = 'abc';
      expect(cusipCacheCleanupService.getCleanupAgeDays()).toBe(365);
    });

    test('should return 365 for zero env value', function () {
      process.env.CUSIP_CACHE_CLEANUP_AGE_DAYS = '0';
      expect(cusipCacheCleanupService.getCleanupAgeDays()).toBe(365);
    });
  });
});
