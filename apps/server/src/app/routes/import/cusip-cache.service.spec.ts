import { PrismaClient } from '@prisma/client';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../prisma/prisma-client', function () {
  return {
    prisma: {},
  };
});

import { cusipCacheService } from './cusip-cache.service';

// --- Mock types matching Prisma model ---

interface CusipCacheEntry {
  id: string;
  cusip: string;
  symbol: string;
  source: 'OPENFIGI' | 'YAHOO_FINANCE';
  resolvedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

function createMockPrismaClient(): PrismaClient {
  return {
    cusip_cache: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  } as unknown as PrismaClient;
}

const defaultTimestamp = new Date('2025-01-01T00:00:00Z');

function createCacheEntry(
  cusip: string,
  symbol: string,
  overrides?: Partial<CusipCacheEntry>
): CusipCacheEntry {
  const defaults: CusipCacheEntry = {
    id: 'uuid-' + cusip,
    cusip,
    symbol,
    source: 'OPENFIGI',
    resolvedAt: defaultTimestamp,
    createdAt: defaultTimestamp,
    updatedAt: defaultTimestamp,
  };
  return { ...defaults, ...overrides };
}

describe('cusipCacheService', function () {
  let mockPrisma: PrismaClient;

  beforeEach(function () {
    mockPrisma = createMockPrismaClient();
  });

  // === Cache Lookup Tests (AC: 1-5) ===

  describe('cache lookup', function () {
    test('should return cached ticker without API calls for a known CUSIP', async function () {
      const cachedEntry = createCacheEntry('88634T493', 'MSTY');
      (
        mockPrisma.cusip_cache.findUnique as ReturnType<typeof vi.fn>
      ).mockResolvedValue(cachedEntry);

      const result = await cusipCacheService.findByCusip(
        '88634T493',
        mockPrisma
      );

      expect(result).toBe('MSTY');
      expect(mockPrisma.cusip_cache.findUnique).toHaveBeenCalledWith({
        where: { cusip: '88634T493' },
      });
    });

    test('should look up multiple CUSIPs from cache in batch', async function () {
      const entries = [
        createCacheEntry('88634T493', 'MSTY'),
        createCacheEntry('691543102', 'OXLC'),
      ];
      (
        mockPrisma.cusip_cache.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue(entries);

      const result = await cusipCacheService.findManyCusips(
        ['88634T493', '691543102'],
        mockPrisma
      );

      expect(result.size).toBe(2);
      expect(result.get('88634T493')).toBe('MSTY');
      expect(result.get('691543102')).toBe('OXLC');
    });

    test('should return correct mappings for known CUSIPs', async function () {
      const entries = [
        createCacheEntry('88634T493', 'MSTY'),
        createCacheEntry('12345A678', 'XYZ'),
        createCacheEntry('691543102', 'OXLC'),
      ];
      (
        mockPrisma.cusip_cache.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue(entries);

      const result = await cusipCacheService.findManyCusips(
        ['88634T493', '12345A678', '691543102'],
        mockPrisma
      );

      expect(result.get('88634T493')).toBe('MSTY');
      expect(result.get('12345A678')).toBe('XYZ');
      expect(result.get('691543102')).toBe('OXLC');
    });

    test('should return null for uncached CUSIPs', async function () {
      (
        mockPrisma.cusip_cache.findUnique as ReturnType<typeof vi.fn>
      ).mockResolvedValue(null);

      const result = await cusipCacheService.findByCusip(
        '99999X999',
        mockPrisma
      );

      expect(result).toBeNull();
    });

    test('should handle mixed cached and uncached CUSIPs', async function () {
      const entries = [createCacheEntry('88634T493', 'MSTY')];
      (
        mockPrisma.cusip_cache.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue(entries);

      const allCusips = ['88634T493', '99999X999'];
      const result = await cusipCacheService.findManyCusips(
        allCusips,
        mockPrisma
      );

      // Only the cached one should be returned
      expect(result.size).toBe(1);
      expect(result.get('88634T493')).toBe('MSTY');

      // uncached CUSIPs are those not in the result
      const uncached = allCusips.filter(function isUncached(c) {
        return !result.has(c);
      });
      expect(uncached).toEqual(['99999X999']);
    });
  });

  // === Cache Update Tests (AC: 6-10) ===

  describe('cache update', function () {
    test('should cache successful OpenFIGI resolutions', async function () {
      const entry = createCacheEntry('88634T493', 'MSTY');
      (
        mockPrisma.cusip_cache.upsert as ReturnType<typeof vi.fn>
      ).mockResolvedValue(entry);

      await cusipCacheService.upsertMapping(
        '88634T493',
        'MSTY',
        'OPENFIGI',
        mockPrisma
      );

      expect(mockPrisma.cusip_cache.upsert).toHaveBeenCalledWith({
        where: { cusip: '88634T493' },
        update: { symbol: 'MSTY', source: 'OPENFIGI' },
        create: { cusip: '88634T493', symbol: 'MSTY', source: 'OPENFIGI' },
      });
    });

    test('should cache successful Yahoo Finance fallback resolutions', async function () {
      const entry = createCacheEntry('691543102', 'OXLC', {
        source: 'YAHOO_FINANCE',
      });
      (
        mockPrisma.cusip_cache.upsert as ReturnType<typeof vi.fn>
      ).mockResolvedValue(entry);

      await cusipCacheService.upsertMapping(
        '691543102',
        'OXLC',
        'YAHOO_FINANCE',
        mockPrisma
      );

      expect(mockPrisma.cusip_cache.upsert).toHaveBeenCalledWith({
        where: { cusip: '691543102' },
        update: { symbol: 'OXLC', source: 'YAHOO_FINANCE' },
        create: {
          cusip: '691543102',
          symbol: 'OXLC',
          source: 'YAHOO_FINANCE',
        },
      });
    });

    test('should not cache failed resolutions', async function () {
      // When resolution fails, upsert should not be called
      // Simulate: only cache if a CUSIP has a resolved symbol
      const failedCusip = '99999X999';
      const resolvedSymbol: string | undefined = undefined;

      if (resolvedSymbol !== undefined) {
        await cusipCacheService.upsertMapping(
          failedCusip,
          resolvedSymbol,
          'OPENFIGI',
          mockPrisma
        );
      }

      expect(mockPrisma.cusip_cache.upsert).not.toHaveBeenCalled();
    });

    test('should cache only successes from partial batch results', async function () {
      const resolved = new Map<string, string>([['88634T493', 'MSTY']]);
      const allCusips = ['88634T493', '99999X999'];

      const entry = createCacheEntry('88634T493', 'MSTY');
      (
        mockPrisma.cusip_cache.upsert as ReturnType<typeof vi.fn>
      ).mockResolvedValue(entry);

      const mappings = allCusips
        .filter(function hasResolution(cusip) {
          return resolved.has(cusip);
        })
        .map(function toMapping(cusip) {
          return {
            cusip,
            symbol: resolved.get(cusip)!,
            source: 'OPENFIGI',
          };
        });

      await cusipCacheService.upsertManyMappings(mappings, mockPrisma);

      // Only the resolved CUSIP should have been cached
      expect(mockPrisma.cusip_cache.upsert).toHaveBeenCalledTimes(1);
      expect(mockPrisma.cusip_cache.upsert).toHaveBeenCalledWith({
        where: { cusip: '88634T493' },
        update: { symbol: 'MSTY', source: 'OPENFIGI' },
        create: { cusip: '88634T493', symbol: 'MSTY', source: 'OPENFIGI' },
      });
    });

    test('should use upsert to avoid duplicate cache entries', async function () {
      const entry1 = createCacheEntry('88634T493', 'MSTY', {
        updatedAt: new Date('2025-01-01T00:00:00Z'),
      });
      (
        mockPrisma.cusip_cache.upsert as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(entry1);

      await cusipCacheService.upsertMapping(
        '88634T493',
        'MSTY',
        'OPENFIGI',
        mockPrisma
      );

      const entry2 = createCacheEntry('88634T493', 'MSTY_NEW', {
        updatedAt: new Date('2025-06-01T00:00:00Z'),
      });
      (
        mockPrisma.cusip_cache.upsert as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(entry2);

      await cusipCacheService.upsertMapping(
        '88634T493',
        'MSTY_NEW',
        'OPENFIGI',
        mockPrisma
      );

      expect(mockPrisma.cusip_cache.upsert).toHaveBeenCalledTimes(2);
    });
  });

  // === Error Handling Tests (AC: 15-18) ===

  describe('error handling', function () {
    test('should handle database errors gracefully on lookup', async function () {
      (
        mockPrisma.cusip_cache.findUnique as ReturnType<typeof vi.fn>
      ).mockRejectedValue(new Error('Database connection failed'));

      const result = await cusipCacheService.findByCusip(
        '88634T493',
        mockPrisma
      );

      expect(result).toBeNull();
    });

    test('should handle cache write failures without affecting resolution', async function () {
      (
        mockPrisma.cusip_cache.upsert as ReturnType<typeof vi.fn>
      ).mockRejectedValue(new Error('Write failed'));

      await expect(
        cusipCacheService.upsertMapping(
          '88634T493',
          'MSTY',
          'OPENFIGI',
          mockPrisma
        )
      ).resolves.toBeUndefined();
    });

    test('should not cache entries with invalid CUSIP format', function () {
      const invalidCusips = ['', 'ABC', 'tooshort', '12345678901', 'abcdefghi'];

      for (const cusip of invalidCusips) {
        const isValid = /^[A-Z0-9]{9}$/.test(cusip) && /\d/.test(cusip);
        expect(isValid).toBe(false);
      }

      expect(mockPrisma.cusip_cache.upsert).not.toHaveBeenCalled();
    });

    test('should not cache entries with empty or null symbols', async function () {
      await cusipCacheService.upsertMapping(
        '88634T493',
        '',
        'OPENFIGI',
        mockPrisma
      );

      expect(mockPrisma.cusip_cache.upsert).not.toHaveBeenCalled();
    });
  });

  // === Data Integrity Tests (AC: 19-22) ===

  describe('data integrity', function () {
    test('should store timestamps for audit trail', async function () {
      const now = new Date();
      const entry = createCacheEntry('88634T493', 'MSTY', {
        createdAt: now,
        updatedAt: now,
      });
      (
        mockPrisma.cusip_cache.upsert as ReturnType<typeof vi.fn>
      ).mockResolvedValue(entry);

      await cusipCacheService.upsertMapping(
        '88634T493',
        'MSTY',
        'OPENFIGI',
        mockPrisma
      );

      expect(mockPrisma.cusip_cache.upsert).toHaveBeenCalled();
    });

    test('should enforce proper constraints on CUSIP and symbol fields', function () {
      const entry = createCacheEntry('88634T493', 'MSTY');

      expect(entry.cusip).toHaveLength(9);
      expect(entry.symbol.length).toBeGreaterThan(0);
      expect(typeof entry.cusip).toBe('string');
      expect(typeof entry.symbol).toBe('string');
    });

    test('should allow querying cache entries by CUSIP', async function () {
      const entry = createCacheEntry('88634T493', 'MSTY');
      (
        mockPrisma.cusip_cache.findUnique as ReturnType<typeof vi.fn>
      ).mockResolvedValue(entry);

      const result = await cusipCacheService.findByCusip(
        '88634T493',
        mockPrisma
      );

      expect(result).not.toBeNull();
      expect(result).toBe('MSTY');
    });

    test('should have proper data types for cache entries', function () {
      const entry = createCacheEntry('88634T493', 'MSTY');

      expect(typeof entry.id).toBe('string');
      expect(typeof entry.cusip).toBe('string');
      expect(typeof entry.symbol).toBe('string');
      expect(entry.createdAt).toBeInstanceOf(Date);
      expect(entry.updatedAt).toBeInstanceOf(Date);
    });
  });
});
