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
  let txFindMany: Mock;
  let txUpdate: Mock;
  let txCreate: Mock;

  beforeEach(async function () {
    vi.clearAllMocks();
    const mod = await import('./adjust-lots-for-split.function');
    adjustLotsForSplit = mod.adjustLotsForSplit;
    const prismaModule = await import('../../prisma/prisma-client');
    prisma = (prismaModule as unknown as { prisma: typeof prisma }).prisma;
    const loggerModule = await import('../../../utils/structured-logger');
    loggerWarn = (loggerModule.logger as unknown as { warn: Mock }).warn;

    // Create distinct tx-scoped mocks so tests can verify findMany/update/create were
    // called via the transaction proxy, not directly on the root prisma client
    txFindMany = vi.fn();
    txUpdate = vi.fn();
    txCreate = vi.fn();
    prisma.$transaction.mockImplementation(
      async (
        fn: (tx: {
          trades: { findMany: Mock; update: Mock; create: Mock };
        }) => Promise<void>
      ) => {
        return fn({
          trades: { findMany: txFindMany, update: txUpdate, create: txCreate },
        });
      }
    );
  });

  // AC1: reverse split
  test('reverse split (ratio=5): divides quantity by 5 and multiplies price by 5', async function () {
    prisma.universe.findFirst.mockResolvedValue({ id: 'u-1' });
    txFindMany.mockResolvedValue([{ id: 'lot-1', quantity: 1000, buy: 5.0 }]);
    txUpdate.mockResolvedValue({});

    const count = await adjustLotsForSplit('OXLC', 5);

    expect(count).toBe(1);
    expect(txUpdate).toHaveBeenCalledWith({
      where: { id: 'lot-1' },
      data: { quantity: 200, buy: 25.0 },
    });
  });

  // AC2: forward split
  test('forward split (ratio=0.5): doubles quantity and halves price', async function () {
    prisma.universe.findFirst.mockResolvedValue({ id: 'u-2' });
    txFindMany.mockResolvedValue([{ id: 'lot-2', quantity: 100, buy: 20.0 }]);
    txUpdate.mockResolvedValue({});

    const count = await adjustLotsForSplit('XYZ', 0.5);

    expect(count).toBe(1);
    expect(txUpdate).toHaveBeenCalledWith({
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
    txFindMany.mockResolvedValue([{ id: 'lot-3', quantity, buy }]);

    const captured: Array<{ quantity: number; buy: number }> = [];
    txUpdate.mockImplementation(
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
    txFindMany.mockResolvedValue([
      { id: 'lot-a', quantity: 500, buy: 4.0 },
      { id: 'lot-b', quantity: 1000, buy: 4.0 },
      { id: 'lot-c', quantity: 30, buy: 4.0 },
    ]);
    txUpdate.mockResolvedValue({});

    const count = await adjustLotsForSplit('OXLC', 5);

    expect(count).toBe(3);
    expect(txUpdate).toHaveBeenCalledTimes(3);
    expect(txUpdate).toHaveBeenCalledWith({
      where: { id: 'lot-a' },
      data: { quantity: 100, buy: 20.0 },
    });
    expect(txUpdate).toHaveBeenCalledWith({
      where: { id: 'lot-b' },
      data: { quantity: 200, buy: 20.0 },
    });
    expect(txUpdate).toHaveBeenCalledWith({
      where: { id: 'lot-c' },
      data: { quantity: 6, buy: 20.0 },
    });
  });

  // Single lot
  test('single lot: updates the one open lot correctly', async function () {
    prisma.universe.findFirst.mockResolvedValue({ id: 'u-5' });
    txFindMany.mockResolvedValue([
      { id: 'lot-single', quantity: 200, buy: 10.0 },
    ]);
    txUpdate.mockResolvedValue({});

    const count = await adjustLotsForSplit('SINGLE', 5);

    expect(count).toBe(1);
    expect(txUpdate).toHaveBeenCalledWith({
      where: { id: 'lot-single' },
      data: { quantity: 40, buy: 50.0 },
    });
  });

  test('uses Math.floor for quantity (fractional remainder truncated)', async function () {
    // 1530 / 5 = 306 (exact), but 1531 / 5 = 306.2 → floor = 306
    prisma.universe.findFirst.mockResolvedValue({ id: 'u-floor' });
    txFindMany.mockResolvedValue([
      { id: 'lot-floor', quantity: 1531, buy: 2.56 },
    ]);
    txUpdate.mockResolvedValue({});

    await adjustLotsForSplit('OXLC', 5);

    expect(txUpdate).toHaveBeenCalledWith({
      where: { id: 'lot-floor' },
      data: { quantity: 306, buy: 12.8 },
    });
  });

  test('returns 0 and logs warning when universe entry not found', async function () {
    prisma.universe.findFirst.mockResolvedValue(null);

    const count = await adjustLotsForSplit('UNKNOWN', 5);

    expect(count).toBe(0);
    expect(txUpdate).not.toHaveBeenCalled();
    expect(loggerWarn).toHaveBeenCalledWith(
      expect.stringContaining('no universe entry found')
    );
  });

  test('returns 0 and logs warning when no open lots exist', async function () {
    prisma.universe.findFirst.mockResolvedValue({ id: 'u-6' });
    txFindMany.mockResolvedValue([]);

    const count = await adjustLotsForSplit('NOPOS', 5);

    expect(count).toBe(0);
    expect(txUpdate).not.toHaveBeenCalled();
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
    txFindMany.mockResolvedValue([{ id: 'lot-x', quantity: 100, buy: 5.0 }]);
    txUpdate.mockResolvedValue({});

    await adjustLotsForSplit('FILTERTEST', 5);

    expect(txFindMany).toHaveBeenCalledWith({
      where: {
        universeId: 'u-7',
        sell_date: null,
      },
      select: { id: true, quantity: true, buy: true, accountId: true },
    });
    expect(prisma.trades.findMany).not.toHaveBeenCalled();
  });

  test('wraps all lot updates in a prisma.$transaction for atomicity', async function () {
    prisma.universe.findFirst.mockResolvedValue({ id: 'u-8' });
    txFindMany.mockResolvedValue([
      { id: 'lot-y', quantity: 500, buy: 3.0 },
      { id: 'lot-z', quantity: 250, buy: 3.0 },
    ]);
    txUpdate.mockResolvedValue({});

    await adjustLotsForSplit('ATOMIC', 5);

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(txFindMany).toHaveBeenCalledOnce();
    expect(prisma.trades.findMany).not.toHaveBeenCalled();
    expect(txUpdate).toHaveBeenCalledTimes(2);
  });

  // Story 48.4 — Fractional remainder tests

  test('fractional remainder: creates fractional sale record with correct quantity and price', async function () {
    // 1531 / 5 = 306.2 → remainder = 0.2
    prisma.universe.findFirst.mockResolvedValue({
      id: 'u-frac',
      last_price: 10.0,
    });
    txFindMany.mockResolvedValue([
      { id: 'lot-frac', quantity: 1531, buy: 2.56, accountId: 'acc-1' },
    ]);
    txUpdate.mockResolvedValue({});
    txCreate.mockResolvedValue({});

    await adjustLotsForSplit('OXLC', 5);

    expect(txCreate).toHaveBeenCalledOnce();
    const call = txCreate.mock.calls[0][0];
    expect(call.data.universeId).toBe('u-frac');
    expect(call.data.accountId).toBe('acc-1');
    expect(call.data.sell).toBe(10.0);
    expect(call.data.buy).toBe(0);
    expect(call.data.quantity).toBeCloseTo(0.2, 10);
    expect(call.data.sell_date).toBeInstanceOf(Date);
  });

  test('exact whole-share split: no fractional sale created', async function () {
    // 1000 / 5 = 200 exactly → remainder = 0
    prisma.universe.findFirst.mockResolvedValue({
      id: 'u-exact',
      last_price: 10.0,
    });
    txFindMany.mockResolvedValue([
      { id: 'lot-exact', quantity: 1000, buy: 5.0, accountId: 'acc-2' },
    ]);
    txUpdate.mockResolvedValue({});

    await adjustLotsForSplit('EXACT', 5);

    expect(txCreate).not.toHaveBeenCalled();
  });

  test('fractional remainder with no market price: logs warning and records sale at price 0', async function () {
    // 1531 / 5 = 306.2 → remainder = 0.2, but last_price = 0
    prisma.universe.findFirst.mockResolvedValue({
      id: 'u-noprice',
      last_price: 0,
    });
    txFindMany.mockResolvedValue([
      { id: 'lot-np', quantity: 1531, buy: 2.56, accountId: 'acc-3' },
    ]);
    txUpdate.mockResolvedValue({});
    txCreate.mockResolvedValue({});

    await adjustLotsForSplit('NOPRICE', 5);

    expect(loggerWarn).toHaveBeenCalledWith(
      expect.stringContaining('no market price available')
    );
    expect(txCreate).toHaveBeenCalledOnce();
    const call = txCreate.mock.calls[0][0];
    expect(call.data.sell).toBe(0);
    expect(call.data.quantity).toBeCloseTo(0.2, 10);
  });

  test('multiple lots: combined fractional remainders create single sale record', async function () {
    // lot-a: 1531/5 = 306.2 → remainder 0.2
    // lot-b: 1000/5 = 200.0 → remainder 0.0
    // totalRemainder = 0.2
    prisma.universe.findFirst.mockResolvedValue({
      id: 'u-multi',
      last_price: 8.0,
    });
    txFindMany.mockResolvedValue([
      { id: 'lot-a', quantity: 1531, buy: 2.56, accountId: 'acc-4' },
      { id: 'lot-b', quantity: 1000, buy: 2.56, accountId: 'acc-4' },
    ]);
    txUpdate.mockResolvedValue({});
    txCreate.mockResolvedValue({});

    await adjustLotsForSplit('MULTI', 5);

    expect(txCreate).toHaveBeenCalledOnce();
    const call = txCreate.mock.calls[0][0];
    expect(call.data.quantity).toBeCloseTo(0.2, 10);
    expect(call.data.sell).toBe(8.0);
  });

  test('multiple lots each with fractional remainder: combined total used for single sale', async function () {
    // lot-a: 1531/5 = 306.2 → remainder 0.2
    // lot-b: 1532/5 = 306.4 → remainder 0.4
    // totalRemainder = 0.6
    prisma.universe.findFirst.mockResolvedValue({
      id: 'u-both-frac',
      last_price: 5.0,
    });
    txFindMany.mockResolvedValue([
      { id: 'lot-a2', quantity: 1531, buy: 2.56, accountId: 'acc-5' },
      { id: 'lot-b2', quantity: 1532, buy: 2.56, accountId: 'acc-5' },
    ]);
    txUpdate.mockResolvedValue({});
    txCreate.mockResolvedValue({});

    await adjustLotsForSplit('BOTH', 5);

    expect(txCreate).toHaveBeenCalledOnce();
    const call = txCreate.mock.calls[0][0];
    expect(call.data.quantity).toBeCloseTo(0.6, 10);
    expect(call.data.sell).toBe(5.0);
  });
});
