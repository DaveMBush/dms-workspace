import fastify, { FastifyInstance } from 'fastify';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest';

vi.mock('../../../prisma/prisma-client', function () {
  const prismaMock: Record<string, unknown> = {
    cusip_cache: {
      count: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
    cusip_cache_archive: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    cusip_cache_audit: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  };
  prismaMock.$transaction = vi.fn(async function mockTransaction(
    fn: (tx: Record<string, unknown>) => Promise<unknown>
  ) {
    return fn(prismaMock);
  });
  return { prisma: prismaMock };
});

vi.mock('../../../services/cusip-audit-log.service', function () {
  return {
    cusipAuditLogService: {
      logCacheChange: vi.fn().mockResolvedValue(undefined),
      queryAuditLog: vi.fn().mockResolvedValue({ entries: [], total: 0 }),
    },
  };
});

vi.mock('../../../services/cusip-cache-cleanup.service', function () {
  return {
    cusipCacheCleanupService: {
      archiveStaleEntries: vi
        .fn()
        .mockResolvedValue({ archivedCount: 0, entries: [] }),
      getArchived: vi.fn().mockResolvedValue({ entries: [], total: 0 }),
      isCleanupEnabled: vi.fn().mockReturnValue(false),
      getCleanupAgeDays: vi.fn().mockReturnValue(365),
    },
  };
});

vi.mock('./upsert-with-audit', function () {
  return {
    cusipCacheTransactions: {
      upsertWithAudit: vi.fn().mockResolvedValue({
        id: 'uuid-1',
        cusip: '037833100',
        symbol: 'AAPL',
        source: 'OPENFIGI',
      }),
      deleteWithAudit: vi.fn().mockResolvedValue(undefined),
    },
  };
});

import { prisma } from '../../../prisma/prisma-client';
import { cusipAuditLogService } from '../../../services/cusip-audit-log.service';
import { cusipCacheCleanupService } from '../../../services/cusip-cache-cleanup.service';
import { cusipCacheTransactions } from './upsert-with-audit';
import registerAdminCusipCacheRoutes from './index';

describe('Admin CUSIP Cache Routes', function () {
  let app: FastifyInstance;

  beforeAll(async function () {
    app = fastify({ logger: false });
    await app.register(registerAdminCusipCacheRoutes, {
      prefix: '/api/admin/cusip-cache',
    });
    await app.ready();
  });

  afterAll(async function () {
    await app.close();
  });

  beforeEach(function () {
    vi.clearAllMocks();
  });

  // === Stats Endpoint ===

  describe('GET /api/admin/cusip-cache/stats', function () {
    test('should return cache statistics', async function () {
      (prisma.cusip_cache.count as ReturnType<typeof vi.fn>).mockResolvedValue(
        100
      );
      (
        prisma.cusip_cache.groupBy as ReturnType<typeof vi.fn>
      ).mockResolvedValue([
        { source: 'OPENFIGI', _count: 70 },
        { source: 'YAHOO_FINANCE', _count: 30 },
      ]);
      (
        prisma.cusip_cache.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue([
        {
          cusip: '037833100',
          symbol: 'AAPL',
          source: 'OPENFIGI',
          resolvedAt: new Date(),
        },
      ]);
      (prisma.cusip_cache.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ createdAt: new Date('2024-01-01') })
        .mockResolvedValueOnce({ createdAt: new Date('2026-03-06') });

      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/cusip-cache/stats',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.totalEntries).toBe(100);
      expect(body.entriesBySource).toEqual({ OPENFIGI: 70, YAHOO_FINANCE: 30 });
      expect(body.recentlyAdded).toHaveLength(1);
      expect(body).toHaveProperty('timestamp');
    });
  });

  // === Search Endpoint ===

  describe('GET /api/admin/cusip-cache/search', function () {
    test('should return 400 when no query params', async function () {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/cusip-cache/search',
      });

      expect(response.statusCode).toBe(400);
    });

    test('should search by cusip', async function () {
      (
        prisma.cusip_cache.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue([{ cusip: '037833100', symbol: 'AAPL' }]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/cusip-cache/search?cusip=037833100',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.count).toBe(1);
    });

    test('should search by symbol', async function () {
      (
        prisma.cusip_cache.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue([{ cusip: '037833100', symbol: 'AAPL' }]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/cusip-cache/search?symbol=AAPL',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.count).toBe(1);
    });
  });

  // === Add Endpoint ===

  describe('POST /api/admin/cusip-cache/add', function () {
    test('should add a new mapping', async function () {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/cusip-cache/add',
        payload: { cusip: '037833100', symbol: 'AAPL' },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.cusip).toBe('037833100');
      expect(cusipCacheTransactions.upsertWithAudit).toHaveBeenCalledWith({
        cusip: '037833100',
        symbol: 'AAPL',
        source: 'OPENFIGI',
        auditSource: 'MANUAL',
        reason: undefined,
      });
    });

    test('should reject invalid CUSIP', async function () {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/cusip-cache/add',
        payload: { cusip: 'BAD', symbol: 'AAPL' },
      });

      expect(response.statusCode).toBe(400);
    });

    test('should reject empty symbol', async function () {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/cusip-cache/add',
        payload: { cusip: '037833100', symbol: '' },
      });

      expect(response.statusCode).toBe(400);
    });

    test('should reject invalid source', async function () {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/cusip-cache/add',
        payload: { cusip: '037833100', symbol: 'AAPL', source: 'INVALID' },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // === Delete Endpoint ===

  describe('DELETE /api/admin/cusip-cache/:id', function () {
    test('should delete existing entry', async function () {
      (
        prisma.cusip_cache.findUnique as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        id: 'uuid-1',
        cusip: '037833100',
        symbol: 'AAPL',
      });

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/admin/cusip-cache/uuid-1',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.cusip).toBe('037833100');
      expect(cusipCacheTransactions.deleteWithAudit).toHaveBeenCalledWith(
        'uuid-1',
        '037833100',
        'AAPL'
      );
    });

    test('should return 404 for missing entry', async function () {
      (
        prisma.cusip_cache.findUnique as ReturnType<typeof vi.fn>
      ).mockResolvedValue(null);

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/admin/cusip-cache/nonexistent',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // === Bulk Add Endpoint ===

  describe('POST /api/admin/cusip-cache/bulk-add', function () {
    test('should add multiple mappings', async function () {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/cusip-cache/bulk-add',
        payload: {
          mappings: [
            { cusip: '037833100', symbol: 'AAPL' },
            { cusip: '594918104', symbol: 'MSFT' },
          ],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.added).toBe(2);
      expect(body.errors).toHaveLength(0);
      expect(cusipCacheTransactions.upsertWithAudit).toHaveBeenCalledTimes(2);
    });

    test('should report errors for invalid entries', async function () {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/cusip-cache/bulk-add',
        payload: {
          mappings: [
            { cusip: 'BAD', symbol: 'AAPL' },
            { cusip: '037833100', symbol: '' },
            { cusip: '594918104', symbol: 'MSFT' },
          ],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.added).toBe(1);
      expect(body.errors).toHaveLength(2);
    });

    test('should reject empty mappings array', async function () {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/cusip-cache/bulk-add',
        payload: { mappings: [] },
      });

      expect(response.statusCode).toBe(400);
    });

    test('should reject invalid source in bulk', async function () {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/cusip-cache/bulk-add',
        payload: {
          mappings: [{ cusip: '037833100', symbol: 'AAPL', source: 'INVALID' }],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.added).toBe(0);
      expect(body.errors).toHaveLength(1);
    });
  });

  // === Audit Endpoint ===

  describe('GET /api/admin/cusip-cache/audit', function () {
    test('should return audit log entries', async function () {
      const entries = [
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
        cusipAuditLogService.queryAuditLog as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        entries,
        total: 1,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/cusip-cache/audit',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.total).toBe(1);
      expect(body.entries).toHaveLength(1);
    });

    test('should filter by cusip', async function () {
      (
        cusipAuditLogService.queryAuditLog as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        entries: [],
        total: 0,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/cusip-cache/audit?cusip=037833100',
      });

      expect(response.statusCode).toBe(200);
    });
  });

  // === Cleanup Endpoint ===

  describe('POST /api/admin/cusip-cache/cleanup', function () {
    test('should run cleanup and return results', async function () {
      (
        cusipCacheCleanupService.archiveStaleEntries as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        archivedCount: 0,
        entries: [],
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/cusip-cache/cleanup',
        payload: { ageDays: 365 },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.archivedCount).toBe(0);
    });
  });

  // === Archived Endpoint ===

  describe('GET /api/admin/cusip-cache/archived', function () {
    test('should return archived entries', async function () {
      (
        cusipCacheCleanupService.getArchived as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        entries: [],
        total: 0,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/cusip-cache/archived',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.total).toBe(0);
    });
  });
});
