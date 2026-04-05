import { describe, expect, test, vi, beforeEach, type Mock } from 'vitest';

vi.mock('../../prisma/prisma-client', function () {
  return {
    prisma: {
      universe: {
        findFirst: vi.fn(),
      },
      trades: {
        findMany: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn(),
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

describe('adjustLotsForSplit', function () {
  let adjustLotsForSplit: typeof import('./adjust-lots-for-split.function').adjustLotsForSplit;
  let prisma: {
    universe: { findFirst: Mock };
    trades: { findMany: Mock; update: Mock };
    $transaction: Mock;
  };
  let loggerWarn: Mock;

  beforeEach(async function () {
    vi.clearAllMocks();
    const mod = await import('./adjust-lots-for-split.function');
    adjustLotsForSplit = mod.adjustLotsForSplit;
    const prismaModule = await import('../../prisma/prisma-client');
    prisma = (prismaModule as unknown as { prisma: typeof prisma }).prisma;
    const loggerModule = await import('../../../utils/structured-logger');
    loggerWarn = (loggerModule.logger as unknown as { warn: Mock }).warn;

    // Wire $transaction to execute the callback with a tx proxy that shares the same mocks
    prisma.$transaction.mockImplementation(
      async (
        fn: (tx: { trades: { findMany: Mock; update: Mock } }) => Promise<void>
      ) => {
        return fn({
          trades: {
            findMany: prisma.trades.findMany,
            update: prisma.trades.update,
          },
        });
      }
    );
  });

  // AC1: reverse split
  test('reverse split (ratio=5): divides quantity by 5 and multiplies price by 5', async function () {
    prisma.universe.findFirst.mockResolvedValue({ id: 'u-1' });
    prisma.trades.findMany.mockResolvedValue([
      { id: 'lot-1', quantity: 1000, buy: 5.0 },
    ]);
    prisma.trades.update.mockResolvedValue({});

    const count = await adjustLotsForSplit('OXLC', 5);

    expect(count).toBe(1);
    expect(prisma.trades.update).toHaveBeenCalledWith({
      where: { id: 'lot-1' },
      data: { quantity: 200, buy: 25.0 },
    });
  });

  // AC2: forward split
  test('forward split (ratio=0.5): doubles quantity and halves price', async function () {
    prisma.universe.findFirst.mockResolvedValue({ id: 'u-2' });
    prisma.trades.findMany.mockResolvedValue([
      { id: 'lot-2', quantity: 100, buy: 20.0 },
    ]);
    prisma.trades.update.mockResolvedValue({});

    const count = await adjustLotsForSplit('XYZ', 0.5);

    expect(count).toBe(1);
    expect(prisma.trades.update).toHaveBeenCalledWith({
      where: { id: 'lot-2' },
      data: { quantity: 200, buy: 10.0 },
    });
  });

  // AC3: value-neutral
  test('value-neutral: total value (quantity × price) is preserved when quantity is evenly divisible', async function () {
    const quantity = 1000;
    const buy = 10.0;
    const ratio = 5;

    prisma.universe.findFirst.mockResolvedValue({ id: 'u-3' });
    prisma.trades.findMany.mockResolvedValue([{ id: 'lot-3', quantity, buy }]);

    const captured: Array<{ quantity: number; buy: number }> = [];
    prisma.trades.update.mockImplementation(
      ({ data }: { data: { quantity: number; buy: number } }) => {
        captured.push(data);
        return {};
      }
    );

    await adjustLotsForSplit('OXLC', ratio);

    const valueBefore = quantity * buy;
    const valueAfter = captured[0].quantity * captured[0].buy;
    expect(valueAfter).toBeCloseTo(valueBefore, 5);
  });

  // Multiple lots
  test('multiple lots: updates all open lots with correct values', async function () {
    prisma.universe.findFirst.mockResolvedValue({ id: 'u-4' });
    prisma.trades.findMany.mockResolvedValue([
      { id: 'lot-a', quantity: 500, buy: 4.0 },
      { id: 'lot-b', quantity: 1000, buy: 4.0 },
      { id: 'lot-c', quantity: 30, buy: 4.0 },
    ]);
    prisma.trades.update.mockResolvedValue({});

    const count = await adjustLotsForSplit('OXLC', 5);

    expect(count).toBe(3);
    expect(prisma.trades.update).toHaveBeenCalledTimes(3);
    expect(prisma.trades.update).toHaveBeenCalledWith({
      where: { id: 'lot-a' },
      data: { quantity: 100, buy: 20.0 },
    });
    expect(prisma.trades.update).toHaveBeenCalledWith({
      where: { id: 'lot-b' },
      data: { quantity: 200, buy: 20.0 },
    });
    expect(prisma.trades.update).toHaveBeenCalledWith({
      where: { id: 'lot-c' },
      data: { quantity: 6, buy: 20.0 },
    });
  });

  // Single lot
  test('single lot: updates the one open lot correctly', async function () {
    prisma.universe.findFirst.mockResolvedValue({ id: 'u-5' });
    prisma.trades.findMany.mockResolvedValue([
      { id: 'lot-single', quantity: 200, buy: 10.0 },
    ]);
    prisma.trades.update.mockResolvedValue({});

    const count = await adjustLotsForSplit('SINGLE', 5);

    expect(count).toBe(1);
    expect(prisma.trades.update).toHaveBeenCalledWith({
      where: { id: 'lot-single' },
      data: { quantity: 40, buy: 50.0 },
    });
  });

  test('uses Math.floor for quantity (fractional remainder truncated)', async function () {
    // 1530 / 5 = 306 (exact), but 1531 / 5 = 306.2 → floor = 306
    prisma.universe.findFirst.mockResolvedValue({ id: 'u-floor' });
    prisma.trades.findMany.mockResolvedValue([
      { id: 'lot-floor', quantity: 1531, buy: 2.56 },
    ]);
    prisma.trades.update.mockResolvedValue({});

    await adjustLotsForSplit('OXLC', 5);

    expect(prisma.trades.update).toHaveBeenCalledWith({
      where: { id: 'lot-floor' },
      data: { quantity: 306, buy: 12.8 },
    });
  });

  test('returns 0 and logs warning when universe entry not found', async function () {
    prisma.universe.findFirst.mockResolvedValue(null);

    const count = await adjustLotsForSplit('UNKNOWN', 5);

    expect(count).toBe(0);
    expect(prisma.trades.update).not.toHaveBeenCalled();
    expect(loggerWarn).toHaveBeenCalledWith(
      expect.stringContaining('no universe entry found')
    );
  });

  test('returns 0 and logs warning when no open lots exist', async function () {
    prisma.universe.findFirst.mockResolvedValue({ id: 'u-6' });
    prisma.trades.findMany.mockResolvedValue([]);

    const count = await adjustLotsForSplit('NOPOS', 5);

    expect(count).toBe(0);
    expect(prisma.trades.update).not.toHaveBeenCalled();
    expect(loggerWarn).toHaveBeenCalledWith(
      expect.stringContaining('no open lots found')
    );
  });

  test('returns 0 and logs warning when ratio is zero', async function () {
    const count = await adjustLotsForSplit('OXLC', 0);

    expect(count).toBe(0);
    expect(loggerWarn).toHaveBeenCalledWith(
      expect.stringContaining('invalid ratio')
    );
  });

  test('returns 0 and logs warning when ratio is negative', async function () {
    const count = await adjustLotsForSplit('OXLC', -1);

    expect(count).toBe(0);
    expect(loggerWarn).toHaveBeenCalledWith(
      expect.stringContaining('invalid ratio')
    );
  });

  test('returns 0 and logs warning when ratio is NaN', async function () {
    const count = await adjustLotsForSplit('OXLC', Number.NaN);

    expect(count).toBe(0);
    expect(loggerWarn).toHaveBeenCalledWith(
      expect.stringContaining('invalid ratio')
    );
  });

  test('queries trades with correct open-position filters', async function () {
    prisma.universe.findFirst.mockResolvedValue({ id: 'u-7' });
    prisma.trades.findMany.mockResolvedValue([
      { id: 'lot-x', quantity: 100, buy: 5.0 },
    ]);
    prisma.trades.update.mockResolvedValue({});

    await adjustLotsForSplit('FILTERTEST', 5);

    expect(prisma.trades.findMany).toHaveBeenCalledWith({
      where: {
        universeId: 'u-7',
        sell_date: null,
      },
      select: { id: true, quantity: true, buy: true },
    });
  });

  test('wraps all lot updates in a prisma.$transaction for atomicity', async function () {
    prisma.universe.findFirst.mockResolvedValue({ id: 'u-8' });
    prisma.trades.findMany.mockResolvedValue([
      { id: 'lot-y', quantity: 500, buy: 3.0 },
      { id: 'lot-z', quantity: 250, buy: 3.0 },
    ]);
    prisma.trades.update.mockResolvedValue({});

    await adjustLotsForSplit('ATOMIC', 5);

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(prisma.trades.update).toHaveBeenCalledTimes(2);
  });
});
