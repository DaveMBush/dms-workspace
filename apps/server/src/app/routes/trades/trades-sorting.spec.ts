import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fastify, { FastifyInstance } from 'fastify';

import registerTradeRoutes from './index';

// Hoisted mocks
const { mockPrismaTrades } = vi.hoisted(function hoistMocks() {
  return {
    mockPrismaTrades: {
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
  };
});

vi.mock('../../prisma/prisma-client', function mockPrismaClient() {
  return {
    prisma: {
      trades: mockPrismaTrades,
    },
  };
});

interface OpenTradeRow {
  id: string;
  universeId: string;
  accountId: string;
  buy: number;
  sell: number;
  buy_date: Date;
  sell_date: Date | null;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface ClosedTradeRow {
  id: string;
  universeId: string;
  accountId: string;
  buy: number;
  sell: number;
  buy_date: Date;
  sell_date: Date;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface OpenTradeResponse {
  id: string;
  universeId: string;
  accountId: string;
  symbol: string;
  buy: number;
  quantity: number;
  buy_date: string;
  currentValue: number;
  unrealizedGain: number;
}

interface ClosedTradeResponse {
  id: string;
  universeId: string;
  accountId: string;
  symbol: string;
  buy: number;
  sell: number;
  quantity: number;
  buy_date: string;
  sell_date: string;
  profit: number;
  percentGain: number;
}

interface ErrorResponse {
  error: string;
}

function makeOpenTrade(overrides: Partial<OpenTradeRow> = {}): OpenTradeRow {
  return {
    id: 'ot1',
    universeId: 'u1',
    accountId: 'a1',
    buy: 50.0,
    sell: 0,
    buy_date: new Date('2024-01-15'),
    sell_date: null,
    quantity: 100,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    deletedAt: null,
    ...overrides,
  };
}

function makeClosedTrade(
  overrides: Partial<ClosedTradeRow> = {}
): ClosedTradeRow {
  return {
    id: 'ct1',
    universeId: 'u1',
    accountId: 'a1',
    buy: 50.0,
    sell: 75.0,
    buy_date: new Date('2024-01-15'),
    sell_date: new Date('2024-06-15'),
    quantity: 100,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-06-15'),
    deletedAt: null,
    ...overrides,
  };
}

function makeOpenTradesSeedData(): OpenTradeRow[] {
  return [
    makeOpenTrade({
      id: 'ot1',
      universeId: 'u-aapl',
      buy: 150.0,
      buy_date: new Date('2024-03-10'),
      quantity: 50,
    }),
    makeOpenTrade({
      id: 'ot2',
      universeId: 'u-msft',
      buy: 380.0,
      buy_date: new Date('2024-01-05'),
      quantity: 25,
    }),
    makeOpenTrade({
      id: 'ot3',
      universeId: 'u-goog',
      buy: 140.0,
      buy_date: new Date('2024-06-20'),
      quantity: 75,
    }),
    makeOpenTrade({
      id: 'ot4',
      universeId: 'u-amzn',
      buy: 178.0,
      buy_date: new Date('2024-02-14'),
      quantity: 40,
    }),
  ];
}

function makeClosedTradesSeedData(): ClosedTradeRow[] {
  return [
    makeClosedTrade({
      id: 'ct1',
      universeId: 'u-aapl',
      buy: 120.0,
      sell: 155.0,
      buy_date: new Date('2023-06-01'),
      sell_date: new Date('2024-01-15'),
      quantity: 60,
    }),
    makeClosedTrade({
      id: 'ct2',
      universeId: 'u-tsla',
      buy: 200.0,
      sell: 180.0,
      buy_date: new Date('2023-09-15'),
      sell_date: new Date('2024-03-20'),
      quantity: 30,
    }),
    makeClosedTrade({
      id: 'ct3',
      universeId: 'u-nvda',
      buy: 450.0,
      sell: 800.0,
      buy_date: new Date('2023-03-01'),
      sell_date: new Date('2024-06-10'),
      quantity: 20,
    }),
    makeClosedTrade({
      id: 'ct4',
      universeId: 'u-meta',
      buy: 300.0,
      sell: 500.0,
      buy_date: new Date('2023-12-01'),
      sell_date: new Date('2024-02-28'),
      quantity: 45,
    }),
  ];
}

// Symbol lookup for test data (simulates universe join)
const symbolMap: Record<string, string> = {
  'u-aapl': 'AAPL',
  'u-msft': 'MSFT',
  'u-goog': 'GOOG',
  'u-amzn': 'AMZN',
  'u-tsla': 'TSLA',
  'u-nvda': 'NVDA',
  'u-meta': 'META',
};

// Current prices for unrealized gain calculations
const currentPriceMap: Record<string, number> = {
  'u-aapl': 195.0,
  'u-msft': 420.0,
  'u-goog': 175.0,
  'u-amzn': 185.0,
};

function getSymbol(universeId: string): string {
  return symbolMap[universeId] ?? 'UNKNOWN';
}

function getCurrentPrice(universeId: string): number {
  return currentPriceMap[universeId] ?? 0;
}

function calculateUnrealizedGain(trade: OpenTradeRow): number {
  const currentPrice = getCurrentPrice(trade.universeId);
  return (currentPrice - trade.buy) * trade.quantity;
}

function calculateCurrentValue(trade: OpenTradeRow): number {
  return getCurrentPrice(trade.universeId) * trade.quantity;
}

function calculateProfit(trade: ClosedTradeRow): number {
  return (trade.sell - trade.buy) * trade.quantity;
}

function calculatePercentGain(trade: ClosedTradeRow): number {
  return ((trade.sell - trade.buy) / trade.buy) * 100;
}

describe.skip('Open Trades Endpoint - Sorting', function openTradesSortingTests() {
  let app: FastifyInstance;

  beforeEach(async function setupApp() {
    app = fastify({ logger: false });
    await app.register(registerTradeRoutes, { prefix: '/api/trades' });
    await app.ready();
    mockPrismaTrades.findMany.mockReset();
  });

  afterEach(async function teardownApp() {
    await app.close();
  });

  describe('GET /api/trades/open - basic response', function openTradesBasicTests() {
    it('should return only open trades (sell_date is null)', async function returnOnlyOpenTrades() {
      const openTrades = makeOpenTradesSeedData();
      mockPrismaTrades.findMany.mockResolvedValue(openTrades);

      const response = await app.inject({
        method: 'GET',
        url: '/api/trades/open',
      });

      expect(response.statusCode).toBe(200);
      const rows = JSON.parse(response.body) as unknown as OpenTradeResponse[];
      expect(rows.length).toBe(4);
      for (const row of rows) {
        expect(row).toHaveProperty('buy');
        expect(row).toHaveProperty('buy_date');
        expect(row).not.toHaveProperty('sell_date');
      }
    });
  });

  describe('GET /api/trades/open - sort by symbol', function openTradesSymbolSortTests() {
    it('should sort by symbol ascending', async function sortSymbolAsc() {
      mockPrismaTrades.findMany.mockResolvedValue(makeOpenTradesSeedData());

      const response = await app.inject({
        method: 'GET',
        url: '/api/trades/open?sortBy=symbol&sortOrder=asc',
      });

      expect(response.statusCode).toBe(200);
      const rows = JSON.parse(response.body) as unknown as OpenTradeResponse[];
      const symbols = rows.map(function extractSymbol(r) {
        return r.symbol;
      });
      // AAPL < AMZN < GOOG < MSFT
      expect(symbols).toEqual(['AAPL', 'AMZN', 'GOOG', 'MSFT']);
    });

    it('should sort by symbol descending', async function sortSymbolDesc() {
      mockPrismaTrades.findMany.mockResolvedValue(makeOpenTradesSeedData());

      const response = await app.inject({
        method: 'GET',
        url: '/api/trades/open?sortBy=symbol&sortOrder=desc',
      });

      expect(response.statusCode).toBe(200);
      const rows = JSON.parse(response.body) as unknown as OpenTradeResponse[];
      const symbols = rows.map(function extractSymbol(r) {
        return r.symbol;
      });
      expect(symbols).toEqual(['MSFT', 'GOOG', 'AMZN', 'AAPL']);
    });
  });

  describe('GET /api/trades/open - sort by openDate', function openTradesDateSortTests() {
    it('should sort by openDate ascending', async function sortOpenDateAsc() {
      mockPrismaTrades.findMany.mockResolvedValue(makeOpenTradesSeedData());

      const response = await app.inject({
        method: 'GET',
        url: '/api/trades/open?sortBy=openDate&sortOrder=asc',
      });

      expect(response.statusCode).toBe(200);
      const rows = JSON.parse(response.body) as unknown as OpenTradeResponse[];
      const dates = rows.map(function extractDate(r) {
        return r.buy_date;
      });
      // 2024-01-05 < 2024-02-14 < 2024-03-10 < 2024-06-20
      expect(dates).toEqual([
        new Date('2024-01-05').toISOString(),
        new Date('2024-02-14').toISOString(),
        new Date('2024-03-10').toISOString(),
        new Date('2024-06-20').toISOString(),
      ]);
    });

    it('should sort by openDate descending', async function sortOpenDateDesc() {
      mockPrismaTrades.findMany.mockResolvedValue(makeOpenTradesSeedData());

      const response = await app.inject({
        method: 'GET',
        url: '/api/trades/open?sortBy=openDate&sortOrder=desc',
      });

      expect(response.statusCode).toBe(200);
      const rows = JSON.parse(response.body) as unknown as OpenTradeResponse[];
      const dates = rows.map(function extractDate(r) {
        return r.buy_date;
      });
      expect(dates).toEqual([
        new Date('2024-06-20').toISOString(),
        new Date('2024-03-10').toISOString(),
        new Date('2024-02-14').toISOString(),
        new Date('2024-01-05').toISOString(),
      ]);
    });
  });

  describe('GET /api/trades/open - sort by currentValue', function openTradesCurrentValueSortTests() {
    it('should sort by currentValue ascending', async function sortCurrentValueAsc() {
      mockPrismaTrades.findMany.mockResolvedValue(makeOpenTradesSeedData());

      const response = await app.inject({
        method: 'GET',
        url: '/api/trades/open?sortBy=currentValue&sortOrder=asc',
      });

      expect(response.statusCode).toBe(200);
      const rows = JSON.parse(response.body) as unknown as OpenTradeResponse[];
      const values = rows.map(function extractValue(r) {
        return r.currentValue;
      });
      // AMZN: 185*40=7400, AAPL: 195*50=9750, MSFT: 420*25=10500, GOOG: 175*75=13125
      expect(values).toEqual([7400, 9750, 10500, 13125]);
    });

    it('should sort by currentValue descending', async function sortCurrentValueDesc() {
      mockPrismaTrades.findMany.mockResolvedValue(makeOpenTradesSeedData());

      const response = await app.inject({
        method: 'GET',
        url: '/api/trades/open?sortBy=currentValue&sortOrder=desc',
      });

      expect(response.statusCode).toBe(200);
      const rows = JSON.parse(response.body) as unknown as OpenTradeResponse[];
      const values = rows.map(function extractValue(r) {
        return r.currentValue;
      });
      expect(values).toEqual([13125, 10500, 9750, 7400]);
    });
  });

  describe('GET /api/trades/open - sort by unrealizedGain', function openTradesGainSortTests() {
    it('should sort by unrealizedGain ascending', async function sortUnrealizedGainAsc() {
      const seedData = makeOpenTradesSeedData();
      mockPrismaTrades.findMany.mockResolvedValue(seedData);

      const response = await app.inject({
        method: 'GET',
        url: '/api/trades/open?sortBy=unrealizedGain&sortOrder=asc',
      });

      expect(response.statusCode).toBe(200);
      const rows = JSON.parse(response.body) as unknown as OpenTradeResponse[];
      const gains = rows.map(function extractGain(r) {
        return r.unrealizedGain;
      });
      // MSFT: (420-380)*25=1000, AAPL: (195-150)*50=2250, GOOG: (175-140)*75=2625, AMZN: (185-178)*40=280
      // Ascending: 280, 1000, 2250, 2625
      expect(gains).toEqual([280, 1000, 2250, 2625]);
    });

    it('should sort by unrealizedGain descending', async function sortUnrealizedGainDesc() {
      const seedData = makeOpenTradesSeedData();
      mockPrismaTrades.findMany.mockResolvedValue(seedData);

      const response = await app.inject({
        method: 'GET',
        url: '/api/trades/open?sortBy=unrealizedGain&sortOrder=desc',
      });

      expect(response.statusCode).toBe(200);
      const rows = JSON.parse(response.body) as unknown as OpenTradeResponse[];
      const gains = rows.map(function extractGain(r) {
        return r.unrealizedGain;
      });
      expect(gains).toEqual([2625, 2250, 1000, 280]);
    });
  });

  describe('GET /api/trades/open - default sorting', function openTradesDefaultSortTests() {
    it('should apply default sorting when no sort parameter provided', async function defaultSort() {
      mockPrismaTrades.findMany.mockResolvedValue(makeOpenTradesSeedData());

      const response = await app.inject({
        method: 'GET',
        url: '/api/trades/open',
      });

      expect(response.statusCode).toBe(200);
      const rows = JSON.parse(response.body) as unknown as OpenTradeResponse[];
      expect(rows.length).toBe(4);
      // Default sort should be by symbol ascending
      const symbols = rows.map(function extractSymbol(r) {
        return r.symbol;
      });
      expect(symbols).toEqual(['AAPL', 'AMZN', 'GOOG', 'MSFT']);
    });
  });

  describe('GET /api/trades/open - invalid sort field', function openTradesInvalidSortTests() {
    it('should return 400 for invalid sort field', async function invalidSortField() {
      mockPrismaTrades.findMany.mockResolvedValue(makeOpenTradesSeedData());

      const response = await app.inject({
        method: 'GET',
        url: '/api/trades/open?sortBy=nonexistent&sortOrder=asc',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as unknown as ErrorResponse;
      expect(body.error).toBeDefined();
    });

    it('should return 400 for empty sortBy with sortOrder', async function emptySortByWithOrder() {
      const response = await app.inject({
        method: 'GET',
        url: '/api/trades/open?sortBy=&sortOrder=asc',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as unknown as ErrorResponse;
      expect(body.error).toBeDefined();
    });
  });
});

describe.skip('Closed Trades Endpoint - Sorting', function closedTradesSortingTests() {
  let app: FastifyInstance;

  beforeEach(async function setupApp() {
    app = fastify({ logger: false });
    await app.register(registerTradeRoutes, { prefix: '/api/trades' });
    await app.ready();
    mockPrismaTrades.findMany.mockReset();
  });

  afterEach(async function teardownApp() {
    await app.close();
  });

  describe('GET /api/trades/closed - basic response', function closedTradesBasicTests() {
    it('should return only closed trades (sell_date is not null)', async function returnOnlyClosedTrades() {
      const closedTrades = makeClosedTradesSeedData();
      mockPrismaTrades.findMany.mockResolvedValue(closedTrades);

      const response = await app.inject({
        method: 'GET',
        url: '/api/trades/closed',
      });

      expect(response.statusCode).toBe(200);
      const rows = JSON.parse(
        response.body
      ) as unknown as ClosedTradeResponse[];
      expect(rows.length).toBe(4);
      for (const row of rows) {
        expect(row).toHaveProperty('sell');
        expect(row).toHaveProperty('sell_date');
        expect(row).toHaveProperty('profit');
        expect(row).toHaveProperty('percentGain');
      }
    });
  });

  describe('GET /api/trades/closed - sort by symbol', function closedTradesSymbolSortTests() {
    it('should sort by symbol ascending', async function sortSymbolAsc() {
      mockPrismaTrades.findMany.mockResolvedValue(makeClosedTradesSeedData());

      const response = await app.inject({
        method: 'GET',
        url: '/api/trades/closed?sortBy=symbol&sortOrder=asc',
      });

      expect(response.statusCode).toBe(200);
      const rows = JSON.parse(
        response.body
      ) as unknown as ClosedTradeResponse[];
      const symbols = rows.map(function extractSymbol(r) {
        return r.symbol;
      });
      // AAPL < META < NVDA < TSLA
      expect(symbols).toEqual(['AAPL', 'META', 'NVDA', 'TSLA']);
    });

    it('should sort by symbol descending', async function sortSymbolDesc() {
      mockPrismaTrades.findMany.mockResolvedValue(makeClosedTradesSeedData());

      const response = await app.inject({
        method: 'GET',
        url: '/api/trades/closed?sortBy=symbol&sortOrder=desc',
      });

      expect(response.statusCode).toBe(200);
      const rows = JSON.parse(
        response.body
      ) as unknown as ClosedTradeResponse[];
      const symbols = rows.map(function extractSymbol(r) {
        return r.symbol;
      });
      expect(symbols).toEqual(['TSLA', 'NVDA', 'META', 'AAPL']);
    });
  });

  describe('GET /api/trades/closed - sort by closeDate', function closedTradesDateSortTests() {
    it('should sort by closeDate ascending', async function sortCloseDateAsc() {
      mockPrismaTrades.findMany.mockResolvedValue(makeClosedTradesSeedData());

      const response = await app.inject({
        method: 'GET',
        url: '/api/trades/closed?sortBy=closeDate&sortOrder=asc',
      });

      expect(response.statusCode).toBe(200);
      const rows = JSON.parse(
        response.body
      ) as unknown as ClosedTradeResponse[];
      const dates = rows.map(function extractDate(r) {
        return r.sell_date;
      });
      // 2024-01-15 < 2024-02-28 < 2024-03-20 < 2024-06-10
      expect(dates).toEqual([
        new Date('2024-01-15').toISOString(),
        new Date('2024-02-28').toISOString(),
        new Date('2024-03-20').toISOString(),
        new Date('2024-06-10').toISOString(),
      ]);
    });

    it('should sort by closeDate descending', async function sortCloseDateDesc() {
      mockPrismaTrades.findMany.mockResolvedValue(makeClosedTradesSeedData());

      const response = await app.inject({
        method: 'GET',
        url: '/api/trades/closed?sortBy=closeDate&sortOrder=desc',
      });

      expect(response.statusCode).toBe(200);
      const rows = JSON.parse(
        response.body
      ) as unknown as ClosedTradeResponse[];
      const dates = rows.map(function extractDate(r) {
        return r.sell_date;
      });
      expect(dates).toEqual([
        new Date('2024-06-10').toISOString(),
        new Date('2024-03-20').toISOString(),
        new Date('2024-02-28').toISOString(),
        new Date('2024-01-15').toISOString(),
      ]);
    });
  });

  describe('GET /api/trades/closed - sort by profit', function closedTradesProfitSortTests() {
    it('should sort by profit ascending', async function sortProfitAsc() {
      mockPrismaTrades.findMany.mockResolvedValue(makeClosedTradesSeedData());

      const response = await app.inject({
        method: 'GET',
        url: '/api/trades/closed?sortBy=profit&sortOrder=asc',
      });

      expect(response.statusCode).toBe(200);
      const rows = JSON.parse(
        response.body
      ) as unknown as ClosedTradeResponse[];
      const profits = rows.map(function extractProfit(r) {
        return r.profit;
      });
      // TSLA: (180-200)*30=-600, AAPL: (155-120)*60=2100, NVDA: (800-450)*20=7000, META: (500-300)*45=9000
      // Ascending: -600, 2100, 7000, 9000
      expect(profits).toEqual([-600, 2100, 7000, 9000]);
    });

    it('should sort by profit descending', async function sortProfitDesc() {
      mockPrismaTrades.findMany.mockResolvedValue(makeClosedTradesSeedData());

      const response = await app.inject({
        method: 'GET',
        url: '/api/trades/closed?sortBy=profit&sortOrder=desc',
      });

      expect(response.statusCode).toBe(200);
      const rows = JSON.parse(
        response.body
      ) as unknown as ClosedTradeResponse[];
      const profits = rows.map(function extractProfit(r) {
        return r.profit;
      });
      expect(profits).toEqual([9000, 7000, 2100, -600]);
    });
  });

  describe('GET /api/trades/closed - sort by percentGain', function closedTradesPercentGainSortTests() {
    it('should sort by percentGain ascending', async function sortPercentGainAsc() {
      mockPrismaTrades.findMany.mockResolvedValue(makeClosedTradesSeedData());

      const response = await app.inject({
        method: 'GET',
        url: '/api/trades/closed?sortBy=percentGain&sortOrder=asc',
      });

      expect(response.statusCode).toBe(200);
      const rows = JSON.parse(
        response.body
      ) as unknown as ClosedTradeResponse[];
      const percents = rows.map(function extractPercent(r) {
        return r.percentGain;
      });
      // TSLA: (180-200)/200*100=-10%, AAPL: (155-120)/120*100=29.17%, META: (500-300)/300*100=66.67%, NVDA: (800-450)/450*100=77.78%
      // Ascending: -10, 29.17, 66.67, 77.78
      expect(percents[0]).toBeCloseTo(-10, 1);
      expect(percents[1]).toBeCloseTo(29.17, 1);
      expect(percents[2]).toBeCloseTo(66.67, 1);
      expect(percents[3]).toBeCloseTo(77.78, 1);
    });

    it('should sort by percentGain descending', async function sortPercentGainDesc() {
      mockPrismaTrades.findMany.mockResolvedValue(makeClosedTradesSeedData());

      const response = await app.inject({
        method: 'GET',
        url: '/api/trades/closed?sortBy=percentGain&sortOrder=desc',
      });

      expect(response.statusCode).toBe(200);
      const rows = JSON.parse(
        response.body
      ) as unknown as ClosedTradeResponse[];
      const percents = rows.map(function extractPercent(r) {
        return r.percentGain;
      });
      expect(percents[0]).toBeCloseTo(77.78, 1);
      expect(percents[1]).toBeCloseTo(66.67, 1);
      expect(percents[2]).toBeCloseTo(29.17, 1);
      expect(percents[3]).toBeCloseTo(-10, 1);
    });
  });

  describe('GET /api/trades/closed - default sorting', function closedTradesDefaultSortTests() {
    it('should apply default sorting when no sort parameter provided', async function defaultSort() {
      mockPrismaTrades.findMany.mockResolvedValue(makeClosedTradesSeedData());

      const response = await app.inject({
        method: 'GET',
        url: '/api/trades/closed',
      });

      expect(response.statusCode).toBe(200);
      const rows = JSON.parse(
        response.body
      ) as unknown as ClosedTradeResponse[];
      expect(rows.length).toBe(4);
      // Default sort should be by symbol ascending
      const symbols = rows.map(function extractSymbol(r) {
        return r.symbol;
      });
      expect(symbols).toEqual(['AAPL', 'META', 'NVDA', 'TSLA']);
    });
  });

  describe('GET /api/trades/closed - invalid sort field', function closedTradesInvalidSortTests() {
    it('should return 400 for invalid sort field', async function invalidSortField() {
      mockPrismaTrades.findMany.mockResolvedValue(makeClosedTradesSeedData());

      const response = await app.inject({
        method: 'GET',
        url: '/api/trades/closed?sortBy=nonexistent&sortOrder=asc',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as unknown as ErrorResponse;
      expect(body.error).toBeDefined();
    });

    it('should return 400 for empty sortBy with sortOrder', async function emptySortByWithOrder() {
      const response = await app.inject({
        method: 'GET',
        url: '/api/trades/closed?sortBy=&sortOrder=asc',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as unknown as ErrorResponse;
      expect(body.error).toBeDefined();
    });
  });
});
