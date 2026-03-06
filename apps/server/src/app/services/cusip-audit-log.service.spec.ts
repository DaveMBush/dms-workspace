import { PrismaClient } from '@prisma/client';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../prisma/prisma-client', function () {
  return {
    prisma: {},
  };
});

import { cusipAuditLogService } from './cusip-audit-log.service';

function createMockPrismaClient(): PrismaClient {
  return {
    cusip_cache_audit: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  } as unknown as PrismaClient;
}

describe('cusipAuditLogService', function () {
  let mockPrisma: PrismaClient;

  beforeEach(function () {
    mockPrisma = createMockPrismaClient();
  });

  describe('logCacheChange', function () {
    test('should create an audit log entry', async function () {
      (
        mockPrisma.cusip_cache_audit.create as ReturnType<typeof vi.fn>
      ).mockResolvedValue({ id: 'audit-1' });

      await cusipAuditLogService.logCacheChange(
        {
          cusip: '037833100',
          symbol: 'AAPL',
          action: 'CREATE',
          source: 'MANUAL',
          userId: 'user-1',
          reason: 'Manual correction',
        },
        mockPrisma
      );

      expect(mockPrisma.cusip_cache_audit.create).toHaveBeenCalledWith({
        data: {
          cusip: '037833100',
          symbol: 'AAPL',
          action: 'CREATE',
          source: 'MANUAL',
          userId: 'user-1',
          reason: 'Manual correction',
        },
      });
    });

    test('should create entry without optional fields', async function () {
      (
        mockPrisma.cusip_cache_audit.create as ReturnType<typeof vi.fn>
      ).mockResolvedValue({ id: 'audit-2' });

      await cusipAuditLogService.logCacheChange(
        {
          cusip: '037833100',
          symbol: 'AAPL',
          action: 'DELETE',
          source: 'API',
        },
        mockPrisma
      );

      expect(mockPrisma.cusip_cache_audit.create).toHaveBeenCalledWith({
        data: {
          cusip: '037833100',
          symbol: 'AAPL',
          action: 'DELETE',
          source: 'API',
          userId: undefined,
          reason: undefined,
        },
      });
    });
  });

  describe('queryAuditLog', function () {
    test('should query audit log with no filters', async function () {
      const mockEntries = [
        {
          id: 'audit-1',
          cusip: '037833100',
          symbol: 'AAPL',
          action: 'CREATE',
          source: 'MANUAL',
          userId: null,
          reason: null,
          createdAt: new Date(),
        },
      ];

      (
        mockPrisma.cusip_cache_audit.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockEntries);
      (
        mockPrisma.cusip_cache_audit.count as ReturnType<typeof vi.fn>
      ).mockResolvedValue(1);

      const result = await cusipAuditLogService.queryAuditLog({}, mockPrisma);

      expect(result.entries).toEqual(mockEntries);
      expect(result.total).toBe(1);
    });

    test('should filter by cusip', async function () {
      (
        mockPrisma.cusip_cache_audit.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue([]);
      (
        mockPrisma.cusip_cache_audit.count as ReturnType<typeof vi.fn>
      ).mockResolvedValue(0);

      await cusipAuditLogService.queryAuditLog(
        { cusip: '037833100' },
        mockPrisma
      );

      expect(mockPrisma.cusip_cache_audit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { cusip: '037833100' },
        })
      );
    });

    test('should apply date range filters', async function () {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-12-31');

      (
        mockPrisma.cusip_cache_audit.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue([]);
      (
        mockPrisma.cusip_cache_audit.count as ReturnType<typeof vi.fn>
      ).mockResolvedValue(0);

      await cusipAuditLogService.queryAuditLog(
        { startDate, endDate },
        mockPrisma
      );

      expect(mockPrisma.cusip_cache_audit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            createdAt: { gte: startDate, lte: endDate },
          },
        })
      );
    });

    test('should apply pagination', async function () {
      (
        mockPrisma.cusip_cache_audit.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue([]);
      (
        mockPrisma.cusip_cache_audit.count as ReturnType<typeof vi.fn>
      ).mockResolvedValue(0);

      await cusipAuditLogService.queryAuditLog(
        { limit: 10, offset: 20 },
        mockPrisma
      );

      expect(mockPrisma.cusip_cache_audit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      );
    });
  });
});
