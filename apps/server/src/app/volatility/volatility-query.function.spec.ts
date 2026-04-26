import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDivDepositsFindMany, mockUniverseFindMany } = vi.hoisted(
  function hoistPrismaMocks() {
    return {
      mockDivDepositsFindMany: vi.fn(),
      mockUniverseFindMany: vi.fn(),
    };
  }
);

vi.mock('../prisma/prisma-client', function mockPrismaClient() {
  return {
    prisma: {
      divDeposits: {
        findMany: mockDivDepositsFindMany,
      },
      universe: {
        findMany: mockUniverseFindMany,
      },
    },
  };
});

import { fetchVolatilityForAllSymbols } from './volatility-query.function';

function buildRecentHistory(symbol: string, amount: number) {
  return Array.from({ length: 12 }, function createRecord(_, index) {
    return {
      amount,
      date: new Date(Date.now() - index * 20 * 24 * 60 * 60 * 1000),
      universe: { symbol },
    };
  });
}

describe('fetchVolatilityForAllSymbols', () => {
  beforeEach(() => {
    mockDivDepositsFindMany.mockReset();
    mockUniverseFindMany.mockReset();
  });

  it('includes symbols with missing or insufficient dividend history', async () => {
    mockUniverseFindMany.mockResolvedValue([
      { symbol: 'GCV' },
      { symbol: 'SPAXX' },
      { symbol: 'USA' },
    ]);
    mockDivDepositsFindMany.mockResolvedValue([
      {
        amount: 0.12,
        date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        universe: { symbol: 'GCV' },
      },
      {
        amount: 99,
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        universe: null,
      },
      ...buildRecentHistory('SPAXX', 0.2),
    ]);

    const results = await fetchVolatilityForAllSymbols();

    expect(mockUniverseFindMany).toHaveBeenCalledWith({
      orderBy: { symbol: 'asc' },
      select: { symbol: true },
      where: { deletedAt: null },
    });
    expect(results).toEqual(
      expect.arrayContaining([
        {
          symbol: 'GCV',
          volatility1yr: 'insufficient-history',
          volatility5yr: 'insufficient-history',
        },
        {
          symbol: 'SPAXX',
          volatility1yr: 'steady',
          volatility5yr: 'steady',
        },
        {
          symbol: 'USA',
          volatility1yr: 'insufficient-history',
          volatility5yr: 'insufficient-history',
        },
      ])
    );
  });
});
