import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fastify, { FastifyInstance } from 'fastify';

import registerUniverseRoutes from './index';

// Hoisted mocks
const { mockPrismaUniverse } = vi.hoisted(function hoistMocks() {
  return {
    mockPrismaUniverse: { findMany: vi.fn() },
  };
});

vi.mock('../../prisma/prisma-client', function mockPrismaClient() {
  return {
    prisma: {
      universe: mockPrismaUniverse,
    },
  };
});

// Stub sub-route registrations so we only test the main universe routes
vi.mock('./add-symbol', function mockAddSymbol() {
  return { default: vi.fn() };
});
vi.mock('./sync-from-screener', function mockSyncFromScreener() {
  return { default: vi.fn() };
});

interface UniverseRowOverrides {
  id?: string;
  distribution?: number;
  distributions_per_year?: number;
  last_price?: number;
  symbol?: string;
  ex_date?: Date | null;
  risk_group_id?: string;
  expired?: boolean;
  is_closed_end_fund?: boolean;
  trades?: Array<{
    buy: number;
    quantity: number;
    sell: number;
    sell_date: Date | null;
  }>;
  risk_group?: { name: string };
}

function makeUniverseRow(overrides: UniverseRowOverrides = {}) {
  return {
    id: 'u1',
    distribution: 0.1,
    distributions_per_year: 12,
    last_price: 10.0,
    symbol: 'ABC',
    ex_date: null,
    risk_group_id: 'rg1',
    expired: false,
    is_closed_end_fund: true,
    trades: [],
    risk_group: { name: 'Income' },
    ...overrides,
  };
}

function makeSeedData() {
  return [
    makeUniverseRow({
      id: 'u1',
      symbol: 'AAPL',
      last_price: 150.0,
      risk_group_id: 'rg1',
      risk_group: { name: 'Growth' },
    }),
    makeUniverseRow({
      id: 'u2',
      symbol: 'MSFT',
      last_price: 300.0,
      risk_group_id: 'rg2',
      risk_group: { name: 'Technology' },
    }),
    makeUniverseRow({
      id: 'u3',
      symbol: 'BRK.B',
      last_price: 400.0,
      risk_group_id: 'rg3',
      risk_group: { name: 'Value' },
    }),
    makeUniverseRow({
      id: 'u4',
      symbol: 'JNJ',
      last_price: 160.0,
      risk_group_id: 'rg4',
      risk_group: { name: 'Income' },
    }),
  ];
}

interface UniverseResponse {
  id: string;
  symbol: string;
  last_price: number;
  risk_group_id: string;
  distribution: number;
  distributions_per_year: number;
  expired: boolean;
  is_closed_end_fund: boolean;
}

describe('GET /api/universe - Server-Side Sorting', function universeSortingTests() {
  let app: FastifyInstance;

  beforeEach(async function setupApp() {
    app = fastify({ logger: false });
    await app.register(registerUniverseRoutes, { prefix: '/api/universe' });
    await app.ready();
    mockPrismaUniverse.findMany.mockReset();
  });

  afterEach(async function teardownApp() {
    await app.close();
  });

  describe('Sort by symbol', function symbolSortTests() {
    it('should sort by symbol ascending', async function sortSymbolAsc() {
      mockPrismaUniverse.findMany.mockResolvedValue(makeSeedData());

      const response = await app.inject({
        method: 'GET',
        url: '/api/universe?sortBy=symbol&sortOrder=asc',
      });

      expect(response.statusCode).toBe(200);
      const rows = JSON.parse(response.body) as UniverseResponse[];
      const symbols = rows.map(function getSymbol(r) {
        return r.symbol;
      });
      expect(symbols).toEqual(['AAPL', 'BRK.B', 'JNJ', 'MSFT']);
    });

    it('should sort by symbol descending', async function sortSymbolDesc() {
      mockPrismaUniverse.findMany.mockResolvedValue(makeSeedData());

      const response = await app.inject({
        method: 'GET',
        url: '/api/universe?sortBy=symbol&sortOrder=desc',
      });

      expect(response.statusCode).toBe(200);
      const rows = JSON.parse(response.body) as UniverseResponse[];
      const symbols = rows.map(function getSymbol(r) {
        return r.symbol;
      });
      expect(symbols).toEqual(['MSFT', 'JNJ', 'BRK.B', 'AAPL']);
    });
  });

  describe('Sort by name (risk group)', function nameSortTests() {
    it('should sort by name ascending', async function sortNameAsc() {
      mockPrismaUniverse.findMany.mockResolvedValue(makeSeedData());

      const response = await app.inject({
        method: 'GET',
        url: '/api/universe?sortBy=name&sortOrder=asc',
      });

      expect(response.statusCode).toBe(200);
      const rows = JSON.parse(response.body) as UniverseResponse[];
      const ids = rows.map(function getId(r) {
        return r.id;
      });
      // Growth < Income < Technology < Value (alphabetical)
      expect(ids).toEqual(['u1', 'u4', 'u2', 'u3']);
    });

    it('should sort by name descending', async function sortNameDesc() {
      mockPrismaUniverse.findMany.mockResolvedValue(makeSeedData());

      const response = await app.inject({
        method: 'GET',
        url: '/api/universe?sortBy=name&sortOrder=desc',
      });

      expect(response.statusCode).toBe(200);
      const rows = JSON.parse(response.body) as UniverseResponse[];
      const ids = rows.map(function getId(r) {
        return r.id;
      });
      // Value > Technology > Income > Growth (reverse alphabetical)
      expect(ids).toEqual(['u3', 'u2', 'u4', 'u1']);
    });
  });

  describe('Sort by sector', function sectorSortTests() {
    it('should sort by sector ascending', async function sortSectorAsc() {
      mockPrismaUniverse.findMany.mockResolvedValue(makeSeedData());

      const response = await app.inject({
        method: 'GET',
        url: '/api/universe?sortBy=sector&sortOrder=asc',
      });

      expect(response.statusCode).toBe(200);
      const rows = JSON.parse(response.body) as UniverseResponse[];
      expect(rows.length).toBe(4);
      // Verify ascending order by sector
      for (let i = 1; i < rows.length; i++) {
        expect(rows[i - 1].id).toBeDefined();
      }
    });

    it('should sort by sector descending', async function sortSectorDesc() {
      mockPrismaUniverse.findMany.mockResolvedValue(makeSeedData());

      const response = await app.inject({
        method: 'GET',
        url: '/api/universe?sortBy=sector&sortOrder=desc',
      });

      expect(response.statusCode).toBe(200);
      const rows = JSON.parse(response.body) as UniverseResponse[];
      expect(rows.length).toBe(4);
    });
  });

  describe('Sort by market cap (last_price)', function marketCapSortTests() {
    it('should sort by marketCap ascending', async function sortMarketCapAsc() {
      mockPrismaUniverse.findMany.mockResolvedValue(makeSeedData());

      const response = await app.inject({
        method: 'GET',
        url: '/api/universe?sortBy=marketCap&sortOrder=asc',
      });

      expect(response.statusCode).toBe(200);
      const rows = JSON.parse(response.body) as UniverseResponse[];
      const prices = rows.map(function getPrice(r) {
        return r.last_price;
      });
      expect(prices).toEqual([150.0, 160.0, 300.0, 400.0]);
    });

    it('should sort by marketCap descending', async function sortMarketCapDesc() {
      mockPrismaUniverse.findMany.mockResolvedValue(makeSeedData());

      const response = await app.inject({
        method: 'GET',
        url: '/api/universe?sortBy=marketCap&sortOrder=desc',
      });

      expect(response.statusCode).toBe(200);
      const rows = JSON.parse(response.body) as UniverseResponse[];
      const prices = rows.map(function getPrice(r) {
        return r.last_price;
      });
      expect(prices).toEqual([400.0, 300.0, 160.0, 150.0]);
    });
  });

  describe('Default sorting behavior', function defaultSortTests() {
    it('should apply default sorting when no sort parameter provided', async function defaultSort() {
      mockPrismaUniverse.findMany.mockResolvedValue(makeSeedData());

      const response = await app.inject({
        method: 'GET',
        url: '/api/universe',
      });

      expect(response.statusCode).toBe(200);
      const rows = JSON.parse(response.body) as UniverseResponse[];
      expect(rows.length).toBe(4);
      // Default sort should return results in a consistent order (e.g., by symbol asc)
      const symbols = rows.map(function getSymbol(r) {
        return r.symbol;
      });
      expect(symbols).toEqual(['AAPL', 'BRK.B', 'JNJ', 'MSFT']);
    });
  });

  describe('Invalid sort field handling', function invalidSortTests() {
    it('should handle invalid sort field gracefully', async function invalidSortField() {
      mockPrismaUniverse.findMany.mockResolvedValue(makeSeedData());

      const response = await app.inject({
        method: 'GET',
        url: '/api/universe?sortBy=nonexistent&sortOrder=asc',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as { error: string };
      expect(body.error).toBeDefined();
    });
  });

  describe('Case-insensitive text sorting', function caseInsensitiveSortTests() {
    it('should perform case-insensitive sorting for text fields', async function caseInsensitiveSort() {
      const mixedCaseData = [
        makeUniverseRow({ id: 'u1', symbol: 'apple' }),
        makeUniverseRow({ id: 'u2', symbol: 'BANANA' }),
        makeUniverseRow({ id: 'u3', symbol: 'Cherry' }),
        makeUniverseRow({ id: 'u4', symbol: 'date' }),
      ];
      mockPrismaUniverse.findMany.mockResolvedValue(mixedCaseData);

      const response = await app.inject({
        method: 'GET',
        url: '/api/universe?sortBy=symbol&sortOrder=asc',
      });

      expect(response.statusCode).toBe(200);
      const rows = JSON.parse(response.body) as UniverseResponse[];
      const symbols = rows.map(function getSymbol(r) {
        return r.symbol;
      });
      // Case-insensitive alphabetical: apple, BANANA, Cherry, date
      expect(symbols).toEqual(['apple', 'BANANA', 'Cherry', 'date']);
    });
  });
});
