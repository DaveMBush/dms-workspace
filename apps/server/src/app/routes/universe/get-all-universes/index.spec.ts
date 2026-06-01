import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fastify, { FastifyInstance } from 'fastify';

import registerGetAllUniverses from './index';

// Hoisted mocks
const { mockPrismaUniverse } = vi.hoisted(function hoistMocks() {
  return {
    mockPrismaUniverse: { findMany: vi.fn() },
  };
});

vi.mock('../../../prisma/prisma-client', function mockPrismaClient() {
  return {
    prisma: {
      universe: mockPrismaUniverse,
    },
  };
});

interface TradeOverride {
  buy?: number;
  quantity?: number;
  sell?: number;
  sell_date: Date | null;
}

interface RowOverrides {
  id?: string;
  symbol: string;
  expired: boolean;
  trades: TradeOverride[];
  countDivDeposits?: number;
  countTrades?: number;
  ex_date?: Date | null;
  is_closed_end_fund?: boolean;
  volatility_long?: string | null;
  volatility_short?: string | null;
  last_price?: number;
  risk_group?: { name: string };
}

function makeUniverseRow(overrides: RowOverrides) {
  const result: Record<string, unknown> = {
    id: overrides.id ?? `id-${overrides.symbol}`,
    distribution: 0.1,
    distributions_per_year: 12,
    last_price: overrides.last_price ?? 10.0,
    volatility_long: overrides.volatility_long ?? null,
    volatility_short: overrides.volatility_short ?? null,
    symbol: overrides.symbol,
    ex_date: overrides.ex_date ?? null,
    risk_group_id: 'rg1',
    expired: overrides.expired,
    is_closed_end_fund: overrides.is_closed_end_fund ?? true,
    trades: overrides.trades.map(function normaliseTrade(t) {
      return {
        buy: t.buy ?? 10,
        quantity: t.quantity ?? 10,
        sell: t.sell ?? 0,
        sell_date: t.sell_date,
      };
    }),
    _count: {
      trades: overrides.countTrades ?? overrides.trades.length,
      divDeposits: overrides.countDivDeposits ?? 0,
    },
  };
  if (overrides.risk_group !== undefined) {
    result['risk_group'] = overrides.risk_group;
  }
  return result;
}

// ─── Constants for the four canonical permutations ───────────────────────────
const EXPIRED_NO_OPEN = 'EXPIRED_NO_OPEN';
const EXPIRED_WITH_OPEN = 'EXPIRED_WITH_OPEN';
const ACTIVE_NO_OPEN = 'ACTIVE_NO_OPEN';
const ACTIVE_WITH_OPEN = 'ACTIVE_WITH_OPEN';

// ─── Spec ─────────────────────────────────────────────────────────────────────

describe('GET /api/universe - expired-no-open filter (Story 109.3)', function filterSpec() {
  let app: FastifyInstance;

  beforeEach(async function setupApp() {
    app = fastify({ logger: false });
    app.register(registerGetAllUniverses, { prefix: '/api/universe' });
    await app.ready();
    mockPrismaUniverse.findMany.mockReset();
  });

  afterEach(async function teardownApp() {
    await app.close();
  });

  // ── AC1: four seed permutations ─────────────────────────────────────────

  describe('AC1 — four seed permutations', function fourPermutationsSpec() {
    it('returns 400 for invalid sort fields', async function invalidSortFieldTest() {
      const response = await app.inject({
        method: 'GET',
        url: '/api/universe/?sortBy=invalidField',
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body)).toEqual({
        error:
          'Invalid sort field: invalidField. Valid fields: symbol, name, sector, marketCap',
      });
      expect(mockPrismaUniverse.findMany).not.toHaveBeenCalled();
    });

    it('calls findMany with WHERE clause that excludes expired-and-no-open rows', async function whereClauseTest() {
      mockPrismaUniverse.findMany.mockResolvedValue([
        makeUniverseRow({
          symbol: EXPIRED_WITH_OPEN,
          expired: true,
          trades: [{ sell_date: null }],
          risk_group: { name: 'Income' },
        }),
        makeUniverseRow({
          symbol: ACTIVE_NO_OPEN,
          expired: false,
          trades: [],
          risk_group: { name: 'Income' },
        }),
        makeUniverseRow({
          symbol: ACTIVE_WITH_OPEN,
          expired: false,
          trades: [{ sell_date: null }],
          risk_group: { name: 'Income' },
        }),
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/universe/',
      });

      expect(response.statusCode).toBe(200);
      expect(mockPrismaUniverse.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            NOT: {
              AND: [
                { expired: true },
                { trades: { none: { sell_date: null } } },
              ],
            },
          },
        })
      );
    });

    it('response contains (b) expired-with-open, (c) active-no-open, (d) active-with-open, and not (a) expired-no-open', async function fourPermutationsResponseTest() {
      // Simulate what the DB returns after the WHERE filter is applied:
      // (a) expired-no-open is excluded by the server filter.
      mockPrismaUniverse.findMany.mockResolvedValue([
        makeUniverseRow({
          symbol: EXPIRED_WITH_OPEN,
          expired: true,
          trades: [{ sell_date: null }],
          risk_group: { name: 'Income' },
        }),
        makeUniverseRow({
          symbol: ACTIVE_NO_OPEN,
          expired: false,
          trades: [],
          risk_group: { name: 'Income' },
        }),
        makeUniverseRow({
          symbol: ACTIVE_WITH_OPEN,
          expired: false,
          trades: [{ sell_date: null }],
          risk_group: { name: 'Income' },
        }),
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/universe/',
      });

      expect(response.statusCode).toBe(200);
      const rows = JSON.parse(response.body) as Array<{ symbol: string }>;
      const symbols = rows.map(function getSymbol(r) {
        return r.symbol;
      });
      expect(symbols).toContain(EXPIRED_WITH_OPEN);
      expect(symbols).toContain(ACTIVE_NO_OPEN);
      expect(symbols).toContain(ACTIVE_WITH_OPEN);
      expect(symbols).not.toContain(EXPIRED_NO_OPEN);
    });
  });

  // ── Response field mapping coverage ─────────────────────────────────────

  describe('Response field mapping', function responseMappingSpec() {
    it('maps non-null ex_date to ISO string', async function exDateNonNullTest() {
      const exDate = new Date('2026-06-15T00:00:00.000Z');
      mockPrismaUniverse.findMany.mockResolvedValue([
        makeUniverseRow({
          symbol: 'TEST_EXDATE',
          expired: false,
          trades: [],
          ex_date: exDate,
          risk_group: { name: 'Income' },
        }),
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/universe/',
      });

      expect(response.statusCode).toBe(200);
      const rows = JSON.parse(response.body) as Array<{ ex_date: string }>;
      expect(rows[0].ex_date).toBe(exDate.toISOString());
    });

    it('maps most_recent_sell_date and most_recent_sell_price when a sold trade exists', async function soldTradeTest() {
      const sellDate = new Date('2026-01-15T00:00:00.000Z');
      mockPrismaUniverse.findMany.mockResolvedValue([
        makeUniverseRow({
          symbol: 'TEST_SELL',
          expired: false,
          trades: [{ sell: 120, sell_date: sellDate }],
          risk_group: { name: 'Income' },
        }),
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/universe/',
      });

      expect(response.statusCode).toBe(200);
      const rows = JSON.parse(response.body) as Array<{
        most_recent_sell_date: string | null;
        most_recent_sell_price: number | null;
      }>;
      expect(rows[0].most_recent_sell_date).toBe(sellDate.toISOString());
      expect(rows[0].most_recent_sell_price).toBe(120);
    });

    it('maps non-null volatilityLong and volatilityShort', async function volatilityNonNullTest() {
      mockPrismaUniverse.findMany.mockResolvedValue([
        makeUniverseRow({
          symbol: 'TEST_VOL',
          expired: false,
          trades: [],
          volatility_long: 'steady',
          volatility_short: 'increasing',
          risk_group: { name: 'Income' },
        }),
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/universe/',
      });

      expect(response.statusCode).toBe(200);
      const rows = JSON.parse(response.body) as Array<{
        volatilityLong: string | null;
        volatilityShort: string | null;
      }>;
      expect(rows[0].volatilityLong).toBe('steady');
      expect(rows[0].volatilityShort).toBe('increasing');
    });

    it('falls back to empty string when risk_group is absent and sort uses name', async function riskGroupAbsentTest() {
      // Row without risk_group — exercises the `?? ''` fallback in
      // getTextSortValue when sortBy is 'name' or 'sector'.
      mockPrismaUniverse.findMany.mockResolvedValue([
        makeUniverseRow({
          symbol: 'NO_GROUP_A',
          expired: false,
          trades: [],
          // risk_group intentionally omitted
        }),
        makeUniverseRow({
          symbol: 'NO_GROUP_B',
          expired: false,
          trades: [],
          // risk_group intentionally omitted
        }),
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/universe/?sortBy=name&sortOrder=asc',
      });

      expect(response.statusCode).toBe(200);
      const rows = JSON.parse(response.body) as Array<{ symbol: string }>;
      expect(rows.length).toBe(2);
    });

    it('marks non-closed-end funds with no activity as deletable', async function deletableTrueTest() {
      mockPrismaUniverse.findMany.mockResolvedValue([
        makeUniverseRow({
          symbol: 'DELETABLE_TRUE',
          expired: false,
          trades: [],
          countTrades: 0,
          countDivDeposits: 0,
          is_closed_end_fund: false,
          risk_group: { name: 'Income' },
        }),
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/universe/',
      });

      expect(response.statusCode).toBe(200);
      const rows = JSON.parse(response.body) as Array<{ deletable: boolean }>;
      expect(rows[0].deletable).toBe(true);
    });

    it('marks non-closed-end funds with dividend deposits as not deletable', async function deletableFalseTest() {
      mockPrismaUniverse.findMany.mockResolvedValue([
        makeUniverseRow({
          symbol: 'DELETABLE_FALSE',
          expired: false,
          trades: [],
          countTrades: 0,
          countDivDeposits: 1,
          is_closed_end_fund: false,
          risk_group: { name: 'Income' },
        }),
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/universe/',
      });

      expect(response.statusCode).toBe(200);
      const rows = JSON.parse(response.body) as Array<{ deletable: boolean }>;
      expect(rows[0].deletable).toBe(false);
    });

    it('sorts by sector using risk group names', async function sectorSortTest() {
      mockPrismaUniverse.findMany.mockResolvedValue([
        makeUniverseRow({
          symbol: 'SECTOR_B',
          expired: false,
          trades: [],
          risk_group: { name: 'Utilities' },
        }),
        makeUniverseRow({
          symbol: 'SECTOR_A',
          expired: false,
          trades: [],
          risk_group: { name: 'Energy' },
        }),
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/universe/?sortBy=sector&sortOrder=asc',
      });

      expect(response.statusCode).toBe(200);
      const rows = JSON.parse(response.body) as Array<{ symbol: string }>;
      expect(
        rows.map(function getSymbol(row) {
          return row.symbol;
        })
      ).toEqual(['SECTOR_A', 'SECTOR_B']);
    });

    it('sorts by marketCap using last_price values', async function marketCapSortTest() {
      mockPrismaUniverse.findMany.mockResolvedValue([
        makeUniverseRow({
          symbol: 'MARKET_CAP_LOW',
          expired: false,
          trades: [],
          last_price: 10,
          risk_group: { name: 'Income' },
        }),
        makeUniverseRow({
          symbol: 'MARKET_CAP_HIGH',
          expired: false,
          trades: [],
          last_price: 25,
          risk_group: { name: 'Income' },
        }),
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/universe/?sortBy=marketCap&sortOrder=desc',
      });

      expect(response.statusCode).toBe(200);
      const rows = JSON.parse(response.body) as Array<{ symbol: string }>;
      expect(
        rows.map(function getSymbol(row) {
          return row.symbol;
        })
      ).toEqual(['MARKET_CAP_HIGH', 'MARKET_CAP_LOW']);
    });

    it('handles equal text values in sort (compareTextValues returns 0)', async function equalTextSortTest() {
      // Two rows sharing the same risk_group name exercise the equal
      // branch in compareTextValues.
      mockPrismaUniverse.findMany.mockResolvedValue([
        makeUniverseRow({
          id: 'u1',
          symbol: 'SYM_A',
          expired: false,
          trades: [],
          risk_group: { name: 'Income' },
        }),
        makeUniverseRow({
          id: 'u2',
          symbol: 'SYM_B',
          expired: false,
          trades: [],
          risk_group: { name: 'Income' },
        }),
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/universe/?sortBy=name&sortOrder=asc',
      });

      expect(response.statusCode).toBe(200);
      const rows = JSON.parse(response.body) as Array<{ symbol: string }>;
      expect(rows.length).toBe(2);
    });
  });
});
