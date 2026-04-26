import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { prisma } from '../prisma/prisma-client';
import { recalculateUniverseVolatility } from './recalculate-universe-volatility.function';

vi.mock('../prisma/prisma-client', function () {
  return {
    prisma: {
      divDeposits: {
        findMany: vi.fn(),
      },
      universe: {
        update: vi.fn(),
      },
    },
  };
});

const mockPrisma = prisma as unknown as {
  divDeposits: { findMany: ReturnType<typeof vi.fn> };
  universe: { update: ReturnType<typeof vi.fn> };
};

function buildMonthlyRecords(
  count: number,
  latestDate: Date
): Array<{ amount: number; date: Date }> {
  return Array.from({ length: count }, function createRecord(_, index) {
    const date = new Date(latestDate);
    date.setMonth(date.getMonth() - (count - index - 1));

    return {
      amount: 1,
      date,
    };
  });
}

describe('recalculateUniverseVolatility', function () {
  beforeEach(function () {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-26T12:00:00.000Z'));
    mockPrisma.divDeposits.findMany.mockReset();
    mockPrisma.universe.update.mockReset();
    mockPrisma.universe.update.mockResolvedValue({});
  });

  afterEach(function () {
    vi.useRealTimers();
  });

  test('writes non-null volatility values when history spans at least 12 months', async function () {
    mockPrisma.divDeposits.findMany.mockResolvedValue(
      buildMonthlyRecords(12, new Date('2026-04-01T00:00:00.000Z'))
    );

    await recalculateUniverseVolatility('universe-1');

    expect(mockPrisma.divDeposits.findMany).toHaveBeenCalledWith({
      where: {
        universeId: 'universe-1',
        deletedAt: null,
        date: { gte: new Date('2021-04-27T12:00:00.000Z') },
      },
      orderBy: { date: 'asc' },
      select: { amount: true, date: true },
    });

    expect(mockPrisma.universe.update).toHaveBeenCalledWith({
      where: { id: 'universe-1' },
      data: {
        volatility_long: 'flat',
        volatility_short: 'flat',
        volatility_calculated_at: new Date('2026-04-26T12:00:00.000Z'),
      },
    });
  });

  test('writes insufficient-history when fewer than 12 months of history are available', async function () {
    mockPrisma.divDeposits.findMany.mockResolvedValue(
      buildMonthlyRecords(11, new Date('2026-04-01T00:00:00.000Z'))
    );

    await recalculateUniverseVolatility('universe-2');

    expect(mockPrisma.universe.update).toHaveBeenCalledWith({
      where: { id: 'universe-2' },
      data: {
        volatility_long: 'insufficient-history',
        volatility_short: 'insufficient-history',
        volatility_calculated_at: new Date('2026-04-26T12:00:00.000Z'),
      },
    });
  });

  test('writes insufficient-history when no distribution history exists', async function () {
    mockPrisma.divDeposits.findMany.mockResolvedValue([]);

    await recalculateUniverseVolatility('universe-3');

    expect(mockPrisma.universe.update).toHaveBeenCalledWith({
      where: { id: 'universe-3' },
      data: {
        volatility_long: 'insufficient-history',
        volatility_short: 'insufficient-history',
        volatility_calculated_at: new Date('2026-04-26T12:00:00.000Z'),
      },
    });
  });
});
