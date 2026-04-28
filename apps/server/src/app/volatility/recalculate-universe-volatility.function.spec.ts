import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { ProcessedRow } from '../routes/common/distribution-api.function';
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

function buildMonthlyRecords(count: number, latestDate: Date): ProcessedRow[] {
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

  test('computes volatility_long from 5y window and volatility_short from 1y window when history spans more than 5 years', async function () {
    const history = buildMonthlyRecords(
      72,
      new Date('2026-04-01T00:00:00.000Z')
    );

    await recalculateUniverseVolatility('universe-1', history);

    expect(mockPrisma.universe.update).toHaveBeenCalledWith({
      where: { id: 'universe-1' },
      data: {
        volatility_long: 'flat',
        volatility_short: 'flat',
        volatility_calculated_at: new Date('2026-04-26T12:00:00.000Z'),
      },
    });
  });

  test('computes both volatility values from same 8-month subset when history covers only 8 months', async function () {
    const history = buildMonthlyRecords(
      8,
      new Date('2026-04-01T00:00:00.000Z')
    );

    await recalculateUniverseVolatility('universe-2', history);

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
    await recalculateUniverseVolatility('universe-3', []);

    expect(mockPrisma.universe.update).toHaveBeenCalledWith({
      where: { id: 'universe-3' },
      data: {
        volatility_long: 'insufficient-history',
        volatility_short: 'insufficient-history',
        volatility_calculated_at: new Date('2026-04-26T12:00:00.000Z'),
      },
    });
  });

  test('does not call prisma.divDeposits.findMany', async function () {
    await recalculateUniverseVolatility('universe-4', []);

    expect(mockPrisma.divDeposits.findMany).not.toHaveBeenCalled();
  });
});
