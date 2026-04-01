import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fastify, { FastifyInstance } from 'fastify';

import registerAccountIndexesRoutes from './index';

// Story AX.13: Tests verifying sort/filter state is parsed from headers
// and passed through to the query builders for all three childField types

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

describe('GET /indexes - sort/filter state passthrough (AX.13)', () => {
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

  describe('openTrades with sort header', () => {
    it('should apply buy_date sort from x-sort-filter-state header', async () => {
      mockPrismaTrades.findMany.mockResolvedValue([{ id: 't-1' }]);
      mockPrismaTrades.count.mockResolvedValue(1);

      const sortState = JSON.stringify({
        'trades-open': { sort: { field: 'buy_date', order: 'desc' } },
      });

      await app.inject({
        method: 'POST',
        url: '/api/accounts/indexes',
        headers: { 'x-sort-filter-state': sortState },
        payload: {
          startIndex: 0,
          length: 10,
          parentId: 'acc-1',
          childField: 'openTrades',
        },
      });

      expect(mockPrismaTrades.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { buy_date: 'desc' },
        })
      );
    });

    it('should apply symbol sort from x-sort-filter-state header', async () => {
      mockPrismaTrades.findMany.mockResolvedValue([]);
      mockPrismaTrades.count.mockResolvedValue(0);

      const sortState = JSON.stringify({
        'trades-open': { sort: { field: 'symbol', order: 'asc' } },
      });

      await app.inject({
        method: 'POST',
        url: '/api/accounts/indexes',
        headers: { 'x-sort-filter-state': sortState },
        payload: {
          startIndex: 0,
          length: 10,
          parentId: 'acc-1',
          childField: 'openTrades',
        },
      });

      expect(mockPrismaTrades.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { universe: { symbol: 'asc' } },
        })
      );
    });

    it('should apply computed sort (unrealizedGain) via in-memory sorting', async () => {
      mockPrismaTrades.findMany.mockResolvedValue([
        { id: 't-1', buy: 10, quantity: 5, universe: { last_price: 20 } },
        { id: 't-2', buy: 10, quantity: 5, universe: { last_price: 30 } },
      ]);
      mockPrismaTrades.count.mockResolvedValue(2);

      const sortState = JSON.stringify({
        'trades-open': {
          sort: { field: 'unrealizedGain', order: 'desc' },
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/accounts/indexes',
        headers: { 'x-sort-filter-state': sortState },
        payload: {
          startIndex: 0,
          length: 10,
          parentId: 'acc-1',
          childField: 'openTrades',
        },
      });

      const body = JSON.parse(response.body);
      // t-2 has higher unrealized gain (100 vs 50), so desc order = t-2 first
      expect(body.indexes).toEqual(['t-2', 't-1']);
    });

    it('should apply symbol filter from x-sort-filter-state header', async () => {
      mockPrismaTrades.findMany.mockResolvedValue([]);
      mockPrismaTrades.count.mockResolvedValue(0);

      const sortState = JSON.stringify({
        'trades-open': { filters: { symbol: 'AAPL' } },
      });

      await app.inject({
        method: 'POST',
        url: '/api/accounts/indexes',
        headers: { 'x-sort-filter-state': sortState },
        payload: {
          startIndex: 0,
          length: 10,
          parentId: 'acc-1',
          childField: 'openTrades',
        },
      });

      expect(mockPrismaTrades.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            universe: { symbol: { contains: 'AAPL' } },
          }),
        })
      );
    });
  });

  describe('soldTrades with sort header', () => {
    it('should apply sell_date sort from x-sort-filter-state header', async () => {
      mockPrismaTrades.findMany.mockResolvedValue([{ id: 's-1' }]);
      mockPrismaTrades.count.mockResolvedValue(1);

      const sortState = JSON.stringify({
        'trades-closed': {
          sort: { field: 'sell_date', order: 'desc' },
        },
      });

      await app.inject({
        method: 'POST',
        url: '/api/accounts/indexes',
        headers: { 'x-sort-filter-state': sortState },
        payload: {
          startIndex: 0,
          length: 10,
          parentId: 'acc-1',
          childField: 'soldTrades',
        },
      });

      expect(mockPrismaTrades.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { sell_date: 'desc' },
        })
      );
    });

    it('should apply date filter from x-sort-filter-state header for sold trades', async () => {
      mockPrismaTrades.findMany.mockResolvedValue([]);
      mockPrismaTrades.count.mockResolvedValue(0);

      const sortState = JSON.stringify({
        'trades-closed': {
          filters: { startDate: '2024-01-01', endDate: '2024-12-31' },
        },
      });

      await app.inject({
        method: 'POST',
        url: '/api/accounts/indexes',
        headers: { 'x-sort-filter-state': sortState },
        payload: {
          startIndex: 0,
          length: 10,
          parentId: 'acc-1',
          childField: 'soldTrades',
        },
      });

      const call = mockPrismaTrades.findMany.mock.calls[0][0];
      expect(call.where.sell_date).toEqual(
        expect.objectContaining({
          gte: expect.any(Date),
          lte: expect.any(Date),
        })
      );
    });
  });

  describe('divDeposits with sort header', () => {
    it('should apply date sort from x-sort-filter-state header', async () => {
      mockPrismaDivDeposits.findMany.mockResolvedValue([{ id: 'd-1' }]);
      mockPrismaDivDeposits.count.mockResolvedValue(1);

      const sortState = JSON.stringify({
        'div-deposits': { sort: { field: 'date', order: 'asc' } },
      });

      await app.inject({
        method: 'POST',
        url: '/api/accounts/indexes',
        headers: { 'x-sort-filter-state': sortState },
        payload: {
          startIndex: 0,
          length: 10,
          parentId: 'acc-1',
          childField: 'divDeposits',
        },
      });

      expect(mockPrismaDivDeposits.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { date: 'asc' },
        })
      );
    });

    it('should apply amount sort from x-sort-filter-state header', async () => {
      mockPrismaDivDeposits.findMany.mockResolvedValue([]);
      mockPrismaDivDeposits.count.mockResolvedValue(0);

      const sortState = JSON.stringify({
        'div-deposits': { sort: { field: 'amount', order: 'desc' } },
      });

      await app.inject({
        method: 'POST',
        url: '/api/accounts/indexes',
        headers: { 'x-sort-filter-state': sortState },
        payload: {
          startIndex: 0,
          length: 10,
          parentId: 'acc-1',
          childField: 'divDeposits',
        },
      });

      expect(mockPrismaDivDeposits.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { amount: 'desc' },
        })
      );
    });

    it('should apply symbol sort from x-sort-filter-state header for div deposits', async () => {
      mockPrismaDivDeposits.findMany.mockResolvedValue([]);
      mockPrismaDivDeposits.count.mockResolvedValue(0);

      const sortState = JSON.stringify({
        'div-deposits': { sort: { field: 'symbol', order: 'asc' } },
      });

      await app.inject({
        method: 'POST',
        url: '/api/accounts/indexes',
        headers: { 'x-sort-filter-state': sortState },
        payload: {
          startIndex: 0,
          length: 10,
          parentId: 'acc-1',
          childField: 'divDeposits',
        },
      });

      expect(mockPrismaDivDeposits.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { universe: { symbol: 'asc' } },
        })
      );
    });

    it('should apply date filter from x-sort-filter-state header for div deposits', async () => {
      mockPrismaDivDeposits.findMany.mockResolvedValue([]);
      mockPrismaDivDeposits.count.mockResolvedValue(0);

      const sortState = JSON.stringify({
        'div-deposits': {
          filters: { startDate: '2024-06-01' },
        },
      });

      await app.inject({
        method: 'POST',
        url: '/api/accounts/indexes',
        headers: { 'x-sort-filter-state': sortState },
        payload: {
          startIndex: 0,
          length: 10,
          parentId: 'acc-1',
          childField: 'divDeposits',
        },
      });

      const call = mockPrismaDivDeposits.findMany.mock.calls[0][0];
      expect(call.where.date).toEqual(
        expect.objectContaining({
          gte: expect.any(Date),
        })
      );
    });

    it('should default to date desc when no sort header provided', async () => {
      mockPrismaDivDeposits.findMany.mockResolvedValue([]);
      mockPrismaDivDeposits.count.mockResolvedValue(0);

      await app.inject({
        method: 'POST',
        url: '/api/accounts/indexes',
        payload: {
          startIndex: 0,
          length: 10,
          parentId: 'acc-1',
          childField: 'divDeposits',
        },
      });

      expect(mockPrismaDivDeposits.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { date: 'desc' },
        })
      );
    });
  });
});

// Story 37.2: Tests verifying sortColumns format (sent by Angular interceptor
// via migrateTableState) is handled correctly for all three childField types.
// The Angular interceptor converts `sort: { field, order }` to
// `sortColumns: [{ column, direction }]` before sending to the server.
describe('GET /indexes - sortColumns format (Story 37.2 fix)', () => {
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

  it('should apply openDate sort via sortColumns for openTrades', async () => {
    mockPrismaTrades.findMany.mockResolvedValue([{ id: 't-1' }]);
    mockPrismaTrades.count.mockResolvedValue(1);

    // This is what the Angular interceptor sends: buyDate → openDate after mapping
    const sortState = JSON.stringify({
      'trades-open': {
        sortColumns: [{ column: 'openDate', direction: 'asc' }],
      },
    });

    await app.inject({
      method: 'POST',
      url: '/api/accounts/indexes',
      headers: { 'x-sort-filter-state': sortState },
      payload: {
        startIndex: 0,
        length: 10,
        parentId: 'acc-1',
        childField: 'openTrades',
      },
    });

    expect(mockPrismaTrades.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { buy_date: 'asc' },
      })
    );
  });

  it('should apply closeDate sort via sortColumns for soldTrades', async () => {
    mockPrismaTrades.findMany.mockResolvedValue([{ id: 's-1' }]);
    mockPrismaTrades.count.mockResolvedValue(1);

    // This is what the Angular interceptor sends: sell_date → closeDate after mapping
    const sortState = JSON.stringify({
      'trades-closed': {
        sortColumns: [{ column: 'closeDate', direction: 'asc' }],
      },
    });

    await app.inject({
      method: 'POST',
      url: '/api/accounts/indexes',
      headers: { 'x-sort-filter-state': sortState },
      payload: {
        startIndex: 0,
        length: 10,
        parentId: 'acc-1',
        childField: 'soldTrades',
      },
    });

    expect(mockPrismaTrades.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { sell_date: 'asc' },
      })
    );
  });

  it('should apply amount sort via sortColumns for divDeposits', async () => {
    mockPrismaDivDeposits.findMany.mockResolvedValue([{ id: 'd-1' }]);
    mockPrismaDivDeposits.count.mockResolvedValue(1);

    const sortState = JSON.stringify({
      'div-deposits': {
        sortColumns: [{ column: 'amount', direction: 'asc' }],
      },
    });

    await app.inject({
      method: 'POST',
      url: '/api/accounts/indexes',
      headers: { 'x-sort-filter-state': sortState },
      payload: {
        startIndex: 0,
        length: 10,
        parentId: 'acc-1',
        childField: 'divDeposits',
      },
    });

    expect(mockPrismaDivDeposits.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { amount: 'asc' },
      })
    );
  });

  it('should apply computed unrealizedGain sort via sortColumns for openTrades', async () => {
    mockPrismaTrades.findMany.mockResolvedValue([
      { id: 't-1', buy: 10, quantity: 5, universe: { last_price: 20 } },
      { id: 't-2', buy: 10, quantity: 5, universe: { last_price: 30 } },
    ]);
    mockPrismaTrades.count.mockResolvedValue(2);

    const sortState = JSON.stringify({
      'trades-open': {
        sortColumns: [{ column: 'unrealizedGain', direction: 'desc' }],
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/accounts/indexes',
      headers: { 'x-sort-filter-state': sortState },
      payload: {
        startIndex: 0,
        length: 10,
        parentId: 'acc-1',
        childField: 'openTrades',
      },
    });

    const body = JSON.parse(response.body);
    // t-2 has higher unrealized gain (100 vs 50), so desc = t-2 first
    expect(body.indexes).toEqual(['t-2', 't-1']);
  });
});
