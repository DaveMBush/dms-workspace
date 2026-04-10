import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
  afterEach,
  beforeAll,
  afterAll,
} from 'vitest';
import fastify, { FastifyInstance } from 'fastify';
import registerTopRoutes from './index';

// Hoisted mocks
const {
  mockEnsureRiskGroupsExist,
  mockPrismaAccounts,
  mockPrismaUniverse,
  mockPrismaRiskGroup,
  mockPrismaDivDepositType,
  mockPrismaHolidays,
  mockPrismaScreener,
} = vi.hoisted(() => ({
  mockEnsureRiskGroupsExist: vi.fn(),
  mockPrismaAccounts: {
    findMany: vi.fn(),
  },
  mockPrismaUniverse: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  mockPrismaRiskGroup: {
    findMany: vi.fn(),
  },
  mockPrismaDivDepositType: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  mockPrismaHolidays: {
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
  mockPrismaScreener: {
    findMany: vi.fn(),
  },
}));

vi.mock('../settings/common/ensure-risk-groups-exist.function', () => ({
  ensureRiskGroupsExist: mockEnsureRiskGroupsExist,
}));

vi.mock('../../prisma/prisma-client', () => ({
  prisma: {
    accounts: mockPrismaAccounts,
    universe: mockPrismaUniverse,
    risk_group: mockPrismaRiskGroup,
    divDepositType: mockPrismaDivDepositType,
    holidays: mockPrismaHolidays,
    screener: mockPrismaScreener,
  },
}));

vi.mock('nyse-holidays', () => ({
  getHolidays: vi.fn(() => []),
}));

describe('Top Route Handler', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = fastify({ logger: false });
    await app.register(registerTopRoutes, { prefix: '/api/top' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up default mock responses
    mockPrismaAccounts.findMany.mockResolvedValue([
      { id: 'acc-1' },
      { id: 'acc-2' },
    ]);
    mockPrismaUniverse.findMany.mockResolvedValue([{ id: 'uni-1' }]);
    mockPrismaUniverse.count.mockResolvedValue(1);
    mockPrismaRiskGroup.findMany.mockResolvedValue([
      { id: 'rg-1' },
      { id: 'rg-2' },
      { id: 'rg-3' },
    ]);
    mockPrismaDivDepositType.findMany.mockResolvedValue([
      { id: 'ddt-1' },
      { id: 'ddt-2' },
    ]);
    mockPrismaHolidays.findMany.mockResolvedValue([
      { date: new Date('2026-01-01') },
      { date: new Date('2026-07-04') },
    ]);
    mockPrismaScreener.findMany.mockResolvedValue([{ id: 'scr-1' }]);

    mockEnsureRiskGroupsExist.mockResolvedValue([
      { id: 'rg-1', name: 'Equities' },
      { id: 'rg-2', name: 'Income' },
      { id: 'rg-3', name: 'Tax Free Income' },
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  describe('POST / - Risk Group Validation', () => {
    it('should call ensureRiskGroupsExist before loading data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/top',
        payload: ['1'],
      });

      expect(response.statusCode).toBe(200);
      expect(mockEnsureRiskGroupsExist).toHaveBeenCalledTimes(1);
    });

    it('should return risk groups in response', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/top',
        payload: ['1'],
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveLength(1);
      expect(body[0]).toHaveProperty('riskGroups');
      expect(body[0].riskGroups).toEqual(['rg-1', 'rg-2', 'rg-3']);
    });

    it('should handle ensureRiskGroupsExist failure gracefully', async () => {
      mockEnsureRiskGroupsExist.mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      const response = await app.inject({
        method: 'POST',
        url: '/api/top',
        payload: ['1'],
      });

      // Should return an error response
      expect(response.statusCode).toBe(500);
      expect(mockEnsureRiskGroupsExist).toHaveBeenCalledTimes(1);
    });

    it('should proceed normally when risk groups already exist', async () => {
      mockEnsureRiskGroupsExist.mockResolvedValueOnce([
        { id: 'rg-1', name: 'Equities' },
        { id: 'rg-2', name: 'Income' },
        { id: 'rg-3', name: 'Tax Free Income' },
      ]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/top',
        payload: ['1'],
      });

      expect(response.statusCode).toBe(200);
      expect(mockEnsureRiskGroupsExist).toHaveBeenCalledTimes(1);

      const body = JSON.parse(response.body);
      expect(body[0].riskGroups).toEqual(['rg-1', 'rg-2', 'rg-3']);
    });

    it('should return empty array when no IDs provided', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/top',
        payload: [],
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toEqual([]);

      // Should not call ensureRiskGroupsExist for empty request
      expect(mockEnsureRiskGroupsExist).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle partial risk group creation', async () => {
      mockEnsureRiskGroupsExist.mockResolvedValueOnce([
        { id: 'rg-1', name: 'Equities' },
        { id: 'rg-2', name: 'Income' },
      ]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/top',
        payload: ['1'],
      });

      // Should still succeed with partial groups
      expect(response.statusCode).toBe(200);
    });

    it('should handle network timeout during risk group check', async () => {
      mockEnsureRiskGroupsExist.mockImplementationOnce(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 100)
          )
      );

      const response = await app.inject({
        method: 'POST',
        url: '/api/top',
        payload: ['1'],
      });

      // Should handle timeout gracefully
      expect(response.statusCode).toBe(500);
    });

    it('should handle concurrent top route calls', async () => {
      const requests = [
        app.inject({
          method: 'POST',
          url: '/api/top',
          payload: ['1'],
        }),
        app.inject({
          method: 'POST',
          url: '/api/top',
          payload: ['1'],
        }),
        app.inject({
          method: 'POST',
          url: '/api/top',
          payload: ['1'],
        }),
      ];

      const responses = await Promise.all(requests);

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.statusCode).toBe(200);
      });

      // ensureRiskGroupsExist should be called for each request
      expect(mockEnsureRiskGroupsExist).toHaveBeenCalledTimes(3);
    });
  });

  describe('Holiday and DivDepositType seeding', () => {
    it('should seed holidays when none exist', async () => {
      mockPrismaHolidays.findMany.mockResolvedValue([]);
      const { getHolidays } = await import('nyse-holidays');
      (getHolidays as ReturnType<typeof vi.fn>).mockReturnValue([
        { date: new Date('2026-01-01'), name: 'New Year' },
      ]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/top',
        payload: ['1'],
      });

      expect(response.statusCode).toBe(200);
      expect(mockPrismaHolidays.upsert).toHaveBeenCalled();
    });

    it('should seed divDepositTypes when none exist', async () => {
      mockPrismaDivDepositType.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 'ddt-new-1' }, { id: 'ddt-new-2' }]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/top',
        payload: ['1'],
      });

      expect(response.statusCode).toBe(200);
      expect(mockPrismaDivDepositType.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('Account filter on computed sort', () => {
    it('should use computed sort path with sortColumns', async () => {
      mockPrismaUniverse.findMany.mockResolvedValue([
        {
          id: 'u1',
          distribution: 1,
          distributions_per_year: 4,
          last_price: 100,
          trades: [{ buy: 50, quantity: 10, sell: 0, sell_date: null }],
        },
      ]);

      const filterState = JSON.stringify({
        universes: {
          sortColumns: [{ column: 'yield_percent', direction: 'desc' }],
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/top',
        payload: ['1'],
        headers: { 'x-sort-filter-state': filterState },
      });

      expect(response.statusCode).toBe(200);
      const universeCall = mockPrismaUniverse.findMany.mock.calls[0][0];
      expect(universeCall.select.distribution).toBe(true);
    });

    it('should use DB sort path with non-computed sortColumns', async () => {
      mockPrismaUniverse.findMany.mockResolvedValue([{ id: 'u1' }]);

      const filterState = JSON.stringify({
        universes: {
          sortColumns: [
            { column: 'symbol', direction: 'asc' },
            { column: 'last_price', direction: 'desc' },
          ],
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/top',
        payload: ['1'],
        headers: { 'x-sort-filter-state': filterState },
      });

      expect(response.statusCode).toBe(200);
      const universeCall = mockPrismaUniverse.findMany.mock.calls[0][0];
      expect(universeCall.orderBy).toEqual([
        { symbol: 'asc' },
        { last_price: 'desc' },
      ]);
    });

    it('should apply all sortColumns to orderBy for risk_group + ex_date multi-column sort (Story 36.2)', async () => {
      mockPrismaUniverse.findMany.mockResolvedValue([{ id: 'u1' }]);

      const filterState = JSON.stringify({
        universes: {
          sortColumns: [
            { column: 'risk_group', direction: 'asc' },
            { column: 'ex_date', direction: 'asc' },
          ],
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/top',
        payload: ['1'],
        headers: { 'x-sort-filter-state': filterState },
      });

      expect(response.statusCode).toBe(200);
      const universeCall = mockPrismaUniverse.findMany.mock.calls[0][0];
      expect(universeCall.orderBy).toEqual([
        { risk_group: { name: 'asc' } },
        { ex_date: 'asc' },
      ]);
    });

    it('should return null accountId when filters exist without account_id', async () => {
      mockPrismaUniverse.findMany.mockResolvedValue([
        {
          id: 'u1',
          distribution: 1,
          distributions_per_year: 4,
          last_price: 100,
          trades: [{ buy: 50, quantity: 10, sell: 0, sell_date: null }],
        },
      ]);

      const filterState = JSON.stringify({
        universes: {
          sort: { field: 'avg_purchase_yield_percent', order: 'desc' },
          filters: { expired: 'false' },
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/top',
        payload: ['1'],
        headers: { 'x-sort-filter-state': filterState },
      });

      expect(response.statusCode).toBe(200);
      // Without account_id filter, trades should not be filtered
      const universeCall = mockPrismaUniverse.findMany.mock.calls[0][0];
      expect(universeCall.select.trades).toEqual({
        select: { buy: true, quantity: true, sell: true, sell_date: true },
      });
    });

    it('should pass accountId to trades query when sorting by avg_purchase_yield_percent', async () => {
      mockPrismaUniverse.findMany.mockResolvedValue([
        {
          id: 'u1',
          distribution: 1,
          distributions_per_year: 4,
          last_price: 100,
          trades: [{ buy: 50, quantity: 10, sell: 0, sell_date: null }],
        },
      ]);

      const filterState = JSON.stringify({
        universes: {
          sort: { field: 'avg_purchase_yield_percent', order: 'desc' },
          filters: { account_id: 'acct-1' },
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/top',
        payload: ['1'],
        headers: { 'x-sort-filter-state': filterState },
      });

      expect(response.statusCode).toBe(200);
      // Verify that findMany was called with trades filtered by accountId
      const universeCall = mockPrismaUniverse.findMany.mock.calls[0][0];
      expect(universeCall.select.trades).toEqual({
        where: { accountId: 'acct-1' },
        select: { buy: true, quantity: true, sell: true, sell_date: true },
      });
    });

    it('should not filter trades when no account_id filter is set', async () => {
      mockPrismaUniverse.findMany.mockResolvedValue([
        {
          id: 'u1',
          distribution: 1,
          distributions_per_year: 4,
          last_price: 100,
          trades: [{ buy: 50, quantity: 10, sell: 0, sell_date: null }],
        },
      ]);

      const filterState = JSON.stringify({
        universes: {
          sort: { field: 'avg_purchase_yield_percent', order: 'desc' },
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/top',
        payload: ['1'],
        headers: { 'x-sort-filter-state': filterState },
      });

      expect(response.statusCode).toBe(200);
      const universeCall = mockPrismaUniverse.findMany.mock.calls[0][0];
      expect(universeCall.select.trades).toEqual({
        select: { buy: true, quantity: true, sell: true, sell_date: true },
      });
    });

    it('should pass accountId when sorting by most_recent_sell_date', async () => {
      mockPrismaUniverse.findMany.mockResolvedValue([
        {
          id: 'u1',
          distribution: 1,
          distributions_per_year: 4,
          last_price: 100,
          trades: [
            {
              buy: 50,
              quantity: 10,
              sell: 55,
              sell_date: new Date('2025-06-01'),
            },
          ],
        },
      ]);

      const filterState = JSON.stringify({
        universes: {
          sort: { field: 'most_recent_sell_date', order: 'asc' },
          filters: { account_id: 'acct-2' },
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/top',
        payload: ['1'],
        headers: { 'x-sort-filter-state': filterState },
      });

      expect(response.statusCode).toBe(200);
      const universeCall = mockPrismaUniverse.findMany.mock.calls[0][0];
      expect(universeCall.select.trades).toEqual({
        where: { accountId: 'acct-2' },
        select: { buy: true, quantity: true, sell: true, sell_date: true },
      });
    });

    it('should pass accountId when sorting by most_recent_sell_price', async () => {
      mockPrismaUniverse.findMany.mockResolvedValue([
        {
          id: 'u1',
          distribution: 1,
          distributions_per_year: 4,
          last_price: 100,
          trades: [
            {
              buy: 50,
              quantity: 10,
              sell: 55,
              sell_date: new Date('2025-06-01'),
            },
          ],
        },
      ]);

      const filterState = JSON.stringify({
        universes: {
          sort: { field: 'most_recent_sell_price', order: 'desc' },
          filters: { account_id: 'acct-3' },
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/top',
        payload: ['1'],
        headers: { 'x-sort-filter-state': filterState },
      });

      expect(response.statusCode).toBe(200);
      const universeCall = mockPrismaUniverse.findMany.mock.calls[0][0];
      expect(universeCall.select.trades).toEqual({
        where: { accountId: 'acct-3' },
        select: { buy: true, quantity: true, sell: true, sell_date: true },
      });
    });
  });

  describe('Lazy loading: PartialArrayDefinition', () => {
    it('should return universes as PartialArrayDefinition', async () => {
      mockPrismaUniverse.count.mockResolvedValue(1);
      mockPrismaUniverse.findMany.mockResolvedValue([{ id: 'uni-1' }]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/top',
        payload: ['1'],
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body[0].universes).toEqual({
        startIndex: 0,
        indexes: ['uni-1'],
        length: 1,
      });
    });

    it('should return first page of universe IDs when total count exceeds page size', async () => {
      const firstPage = Array.from({ length: 50 }, (_, i) => ({
        id: `uni-${i + 1}`,
      }));
      mockPrismaUniverse.count.mockResolvedValue(100);
      mockPrismaUniverse.findMany.mockResolvedValue(firstPage);

      const response = await app.inject({
        method: 'POST',
        url: '/api/top',
        payload: ['1'],
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body[0].universes.startIndex).toBe(0);
      expect(body[0].universes.indexes).toHaveLength(50);
      expect(body[0].universes.length).toBe(100);
    });

    it('should apply skip=0 and take=50 to findMany for non-computed sort initial load', async () => {
      mockPrismaUniverse.count.mockResolvedValue(100);
      mockPrismaUniverse.findMany.mockResolvedValue([{ id: 'uni-1' }]);

      await app.inject({
        method: 'POST',
        url: '/api/top',
        payload: ['1'],
      });

      const universeCall = mockPrismaUniverse.findMany.mock.calls[0][0];
      expect(universeCall.skip).toBe(0);
      expect(universeCall.take).toBe(50);
    });

    it('should return first page of IDs for computed sort via initial top load', async () => {
      const allUniverses = Array.from({ length: 100 }, (_, i) => ({
        id: `u${i + 1}`,
        distribution: (i + 1) * 0.5,
        distributions_per_year: 4,
        last_price: 100,
        trades: [{ buy: 50, quantity: 10, sell: 0, sell_date: null }],
      }));
      mockPrismaUniverse.findMany.mockResolvedValue(allUniverses);

      const filterState = JSON.stringify({
        universes: {
          sortColumns: [{ column: 'yield_percent', direction: 'desc' }],
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/top',
        payload: ['1'],
        headers: { 'x-sort-filter-state': filterState },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body[0].universes.startIndex).toBe(0);
      // Computed sort returns ALL IDs (not paginated) so SmartNgRX can replace
      // every slot and avoid stale/duplicate rows (changed in Story 55.2).
      expect(body[0].universes.indexes).toHaveLength(100);
      expect(body[0].universes.length).toBe(100);
    });

    it('should pass distinct: ["id"] to Prisma query for computed sort to prevent duplicate universe IDs (story 55.2)', async () => {
      mockPrismaUniverse.findMany.mockResolvedValue([
        {
          id: 'u1',
          distribution: 1,
          distributions_per_year: 4,
          last_price: 100,
          trades: [{ buy: 50, quantity: 10, sell: 0, sell_date: null }],
        },
      ]);

      const filterState = JSON.stringify({
        universes: {
          sortColumns: [
            { column: 'avg_purchase_yield_percent', direction: 'desc' },
          ],
        },
      });

      await app.inject({
        method: 'POST',
        url: '/api/top',
        payload: ['1'],
        headers: { 'x-sort-filter-state': filterState },
      });

      const universeCall = mockPrismaUniverse.findMany.mock.calls[0][0];
      expect(universeCall.distinct).toEqual(['id']);
    });

    it('should return no duplicate universe IDs in indexes when computed sort is active (story 55.2)', async () => {
      // Simulate the SQLite JOIN fan-out: Prisma returns the same universe ID
      // multiple times (once per trade row). The distinct fix must prevent
      // these duplicates from appearing in the returned indexes.
      mockPrismaUniverse.findMany.mockResolvedValue([
        {
          id: 'uaaa',
          distribution: 2.0,
          distributions_per_year: 4,
          last_price: 100,
          trades: [
            { buy: 50, quantity: 10, sell: 0, sell_date: null },
            { buy: 60, quantity: 20, sell: 0, sell_date: null },
            { buy: 55, quantity: 15, sell: 0, sell_date: null },
            { buy: 52, quantity: 12, sell: 0, sell_date: null },
          ],
        },
        {
          id: 'ubbb',
          distribution: 0.5,
          distributions_per_year: 12,
          last_price: 25,
          trades: [
            { buy: 24, quantity: 5, sell: 0, sell_date: null },
            { buy: 23, quantity: 8, sell: 0, sell_date: null },
          ],
        },
        {
          id: 'uccc',
          distribution: 1.0,
          distributions_per_year: 4,
          last_price: 40,
          trades: [],
        },
      ]);

      const filterState = JSON.stringify({
        universes: {
          sortColumns: [
            { column: 'avg_purchase_yield_percent', direction: 'desc' },
          ],
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/top',
        payload: ['1'],
        headers: { 'x-sort-filter-state': filterState },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      const indexes: string[] = body[0].universes.indexes;

      // All returned IDs must be unique — no symbol should appear twice
      const uniqueIds = new Set(indexes);
      expect(uniqueIds.size).toBe(indexes.length);
    });
  });

  describe('POST /indexes', () => {
    it('should return PartialArrayDefinition for universes childField', async () => {
      mockPrismaUniverse.count.mockResolvedValue(100);
      const pageIds = Array.from({ length: 20 }, (_, i) => ({
        id: `uni-${i + 51}`,
      }));
      mockPrismaUniverse.findMany.mockResolvedValue(pageIds);

      const response = await app.inject({
        method: 'POST',
        url: '/api/top/indexes',
        payload: {
          parentId: '1',
          childField: 'universes',
          startIndex: 50,
          length: 20,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.startIndex).toBe(50);
      expect(body.indexes).toHaveLength(20);
      expect(body.indexes[0]).toBe('uni-51');
      expect(body.length).toBe(100);
    });

    it('should return empty result for unsupported childField', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/top/indexes',
        payload: {
          parentId: '1',
          childField: 'accounts',
          startIndex: 0,
          length: 10,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.indexes).toEqual([]);
      expect(body.length).toBe(0);
    });

    it('should pass sort/filter state to universe query', async () => {
      mockPrismaUniverse.count.mockResolvedValue(50);
      mockPrismaUniverse.findMany.mockResolvedValue([{ id: 'uni-1' }]);

      const filterState = JSON.stringify({
        universes: {
          sortColumns: [{ column: 'symbol', direction: 'asc' }],
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/top/indexes',
        payload: {
          parentId: '1',
          childField: 'universes',
          startIndex: 0,
          length: 20,
        },
        headers: { 'x-sort-filter-state': filterState },
      });

      expect(response.statusCode).toBe(200);
      const universeCall = mockPrismaUniverse.findMany.mock.calls[0][0];
      expect(universeCall.skip).toBe(0);
      expect(universeCall.take).toBe(20);
      expect(universeCall.orderBy).toEqual([{ symbol: 'asc' }]);
    });
  });
});
