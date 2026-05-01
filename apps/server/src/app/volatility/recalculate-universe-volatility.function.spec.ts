import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { ProcessedRow } from '../routes/common/distribution-api.function';
import { prisma } from '../prisma/prisma-client';
import { normalizeToMonthlyEquivalents } from './normalize-to-monthly-equivalents.function';
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

  test('produces flat volatility for mixed quarterly-then-monthly cadence at equivalent annualized rate', async function () {
    // 25 quarterly payments of $3 each starting 2019-01-01 (before 5y window)
    const quarterlyStart = new Date('2019-01-01T00:00:00.000Z');
    const quarterlyRows = buildRows(
      Array.from({ length: 25 }, function () {
        return 3;
      }),
      quarterlyStart,
      90
    );
    // 17 monthly payments of $1 each starting 30 days after last quarterly payment
    const lastQuarterlyDate = quarterlyRows[quarterlyRows.length - 1].date;
    const monthlyStart = new Date(
      lastQuarterlyDate.getTime() + 30 * 24 * 60 * 60 * 1000
    );
    const monthlyRows = buildRows(
      Array.from({ length: 17 }, function () {
        return 1;
      }),
      monthlyStart,
      30
    );
    const history = [...quarterlyRows, ...monthlyRows];

    await recalculateUniverseVolatility('universe-mixed-cadence', history);

    // After normalization: quarterly $3 ÷ 3 = $1/month, monthly $1 ÷ 1 = $1/month
    // Both windows receive only $1 values → flat (not a volatility spike)
    expect(mockPrisma.universe.update).toHaveBeenCalledWith({
      where: { id: 'universe-mixed-cadence' },
      data: {
        volatility_long: 'flat',
        volatility_short: 'flat',
        volatility_calculated_at: new Date('2026-04-26T12:00:00.000Z'),
      },
    });
  });
});

function buildRows(
  amounts: number[],
  startDate: Date,
  intervalDays: number
): ProcessedRow[] {
  return amounts.map(function buildRow(amount, index) {
    const date = new Date(
      startDate.getTime() + index * intervalDays * 24 * 60 * 60 * 1000
    );
    return { amount, date };
  });
}

describe('normalizeToMonthlyEquivalents', function () {
  test('returns amounts unchanged when all payments are monthly (~30-day gaps)', function () {
    const start = new Date('2025-01-01T00:00:00.000Z');
    const rows = buildRows([1, 2, 3, 4], start, 30);

    const result = normalizeToMonthlyEquivalents(rows);

    expect(result).toEqual([1, 2, 3, 4]);
  });

  test('divides each amount by 3 when all payments are quarterly (~90-day gaps)', function () {
    const start = new Date('2025-01-01T00:00:00.000Z');
    const rows = buildRows([3, 6, 9, 12], start, 90);

    const result = normalizeToMonthlyEquivalents(rows);

    expect(result).toEqual([3, 2, 3, 4]);
  });

  test('divides each amount by 12 when all payments are annual (~365-day gaps)', function () {
    const start = new Date('2020-01-01T00:00:00.000Z');
    const rows = buildRows([12, 24, 36], start, 365);

    const result = normalizeToMonthlyEquivalents(rows);

    expect(result).toEqual([12, 2, 3]);
  });

  test('normalizes each amount independently for mixed monthly/quarterly cadence', function () {
    const start = new Date('2025-01-01T00:00:00.000Z');
    const monthlyRows = buildRows([1, 1, 1, 1, 1, 1], start, 30);
    const lastMonthlyDate = monthlyRows[monthlyRows.length - 1].date;
    const quarterlyRows = [
      {
        amount: 3,
        date: new Date(lastMonthlyDate.getTime() + 90 * 24 * 60 * 60 * 1000),
      },
      {
        amount: 6,
        date: new Date(lastMonthlyDate.getTime() + 180 * 24 * 60 * 60 * 1000),
      },
      {
        amount: 9,
        date: new Date(lastMonthlyDate.getTime() + 270 * 24 * 60 * 60 * 1000),
      },
    ];
    const rows = [...monthlyRows, ...quarterlyRows];

    const result = normalizeToMonthlyEquivalents(rows);

    expect(result).toEqual([1, 1, 1, 1, 1, 1, 1, 2, 3]);
  });

  test('returns the single amount unchanged for a single-row array', function () {
    const rows: ProcessedRow[] = [
      { amount: 5, date: new Date('2025-06-01T00:00:00.000Z') },
    ];

    const result = normalizeToMonthlyEquivalents(rows);

    expect(result).toEqual([5]);
  });

  test('returns empty array for empty input', function () {
    const result = normalizeToMonthlyEquivalents([]);

    expect(result).toEqual([]);
  });
});
