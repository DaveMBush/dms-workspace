import { describe, expect, test, vi, beforeEach, type Mock } from 'vitest';

vi.mock('../../prisma/prisma-client', function () {
  return {
    prisma: {
      universe: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      trades: {
        findMany: vi.fn(),
      },
      cusip_cache: {
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
    universe: { findFirst: Mock; findMany: Mock };
    trades: { findMany: Mock };
    cusip_cache: { findMany: Mock };
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

    // Default: no CUSIP aliases, no extra CUSIP universes
    prisma.cusip_cache.findMany.mockResolvedValue([]);
    prisma.universe.findMany.mockResolvedValue([]);
  });

  test('returns 5 for a 1-for-5 reverse split (1530 open, 306 csv qty)', async function () {
    prisma.universe.findFirst.mockResolvedValue({ id: 'universe-1' });
    prisma.trades.findMany.mockResolvedValue([
      { quantity: 1000 },
      { quantity: 530 },
    ]);

    const result = await calculateSplitRatio('OXLC', 306, 'acct-1');

    expect(result).toBe(5);
  });

  test('returns 0.5 for a 2-for-1 forward split (100 open, 200 csv qty)', async function () {
    prisma.universe.findFirst.mockResolvedValue({ id: 'universe-2' });
    prisma.trades.findMany.mockResolvedValue([{ quantity: 100 }]);

    const result = await calculateSplitRatio('XYZ', 200, 'acct-1');

    expect(result).toBe(0.5);
  });

  test('returns 2 for an exact whole number split (1000 open, 500 csv qty)', async function () {
    prisma.universe.findFirst.mockResolvedValue({ id: 'universe-3' });
    prisma.trades.findMany.mockResolvedValue([{ quantity: 1000 }]);

    const result = await calculateSplitRatio('ABC', 500, 'acct-1');

    expect(result).toBe(2);
  });

  test('returns null and logs a warning when csvPostSplitQuantity is zero', async function () {
    const result = await calculateSplitRatio('OXLC', 0, 'acct-1');

    expect(result).toBeNull();
    expect(loggerWarn).toHaveBeenCalledWith(
      expect.stringContaining('invalid post-split CSV quantity')
    );
  });

  test('returns null and logs a warning when csvPostSplitQuantity is negative', async function () {
    const result = await calculateSplitRatio('OXLC', -100, 'acct-1');

    expect(result).toBeNull();
    expect(loggerWarn).toHaveBeenCalledWith(
      expect.stringContaining('invalid post-split CSV quantity')
    );
  });

  test('returns null and logs a warning when csvPostSplitQuantity is NaN', async function () {
    const result = await calculateSplitRatio('OXLC', Number.NaN, 'acct-1');

    expect(result).toBeNull();
    expect(loggerWarn).toHaveBeenCalledWith(
      expect.stringContaining('invalid post-split CSV quantity')
    );
  });

  test('returns null and logs a warning when csvPostSplitQuantity is Infinity', async function () {
    const result = await calculateSplitRatio('OXLC', Infinity, 'acct-1');

    expect(result).toBeNull();
    expect(loggerWarn).toHaveBeenCalledWith(
      expect.stringContaining('invalid post-split CSV quantity')
    );
  });

  test('returns null and logs a warning when no open lots exist', async function () {
    prisma.universe.findFirst.mockResolvedValue({ id: 'universe-4' });
    prisma.trades.findMany.mockResolvedValue([]);

    const result = await calculateSplitRatio('NOPOS', 100, 'acct-1');

    expect(result).toBeNull();
    expect(loggerWarn).toHaveBeenCalledWith(
      expect.stringContaining('no open lots found')
    );
  });

  test('returns null and logs a warning when no universe entry is found', async function () {
    prisma.universe.findFirst.mockResolvedValue(null);

    const result = await calculateSplitRatio('UNKNOWN', 100, 'acct-1');

    expect(result).toBeNull();
    expect(loggerWarn).toHaveBeenCalledWith(
      expect.stringContaining('no universe entry found')
    );
  });

  test('returns correct ratio when a single open lot exists', async function () {
    prisma.universe.findFirst.mockResolvedValue({ id: 'universe-5' });
    prisma.trades.findMany.mockResolvedValue([{ quantity: 500 }]);

    const result = await calculateSplitRatio('SINGLE', 250, 'acct-1');

    expect(result).toBe(2);
  });

  test('sums multiple lots correctly before computing the ratio', async function () {
    prisma.universe.findFirst.mockResolvedValue({ id: 'universe-6' });
    prisma.trades.findMany.mockResolvedValue([
      { quantity: 200 },
      { quantity: 300 },
      { quantity: 500 },
    ]);

    const result = await calculateSplitRatio('MULTI', 200, 'acct-2');

    expect(result).toBe(5);
  });

  test('queries trades with correct account-scoped open-position filters', async function () {
    prisma.universe.findFirst.mockResolvedValue({ id: 'universe-7' });
    prisma.trades.findMany.mockResolvedValue([{ quantity: 100 }]);

    await calculateSplitRatio('FILTERTEST', 100, 'acct-7');

    expect(prisma.trades.findMany).toHaveBeenCalledWith({
      where: {
        universeId: { in: ['universe-7'] },
        accountId: 'acct-7',
        sell_date: null,
      },
      select: { quantity: true },
    });
  });

  // CUSIP lot resolution tests (Epic 61, Story 61.2)

  test('includes CUSIP-aliased lots in ratio calculation when ticker has a CUSIP alias', async function () {
    // Ticker universe has 0 lots; CUSIP universe has 1530 lots
    prisma.universe.findFirst.mockResolvedValue({ id: 'u-oxlc' });
    prisma.cusip_cache.findMany.mockResolvedValue([{ cusip: '691543102' }]);
    prisma.universe.findMany.mockResolvedValue([{ id: 'u-691543102' }]);
    prisma.trades.findMany.mockResolvedValue([
      { quantity: 300 },
      { quantity: 150 },
      { quantity: 500 },
      { quantity: 580 },
    ]);

    const result = await calculateSplitRatio('OXLC', 306, 'acct-oxlc');

    expect(result).toBe(5);
    expect(prisma.trades.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          universeId: { in: ['u-oxlc', 'u-691543102'] },
        }),
      })
    );
  });

  test('includes lots from multiple CUSIP aliases in ratio calculation', async function () {
    prisma.universe.findFirst.mockResolvedValue({ id: 'u-ticker' });
    prisma.cusip_cache.findMany.mockResolvedValue([
      { cusip: '000000001' },
      { cusip: '000000002' },
    ]);
    prisma.universe.findMany.mockResolvedValue([
      { id: 'u-cusip-1' },
      { id: 'u-cusip-2' },
    ]);
    prisma.trades.findMany.mockResolvedValue([
      { quantity: 400 },
      { quantity: 100 },
    ]);

    const result = await calculateSplitRatio('FAKE', 100, 'acct-1');

    expect(result).toBe(5);
    expect(prisma.trades.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          universeId: { in: ['u-ticker', 'u-cusip-1', 'u-cusip-2'] },
        }),
      })
    );
  });

  test('falls back to ticker-only universe IDs when no CUSIP aliases exist', async function () {
    prisma.universe.findFirst.mockResolvedValue({ id: 'u-msty' });
    prisma.cusip_cache.findMany.mockResolvedValue([]);
    prisma.trades.findMany.mockResolvedValue([{ quantity: 1000 }]);

    const result = await calculateSplitRatio('MSTY', 200, 'acct-1');

    expect(result).toBe(5);
    expect(prisma.trades.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          universeId: { in: ['u-msty'] },
        }),
      })
    );
  });
});
