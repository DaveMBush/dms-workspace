import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fastify, { FastifyInstance } from 'fastify';

import registerAccountIndexesRoutes from './index';

// Story AX.5: TDD Tests for /indexes endpoint handling openTrades
// RED phase — these tests expect openTrades handling that doesn't exist yet
// Disabled with describe.skip() to allow CI to pass
// Will be re-enabled in Story AX.6

// Hoisted mocks
const { mockPrismaTrades, mockPrismaDivDeposits } = vi.hoisted(() => ({
  mockPrismaTrades: { findMany: vi.fn(), count: vi.fn() },
  mockPrismaDivDeposits: { findMany: vi.fn(), count: vi.fn() },
}));

vi.mock('../../../prisma/prisma-client', () => ({
  prisma: {
    trades: mockPrismaTrades,
    divDeposits: mockPrismaDivDeposits,
  },
}));

function makeTradeId(id: string): { id: string } {
  return { id };
}

describe('GET /indexes - openTrades childField (AX.5)', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = fastify({ logger: false });
    await app.register(registerAccountIndexesRoutes, {
      prefix: '/api/accounts/indexes',
    });
    await app.ready();
    mockPrismaTrades.findMany.mockReset();
    mockPrismaTrades.count.mockReset();
    mockPrismaDivDeposits.findMany.mockReset();
    mockPrismaDivDeposits.count.mockReset();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should handle childField === "openTrades" and return matching trade IDs', async () => {
    const tradeIds = Array.from({ length: 5 }, function createId(_, i) {
      return makeTradeId(`trade-${i}`);
    });
    mockPrismaTrades.findMany.mockResolvedValue(tradeIds);
    mockPrismaTrades.count.mockResolvedValue(20);

    const response = await app.inject({
      method: 'POST',
      url: '/api/accounts/indexes',
      payload: {
        startIndex: 0,
        length: 5,
        parentId: 'acc-1',
        childField: 'openTrades',
      },
    });

    const body = JSON.parse(response.body);
    expect(response.statusCode).toBe(200);
    expect(body.startIndex).toBe(0);
    expect(body.indexes).toEqual([
      'trade-0',
      'trade-1',
      'trade-2',
      'trade-3',
      'trade-4',
    ]);
    expect(body.length).toBe(20);
  });

  it('should filter open trades by sell_date null', async () => {
    mockPrismaTrades.findMany.mockResolvedValue([makeTradeId('open-1')]);
    mockPrismaTrades.count.mockResolvedValue(1);

    await app.inject({
      method: 'POST',
      url: '/api/accounts/indexes',
      payload: {
        startIndex: 0,
        length: 10,
        parentId: 'acc-1',
        childField: 'openTrades',
      },
    });

    // Verify that findMany was called with sell_date: null filter
    expect(mockPrismaTrades.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          accountId: 'acc-1',
          OR: expect.arrayContaining([
            expect.objectContaining({ sell_date: null }),
          ]),
        }),
      })
    );
  });

  it('should apply buildTradeOrderBy for trade ordering', async () => {
    mockPrismaTrades.findMany.mockResolvedValue([]);
    mockPrismaTrades.count.mockResolvedValue(0);

    await app.inject({
      method: 'POST',
      url: '/api/accounts/indexes',
      payload: {
        startIndex: 0,
        length: 10,
        parentId: 'acc-1',
        childField: 'openTrades',
      },
    });

    // Verify ordering is applied (default is createdAt: 'asc')
    expect(mockPrismaTrades.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: expect.any(Object),
      })
    );
  });

  it('should return correct slice using skip and take', async () => {
    const tradeIds = Array.from({ length: 3 }, function createId(_, i) {
      return makeTradeId(`trade-${i + 5}`);
    });
    mockPrismaTrades.findMany.mockResolvedValue(tradeIds);
    mockPrismaTrades.count.mockResolvedValue(15);

    const response = await app.inject({
      method: 'POST',
      url: '/api/accounts/indexes',
      payload: {
        startIndex: 5,
        length: 3,
        parentId: 'acc-1',
        childField: 'openTrades',
      },
    });

    const body = JSON.parse(response.body);
    expect(body.startIndex).toBe(5);
    expect(body.indexes).toEqual(['trade-5', 'trade-6', 'trade-7']);
    expect(body.length).toBe(15);
  });

  it('should return correct total count from prisma count', async () => {
    mockPrismaTrades.findMany.mockResolvedValue([makeTradeId('t-1')]);
    mockPrismaTrades.count.mockResolvedValue(100);

    const response = await app.inject({
      method: 'POST',
      url: '/api/accounts/indexes',
      payload: {
        startIndex: 0,
        length: 1,
        parentId: 'acc-1',
        childField: 'openTrades',
      },
    });

    const body = JSON.parse(response.body);
    expect(body.length).toBe(100);
  });

  it('should return empty indexes and length 0 when no open trades match', async () => {
    mockPrismaTrades.findMany.mockResolvedValue([]);
    mockPrismaTrades.count.mockResolvedValue(0);

    const response = await app.inject({
      method: 'POST',
      url: '/api/accounts/indexes',
      payload: {
        startIndex: 0,
        length: 10,
        parentId: 'acc-1',
        childField: 'openTrades',
      },
    });

    const body = JSON.parse(response.body);
    expect(body.indexes).toEqual([]);
    expect(body.length).toBe(0);
  });
});
