import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fastify, { FastifyInstance } from 'fastify';

import registerUniverseRoutes from './index';

// Hoisted mocks
const { mockPrismaUniverse } = vi.hoisted(() => ({
  mockPrismaUniverse: { findMany: vi.fn() },
}));

vi.mock('../../prisma/prisma-client', () => ({
  prisma: {
    universe: mockPrismaUniverse,
  },
}));

// Stub sub-route registrations so we only test the main universe POST route
vi.mock('./add-symbol', () => ({
  default: vi.fn(),
}));
vi.mock('./sync-from-screener', () => ({
  default: vi.fn(),
}));

function makeUniverseRow(
  overrides: Partial<{
    id: string;
    distribution: number;
    distributions_per_year: number;
    last_price: number;
    symbol: string;
    ex_date: Date | null;
    risk_group_id: string;
    expired: boolean;
    is_closed_end_fund: boolean;
    trades: Array<{
      buy: number;
      quantity: number;
      sell: number;
      sell_date: Date | null;
    }>;
    risk_group: { name: string };
  }> = {}
) {
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

describe('POST /api/universe - avg_purchase_yield_percent (regression: AS.9 Bug #8)', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = fastify({ logger: false });
    await app.register(registerUniverseRoutes, { prefix: '/api/universe' });
    await app.ready();
    mockPrismaUniverse.findMany.mockReset();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should include avg_purchase_yield_percent in response for each universe row', async () => {
    mockPrismaUniverse.findMany.mockResolvedValue([
      makeUniverseRow({
        trades: [{ buy: 10.0, quantity: 100, sell: 0, sell_date: null }],
      }),
    ]);

    const response = await app.inject({
      method: 'POST',
      url: '/api/universe/',
      payload: ['u1'],
    });

    expect(response.statusCode).toBe(200);
    const rows = JSON.parse(response.body) as Array<{
      avg_purchase_yield_percent: number;
    }>;
    expect(rows[0]).toHaveProperty('avg_purchase_yield_percent');
  });

  it('should compute avg_purchase_yield_percent correctly from open trades', async () => {
    // distribution=0.10/month, distributions_per_year=12 → annual=1.20
    // trades: 50 shares at $10, 50 shares at $12 → avgBuy = (50*10+50*12)/100 = 1100/100 = 11.0
    // expected: 1.20 / 11.0 * 100 ≈ 10.909...
    mockPrismaUniverse.findMany.mockResolvedValue([
      makeUniverseRow({
        distribution: 0.1,
        distributions_per_year: 12,
        trades: [
          { buy: 10.0, quantity: 50, sell: 0, sell_date: null },
          { buy: 12.0, quantity: 50, sell: 0, sell_date: null },
        ],
      }),
    ]);

    const response = await app.inject({
      method: 'POST',
      url: '/api/universe/',
      payload: ['u1'],
    });

    expect(response.statusCode).toBe(200);
    const rows = JSON.parse(response.body) as Array<{
      avg_purchase_yield_percent: number;
    }>;
    // 1.20 / 11.0 * 100 ≈ 10.91
    expect(rows[0].avg_purchase_yield_percent).toBeCloseTo(10.909, 2);
  });

  it('should return 0 for avg_purchase_yield_percent when there are no open trades', async () => {
    mockPrismaUniverse.findMany.mockResolvedValue([
      makeUniverseRow({ trades: [] }),
    ]);

    const response = await app.inject({
      method: 'POST',
      url: '/api/universe/',
      payload: ['u1'],
    });

    expect(response.statusCode).toBe(200);
    const rows = JSON.parse(response.body) as Array<{
      avg_purchase_yield_percent: number;
    }>;
    expect(rows[0].avg_purchase_yield_percent).toBe(0);
  });

  it('should return 0 when open trades exist but average buy is 0', async () => {
    mockPrismaUniverse.findMany.mockResolvedValue([
      makeUniverseRow({
        trades: [{ buy: 0, quantity: 10, sell: 0, sell_date: null }],
      }),
    ]);

    const response = await app.inject({
      method: 'POST',
      url: '/api/universe/',
      payload: ['u1'],
    });

    expect(response.statusCode).toBe(200);
    const rows = JSON.parse(response.body) as Array<{
      avg_purchase_yield_percent: number;
    }>;
    expect(rows[0].avg_purchase_yield_percent).toBe(0);
  });

  it('should compute most_recent_sell_date and most_recent_sell_price from sold trades', async () => {
    const olderSellDate = new Date('2025-06-15T00:00:00.000Z');
    const newerSellDate = new Date('2025-10-27T00:00:00.000Z');
    mockPrismaUniverse.findMany.mockResolvedValue([
      makeUniverseRow({
        trades: [
          { buy: 10.0, quantity: 50, sell: 0, sell_date: null },
          {
            buy: 10.0,
            quantity: 30,
            sell: 12.5,
            sell_date: olderSellDate,
          },
          {
            buy: 10.0,
            quantity: 20,
            sell: 14.0,
            sell_date: newerSellDate,
          },
        ],
      }),
    ]);

    const response = await app.inject({
      method: 'POST',
      url: '/api/universe/',
      payload: ['u1'],
    });

    expect(response.statusCode).toBe(200);
    const rows = JSON.parse(response.body) as Array<{
      most_recent_sell_date: string | null;
      most_recent_sell_price: number | null;
    }>;
    expect(rows[0].most_recent_sell_date).toBe(newerSellDate.toISOString());
    expect(rows[0].most_recent_sell_price).toBe(14.0);
  });

  it('should return null for most_recent_sell fields when no sold trades exist', async () => {
    mockPrismaUniverse.findMany.mockResolvedValue([
      makeUniverseRow({
        trades: [{ buy: 10.0, quantity: 50, sell: 0, sell_date: null }],
      }),
    ]);

    const response = await app.inject({
      method: 'POST',
      url: '/api/universe/',
      payload: ['u1'],
    });

    expect(response.statusCode).toBe(200);
    const rows = JSON.parse(response.body) as Array<{
      most_recent_sell_date: string | null;
      most_recent_sell_price: number | null;
    }>;
    expect(rows[0].most_recent_sell_date).toBeNull();
    expect(rows[0].most_recent_sell_price).toBeNull();
  });

  it('should only use open trades for position and avg_purchase_yield_percent', async () => {
    // Mix of open and sold trades - only open trades should count
    mockPrismaUniverse.findMany.mockResolvedValue([
      makeUniverseRow({
        distribution: 0.1,
        distributions_per_year: 12,
        trades: [
          { buy: 10.0, quantity: 100, sell: 0, sell_date: null }, // open
          {
            buy: 8.0,
            quantity: 50,
            sell: 12.0,
            sell_date: new Date('2025-06-15'),
          }, // sold
        ],
      }),
    ]);

    const response = await app.inject({
      method: 'POST',
      url: '/api/universe/',
      payload: ['u1'],
    });

    expect(response.statusCode).toBe(200);
    const rows = JSON.parse(response.body) as Array<{
      position: number;
      avg_purchase_yield_percent: number;
    }>;
    // Position = only open trade: 10.0 * 100 = 1000
    expect(rows[0].position).toBe(1000);
    // avg yield uses only open trade: (0.1 * 12 * 100) / 10.0 = 12.0
    expect(rows[0].avg_purchase_yield_percent).toBeCloseTo(12.0, 2);
  });
});
