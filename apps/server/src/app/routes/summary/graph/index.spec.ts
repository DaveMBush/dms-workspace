import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fastify, { FastifyInstance } from 'fastify';

import registerGraphRoutes from './index';

// Hoisted mocks
const { mockPrismaAccounts } = vi.hoisted(() => ({
  mockPrismaAccounts: { findMany: vi.fn(), findUnique: vi.fn() },
}));

vi.mock('../../../prisma/prisma-client', () => ({
  prisma: {
    accounts: mockPrismaAccounts,
  },
}));

vi.mock('../../common/query-utils.function', () => ({
  createAccountQuery: vi.fn().mockImplementation((start: Date, end: Date) => ({
    include: {
      trades: { where: { sell_date: { gte: start, lt: end } } },
      divDeposits: { where: { date: { gte: start, lt: end } } },
    },
  })),
}));

/**
 * Helper: build the prisma.accounts.findMany mock that returns deposit data
 * for a specific month only.
 * year = 4-digit year, month = 0-based month index.
 */
function makeAccountData(amount: number): Array<{
  id: string;
  divDeposits: Array<{ universeId: null; amount: number }>;
  trades: Array<{ sell: number; buy: number; quantity: number }>;
}> {
  return [
    {
      id: 'account-1',
      divDeposits: [{ universeId: null, amount }],
      trades: [],
    },
  ];
}

describe('GET /api/summary/graph - January baseline (regression: AS.9 Bug #4)', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = fastify({ logger: false });
    await app.register(registerGraphRoutes, { prefix: '/api/summary/graph' });
    await app.ready();
    mockPrismaAccounts.findMany.mockReset();
    mockPrismaAccounts.findUnique.mockReset();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should start January deposits from December of the prior year closing value (regression: AS.9 Bug #4)', async () => {
    // Mock: December 2024 has deposits of 5000; January 2025 has deposits of 3000;
    // all other months return 0 data.
    mockPrismaAccounts.findMany.mockImplementation(
      (query: {
        include: {
          divDeposits: { where: { date: { gte: Date; lt: Date } } };
          trades: { where: { sell_date: { gte: Date; lt: Date } } };
        };
      }) => {
        const monthStart: Date = query.include.divDeposits.where.date.gte;
        const m = monthStart.getMonth(); // 0-based
        const y = monthStart.getFullYear();
        if (y === 2024 && m === 11) {
          // December 2024
          return Promise.resolve(makeAccountData(5000));
        }
        if (y === 2025 && m === 0) {
          // January 2025
          return Promise.resolve(makeAccountData(3000));
        }
        return Promise.resolve([
          { id: 'account-1', divDeposits: [], trades: [] },
        ]);
      }
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/summary/graph/?year=2025',
    });

    expect(response.statusCode).toBe(200);
    const data = response.json<
      Array<{
        month: string;
        deposits: number;
        dividends: number;
        capitalGains: number;
      }>
    >();

    // January 2025 deposits should be: December 2024 closing (5000) + January 2025 (3000) = 8000
    const jan = data.find((d) => d.month === '01-2025');
    expect(jan).toBeDefined();
    expect(jan!.deposits).toBe(8000);
  });

  it('should start at 0 when there is no prior year data', async () => {
    // All months return empty data
    mockPrismaAccounts.findMany.mockResolvedValue([
      { id: 'account-1', divDeposits: [], trades: [] },
    ]);

    const response = await app.inject({
      method: 'GET',
      url: '/api/summary/graph/?year=2025',
    });

    expect(response.statusCode).toBe(200);
    const data = response.json<Array<{ month: string; deposits: number }>>();

    const jan = data.find((d) => d.month === '01-2025');
    expect(jan).toBeDefined();
    expect(jan!.deposits).toBe(0);
  });

  it('should carry the full prior year running total into January', async () => {
    // Prior year (2024) has deposits every month, so December has a large running total
    mockPrismaAccounts.findMany.mockImplementation(
      (query: {
        include: {
          divDeposits: { where: { date: { gte: Date; lt: Date } } };
        };
      }) => {
        const y = query.include.divDeposits.where.date.gte.getFullYear();
        if (y === 2024) {
          // Each month in 2024 has 1000 in deposits → December runningTotal = 12000
          return Promise.resolve(makeAccountData(1000));
        }
        if (y === 2025) {
          return Promise.resolve(makeAccountData(500));
        }
        return Promise.resolve([
          { id: 'account-1', divDeposits: [], trades: [] },
        ]);
      }
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/summary/graph/?year=2025',
    });

    expect(response.statusCode).toBe(200);
    const data = response.json<Array<{ month: string; deposits: number }>>();

    // December 2024 runningTotal = 12000; January 2025 = 12000 + 500 = 12500
    const jan = data.find((d) => d.month === '01-2025');
    expect(jan).toBeDefined();
    expect(jan!.deposits).toBe(12500);
  });
});
