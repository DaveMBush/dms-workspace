import { describe, expect, test, vi, beforeEach, type Mock } from 'vitest';

vi.mock('../../prisma/prisma-client', function () {
  return {
    prisma: {
      universe: {
        findFirst: vi.fn(),
      },
      trades: {
        findMany: vi.fn(),
      },
    },
  };
});

vi.mock('../../../utils/structured-logger', function () {
  return {
    logger: {
      warn: vi.fn(),
    },
  };
});

describe('calculateSplitRatio', function () {
  let calculateSplitRatio: typeof import('./calculate-split-ratio.function').calculateSplitRatio;
  let prisma: {
    universe: { findFirst: Mock };
    trades: { findMany: Mock };
  };
  let loggerWarn: Mock;

  beforeEach(async function () {
    vi.clearAllMocks();
    const mod = await import('./calculate-split-ratio.function');
    calculateSplitRatio = mod.calculateSplitRatio;
    const prismaModule = await import('../../prisma/prisma-client');
    prisma = (prismaModule as unknown as { prisma: typeof prisma }).prisma;
    const loggerModule = await import('../../../utils/structured-logger');
    loggerWarn = (loggerModule.logger as unknown as { warn: Mock }).warn;
  });

  test('returns 5 for a 1-for-5 reverse split (1530 open, 306 csv qty)', async function () {
    prisma.universe.findFirst.mockResolvedValue({ id: 'universe-1' });
    prisma.trades.findMany.mockResolvedValue([
      { quantity: 1000 },
      { quantity: 530 },
    ]);

    const result = await calculateSplitRatio('OXLC', 306);

    expect(result).toBe(5);
  });

  test('returns 0.5 for a 2-for-1 forward split (100 open, 200 csv qty)', async function () {
    prisma.universe.findFirst.mockResolvedValue({ id: 'universe-2' });
    prisma.trades.findMany.mockResolvedValue([{ quantity: 100 }]);

    const result = await calculateSplitRatio('XYZ', 200);

    expect(result).toBe(0.5);
  });

  test('returns 2 for an exact whole number split (1000 open, 500 csv qty)', async function () {
    prisma.universe.findFirst.mockResolvedValue({ id: 'universe-3' });
    prisma.trades.findMany.mockResolvedValue([{ quantity: 1000 }]);

    const result = await calculateSplitRatio('ABC', 500);

    expect(result).toBe(2);
  });

  test('returns null and logs a warning when csvPostSplitQuantity is zero', async function () {
    const result = await calculateSplitRatio('OXLC', 0);

    expect(result).toBeNull();
    expect(loggerWarn).toHaveBeenCalledWith(
      expect.stringContaining('invalid post-split CSV quantity')
    );
  });

  test('returns null and logs a warning when csvPostSplitQuantity is negative', async function () {
    const result = await calculateSplitRatio('OXLC', -100);

    expect(result).toBeNull();
    expect(loggerWarn).toHaveBeenCalledWith(
      expect.stringContaining('invalid post-split CSV quantity')
    );
  });

  test('returns null and logs a warning when csvPostSplitQuantity is NaN', async function () {
    const result = await calculateSplitRatio('OXLC', Number.NaN);

    expect(result).toBeNull();
    expect(loggerWarn).toHaveBeenCalledWith(
      expect.stringContaining('invalid post-split CSV quantity')
    );
  });

  test('returns null and logs a warning when csvPostSplitQuantity is Infinity', async function () {
    const result = await calculateSplitRatio('OXLC', Infinity);

    expect(result).toBeNull();
    expect(loggerWarn).toHaveBeenCalledWith(
      expect.stringContaining('invalid post-split CSV quantity')
    );
  });

  test('returns null and logs a warning when no open lots exist', async function () {
    prisma.universe.findFirst.mockResolvedValue({ id: 'universe-4' });
    prisma.trades.findMany.mockResolvedValue([]);

    const result = await calculateSplitRatio('NOPOS', 100);

    expect(result).toBeNull();
    expect(loggerWarn).toHaveBeenCalledWith(
      expect.stringContaining('no open lots found')
    );
  });

  test('returns null and logs a warning when no universe entry is found', async function () {
    prisma.universe.findFirst.mockResolvedValue(null);

    const result = await calculateSplitRatio('UNKNOWN', 100);

    expect(result).toBeNull();
    expect(loggerWarn).toHaveBeenCalledWith(
      expect.stringContaining('no universe entry found')
    );
  });

  test('returns correct ratio when a single open lot exists', async function () {
    prisma.universe.findFirst.mockResolvedValue({ id: 'universe-5' });
    prisma.trades.findMany.mockResolvedValue([{ quantity: 500 }]);

    const result = await calculateSplitRatio('SINGLE', 250);

    expect(result).toBe(2);
  });

  test('sums multiple lots correctly before computing the ratio', async function () {
    prisma.universe.findFirst.mockResolvedValue({ id: 'universe-6' });
    prisma.trades.findMany.mockResolvedValue([
      { quantity: 200 },
      { quantity: 300 },
      { quantity: 500 },
    ]);

    const result = await calculateSplitRatio('MULTI', 200);

    expect(result).toBe(5);
  });

  test('queries trades with correct open-position filters', async function () {
    prisma.universe.findFirst.mockResolvedValue({ id: 'universe-7' });
    prisma.trades.findMany.mockResolvedValue([{ quantity: 100 }]);

    await calculateSplitRatio('FILTERTEST', 100);

    expect(prisma.trades.findMany).toHaveBeenCalledWith({
      where: {
        universeId: 'universe-7',
        sell: 0,
        sell_date: null,
      },
      select: { quantity: true },
    });
  });
});
