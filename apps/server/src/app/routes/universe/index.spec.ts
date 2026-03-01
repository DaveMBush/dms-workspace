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
    most_recent_sell_date: Date | null;
    most_recent_sell_price: number | null;
    symbol: string;
    ex_date: Date | null;
    risk_group_id: string;
    expired: boolean;
    is_closed_end_fund: boolean;
    trades: Array<{ buy: number; quantity: number }>;
    risk_group: { name: string };
  }> = {}
) {
  return {
    id: 'u1',
    distribution: 0.1,
    distributions_per_year: 12,
    last_price: 10.0,
    most_recent_sell_date: null,
    most_recent_sell_price: null,
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
      makeUniverseRow({ trades: [{ buy: 10.0, quantity: 100 }] }),
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
          { buy: 10.0, quantity: 50 },
          { buy: 12.0, quantity: 50 },
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
});
