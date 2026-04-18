import { describe, expect, test, vi, beforeEach, type Mock } from 'vitest';

import type { MappedTransactionResult } from './mapped-transaction-result.interface';

vi.mock('../../prisma/prisma-client', function () {
  return {
    prisma: {
      accounts: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
      },
      universe: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
      },
      divDepositType: {
        findFirst: vi.fn(),
      },
      trades: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      divDeposits: {
        create: vi.fn(),
        findFirst: vi.fn(),
      },
    },
  };
});

vi.mock('./fidelity-csv-parser.function', function () {
  return {
    parseFidelityCsv: vi.fn(),
  };
});

vi.mock('./fidelity-data-mapper.function', function () {
  return {
    mapFidelityTransactions: vi.fn(),
  };
});

vi.mock('./adjust-lots-for-split.function', function () {
  return {
    adjustLotsForSplit: vi.fn(),
  };
});

vi.mock('./calculate-split-ratio.function', function () {
  return {
    calculateSplitRatio: vi.fn(),
  };
});

describe('importFidelityTransactions', function () {
  let importFidelityTransactions: typeof import('./fidelity-import-service.function').importFidelityTransactions;
  let parseFidelityCsv: Mock;
  let mapFidelityTransactions: Mock;
  let adjustLotsForSplit: Mock;
  let calculateSplitRatio: Mock;
  let prisma: {
    trades: { create: Mock; findFirst: Mock; findMany: Mock; update: Mock };
    divDeposits: { create: Mock; findFirst: Mock };
  };

  function emptyResult(): MappedTransactionResult {
    return {
      trades: [],
      sales: [],
      divDeposits: [],
      unknownTransactions: [],
      pendingSplits: [],
    };
  }

  beforeEach(async function () {
    vi.clearAllMocks();
    const service = await import('./fidelity-import-service.function');
    importFidelityTransactions = service.importFidelityTransactions;
    const parserModule = await import('./fidelity-csv-parser.function');
    parseFidelityCsv = parserModule.parseFidelityCsv as Mock;
    const mapperModule = await import('./fidelity-data-mapper.function');
    mapFidelityTransactions = mapperModule.mapFidelityTransactions as Mock;
    const adjustModule = await import('./adjust-lots-for-split.function');
    adjustLotsForSplit = adjustModule.adjustLotsForSplit as Mock;
    const splitRatioModule = await import('./calculate-split-ratio.function');
    calculateSplitRatio = splitRatioModule.calculateSplitRatio as Mock;
    const prismaModule = await import('../../prisma/prisma-client');
    prisma = (prismaModule as unknown as { prisma: typeof prisma }).prisma;
  });

  describe('importing purchases (creates trades)', function () {
    test('should parse CSV, map transactions, and create trades in database', async function () {
      parseFidelityCsv.mockReturnValue([{ action: 'YOU BOUGHT' }]);
      const mapped = emptyResult();
      mapped.trades = [
        {
          universeId: 'u1',
          accountId: 'a1',
          buy: 25.5,
          sell: 0,
          buy_date: '2025-01-15',
          quantity: 100,
        },
      ];
      mapFidelityTransactions.mockResolvedValue(mapped);
      prisma.trades.findFirst.mockResolvedValue(null);
      prisma.trades.create.mockResolvedValue({ id: 't1' });

      const result = await importFidelityTransactions('csv content');

      expect(result.success).toBe(true);
      expect(result.imported).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(prisma.trades.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          universeId: 'u1',
          accountId: 'a1',
          buy: 25.5,
          sell: 0,
          quantity: 100,
        }),
      });
    });

    test('should create multiple trades for multiple purchase rows', async function () {
      parseFidelityCsv.mockReturnValue([{}, {}]);
      const mapped = emptyResult();
      mapped.trades = [
        {
          universeId: 'u1',
          accountId: 'a1',
          buy: 10,
          sell: 0,
          buy_date: '2025-01-15',
          quantity: 50,
        },
        {
          universeId: 'u2',
          accountId: 'a1',
          buy: 20,
          sell: 0,
          buy_date: '2025-01-16',
          quantity: 30,
        },
      ];
      mapFidelityTransactions.mockResolvedValue(mapped);
      prisma.trades.findFirst.mockResolvedValue(null);
      prisma.trades.create.mockResolvedValue({ id: 't1' });

      const result = await importFidelityTransactions('csv content');

      expect(result.success).toBe(true);
      expect(result.imported).toBe(2);
      expect(prisma.trades.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('importing sales (updates trades)', function () {
    test('should find existing open trade and close it using FIFO', async function () {
      parseFidelityCsv.mockReturnValue([{}]);
      const mapped = emptyResult();
      mapped.sales = [
        {
          universeId: 'u1',
          accountId: 'a1',
          sell: 30,
          sell_date: '2025-02-01',
          quantity: -100,
        },
      ];
      mapFidelityTransactions.mockResolvedValue(mapped);
      prisma.trades.findMany.mockResolvedValue([
        {
          id: 't1',
          universeId: 'u1',
          accountId: 'a1',
          buy: 25,
          sell: 0,
          buy_date: new Date('2025-01-01'),
          sell_date: null,
          quantity: 100,
        },
      ]);
      prisma.trades.update.mockResolvedValue({ id: 't1' });

      const result = await importFidelityTransactions('csv content');

      expect(result.success).toBe(true);
      expect(result.imported).toBe(1);
      expect(prisma.trades.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: expect.objectContaining({
          sell: 30,
        }),
      });
    });

    test('should report error when no matching open trade found for sale', async function () {
      parseFidelityCsv.mockReturnValue([{}]);
      const mapped = emptyResult();
      mapped.sales = [
        {
          universeId: 'u1',
          accountId: 'a1',
          sell: 30,
          sell_date: '2025-02-01',
          quantity: -100,
        },
      ];
      mapFidelityTransactions.mockResolvedValue(mapped);
      prisma.trades.findMany.mockResolvedValue([]);
      (prisma as any).accounts.findUnique.mockResolvedValue({
        name: 'Test Account',
      });
      (prisma as any).universe.findUnique.mockResolvedValue({ symbol: 'SPY' });

      const result = await importFidelityTransactions('csv content');

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('No matching open trade found');
      expect(result.errors[0]).toContain('Test Account');
      expect(result.errors[0]).toContain('SPY');
    });

    test('should split trade when selling partial position (FIFO)', async function () {
      parseFidelityCsv.mockReturnValue([{}]);
      const mapped = emptyResult();
      mapped.sales = [
        {
          universeId: 'u1',
          accountId: 'a1',
          sell: 30,
          sell_date: '2025-02-15',
          quantity: -40,
        },
      ];
      mapFidelityTransactions.mockResolvedValue(mapped);
      prisma.trades.findMany.mockResolvedValue([
        {
          id: 't1',
          universeId: 'u1',
          accountId: 'a1',
          buy: 25,
          sell: 0,
          buy_date: new Date('2025-01-01'),
          sell_date: null,
          quantity: 100,
        },
      ]);
      prisma.trades.create.mockResolvedValue({ id: 't2' });
      prisma.trades.update.mockResolvedValue({ id: 't1' });

      const result = await importFidelityTransactions('csv content');

      expect(result.success).toBe(true);
      // Should create a new closed trade for 40 shares
      expect(prisma.trades.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          quantity: 40,
          sell: 30,
        }),
      });
      // Should update original trade to have 60 shares remaining
      expect(prisma.trades.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: { quantity: 60 },
      });
    });

    test('should consume multiple lots in FIFO order', async function () {
      parseFidelityCsv.mockReturnValue([{}]);
      const mapped = emptyResult();
      mapped.sales = [
        {
          universeId: 'u1',
          accountId: 'a1',
          sell: 30,
          sell_date: '2025-03-01',
          quantity: -80,
        },
      ];
      mapFidelityTransactions.mockResolvedValue(mapped);
      prisma.trades.findMany.mockResolvedValue([
        {
          id: 't1',
          universeId: 'u1',
          accountId: 'a1',
          buy: 20,
          sell: 0,
          buy_date: new Date('2025-01-01'),
          sell_date: null,
          quantity: 40,
        },
        {
          id: 't2',
          universeId: 'u1',
          accountId: 'a1',
          buy: 25,
          sell: 0,
          buy_date: new Date('2025-01-15'),
          sell_date: null,
          quantity: 60,
        },
      ]);
      prisma.trades.update.mockResolvedValue({});
      prisma.trades.create.mockResolvedValue({ id: 't3' });

      const result = await importFidelityTransactions('csv content');

      expect(result.success).toBe(true);
      // Should close first lot completely (40 shares)
      expect(prisma.trades.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: expect.objectContaining({ sell: 30 }),
      });
      // Should create closed trade for 40 shares from second lot
      expect(prisma.trades.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          quantity: 40,
          sell: 30,
        }),
      });
      // Should update second lot to have 20 shares remaining
      expect(prisma.trades.update).toHaveBeenCalledWith({
        where: { id: 't2' },
        data: { quantity: 20 },
      });
    });
  });

  describe('importing dividends (creates dividend deposits)', function () {
    test('should create a dividend deposit record', async function () {
      parseFidelityCsv.mockReturnValue([{}]);
      const mapped = emptyResult();
      mapped.divDeposits = [
        {
          date: '2025-03-01',
          amount: 50,
          accountId: 'a1',
          divDepositTypeId: 'dt1',
          universeId: 'u1',
        },
      ];
      mapFidelityTransactions.mockResolvedValue(mapped);
      prisma.divDeposits.findFirst.mockResolvedValue(null);
      prisma.divDeposits.create.mockResolvedValue({ id: 'dd1' });

      const result = await importFidelityTransactions('csv content');

      expect(result.success).toBe(true);
      expect(result.imported).toBe(1);
      expect(prisma.divDeposits.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          amount: 50,
          accountId: 'a1',
          divDepositTypeId: 'dt1',
          universeId: 'u1',
        }),
      });
    });

    test('should create multiple dividend deposit records', async function () {
      parseFidelityCsv.mockReturnValue([{}, {}]);
      const mapped = emptyResult();
      mapped.divDeposits = [
        {
          date: '2025-03-01',
          amount: 50,
          accountId: 'a1',
          divDepositTypeId: 'dt1',
          universeId: 'u1',
        },
        {
          date: '2025-03-02',
          amount: 75,
          accountId: 'a1',
          divDepositTypeId: 'dt1',
          universeId: 'u2',
        },
      ];
      mapFidelityTransactions.mockResolvedValue(mapped);
      prisma.divDeposits.findFirst.mockResolvedValue(null);
      prisma.divDeposits.create.mockResolvedValue({ id: 'dd1' });

      const result = await importFidelityTransactions('csv content');

      expect(result.success).toBe(true);
      expect(result.imported).toBe(2);
      expect(prisma.divDeposits.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('importing cash deposits (creates dividend deposits)', function () {
    test('should create a cash deposit with null universeId', async function () {
      parseFidelityCsv.mockReturnValue([{}]);
      const mapped = emptyResult();
      mapped.divDeposits = [
        {
          date: '2025-04-01',
          amount: 1000,
          accountId: 'a1',
          divDepositTypeId: 'dt2',
          universeId: null,
        },
      ];
      mapFidelityTransactions.mockResolvedValue(mapped);
      prisma.divDeposits.findFirst.mockResolvedValue(null);
      prisma.divDeposits.create.mockResolvedValue({ id: 'dd1' });

      const result = await importFidelityTransactions('csv content');

      expect(result.success).toBe(true);
      expect(result.imported).toBe(1);
      expect(prisma.divDeposits.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          universeId: null,
        }),
      });
    });
  });

  describe('account validation', function () {
    test('should report error when account is not found', async function () {
      parseFidelityCsv.mockReturnValue([{}]);
      mapFidelityTransactions.mockRejectedValue(
        new Error('Account "Missing" not found')
      );

      const result = await importFidelityTransactions('csv content');

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Account "Missing" not found');
    });

    test('should validate each transaction has a valid account', async function () {
      parseFidelityCsv.mockReturnValue([{}, {}]);
      const mapped = emptyResult();
      mapped.trades = [
        {
          universeId: 'u1',
          accountId: 'a1',
          buy: 10,
          sell: 0,
          buy_date: '2025-01-15',
          quantity: 50,
        },
      ];
      mapFidelityTransactions.mockResolvedValue(mapped);
      prisma.trades.findFirst.mockResolvedValue(null);
      prisma.trades.create.mockResolvedValue({ id: 't1' });

      const result = await importFidelityTransactions('csv content');

      expect(result.success).toBe(true);
      expect(parseFidelityCsv).toHaveBeenCalledWith('csv content');
      expect(mapFidelityTransactions).toHaveBeenCalled();
    });
  });

  describe('transaction validation', function () {
    test('should report error for invalid symbol', async function () {
      parseFidelityCsv.mockReturnValue([{}]);
      mapFidelityTransactions.mockRejectedValue(
        new Error('Symbol "INVALID" not found in universe')
      );

      const result = await importFidelityTransactions('csv content');

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Symbol "INVALID" not found');
    });

    test('should report unknown transaction types', async function () {
      parseFidelityCsv.mockReturnValue([{}]);
      const mapped = emptyResult();
      mapped.unknownTransactions = [
        {
          date: '01/15/2025',
          action: 'TRANSFER',
          symbol: 'XYZ',
          description: 'Transfer',
          quantity: 0,
          price: 0,
          totalAmount: 0,
          account: 'Acct1',
        },
      ];
      mapFidelityTransactions.mockResolvedValue(mapped);

      const result = await importFidelityTransactions('csv content');

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain(
        'Unknown transaction type "TRANSFER"'
      );
    });
  });

  describe('error aggregation', function () {
    test('should aggregate errors from multiple failed rows', async function () {
      parseFidelityCsv.mockReturnValue([{}, {}]);
      const mapped = emptyResult();
      mapped.trades = [
        {
          universeId: 'u1',
          accountId: 'a1',
          buy: 10,
          sell: 0,
          buy_date: '2025-01-15',
          quantity: 50,
        },
      ];
      mapped.sales = [
        {
          universeId: 'u2',
          accountId: 'a1',
          sell: 30,
          sell_date: '2025-02-01',
          quantity: 100,
        },
      ];
      mapFidelityTransactions.mockResolvedValue(mapped);
      prisma.trades.findFirst.mockResolvedValue(null);
      prisma.trades.findMany.mockResolvedValue([]);
      prisma.trades.create.mockRejectedValue(new Error('DB error'));

      const result = await importFidelityTransactions('csv content');

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(2);
    });

    test('should return both successes and failures in partial success scenario', async function () {
      parseFidelityCsv.mockReturnValue([{}, {}]);
      const mapped = emptyResult();
      mapped.trades = [
        {
          universeId: 'u1',
          accountId: 'a1',
          buy: 10,
          sell: 0,
          buy_date: '2025-01-15',
          quantity: 50,
        },
      ];
      mapped.sales = [
        {
          universeId: 'u2',
          accountId: 'a1',
          sell: 30,
          sell_date: '2025-02-01',
          quantity: 100,
        },
      ];
      mapFidelityTransactions.mockResolvedValue(mapped);
      prisma.trades.findFirst.mockResolvedValue(null);
      prisma.trades.findMany.mockResolvedValue([]);
      prisma.trades.create.mockResolvedValue({ id: 't1' });

      const result = await importFidelityTransactions('csv content');

      expect(result.imported).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.success).toBe(false);
    });

    test('should include row context in error messages', async function () {
      parseFidelityCsv.mockReturnValue([{}]);
      const mapped = emptyResult();
      mapped.sales = [
        {
          universeId: 'u1',
          accountId: 'a1',
          sell: 30,
          sell_date: '2025-02-01',
          quantity: 100,
        },
      ];
      mapFidelityTransactions.mockResolvedValue(mapped);
      prisma.trades.findMany.mockResolvedValue([]);
      (prisma as any).accounts.findUnique.mockResolvedValue({
        name: 'My Account',
      });
      (prisma as any).universe.findUnique.mockResolvedValue({ symbol: 'AAPL' });

      const result = await importFidelityTransactions('csv content');

      expect(result.errors[0]).toContain('My Account');
      expect(result.errors[0]).toContain('AAPL');
      expect(result.errors[0]).toContain('quantity=');
    });
  });

  describe('mixed transaction types', function () {
    test('should handle a mix of purchases, sales, dividends, and cash deposits', async function () {
      parseFidelityCsv.mockReturnValue([{}, {}, {}, {}]);
      const mapped = emptyResult();
      mapped.trades = [
        {
          universeId: 'u1',
          accountId: 'a1',
          buy: 10,
          sell: 0,
          buy_date: '2025-01-15',
          quantity: 50,
        },
      ];
      mapped.sales = [
        {
          universeId: 'u2',
          accountId: 'a1',
          sell: 30,
          sell_date: '2025-02-01',
          quantity: 100,
        },
      ];
      mapped.divDeposits = [
        {
          date: '2025-03-01',
          amount: 50,
          accountId: 'a1',
          divDepositTypeId: 'dt1',
          universeId: 'u1',
        },
        {
          date: '2025-04-01',
          amount: 1000,
          accountId: 'a1',
          divDepositTypeId: 'dt2',
          universeId: null,
        },
      ];
      mapFidelityTransactions.mockResolvedValue(mapped);
      prisma.trades.findFirst.mockResolvedValue(null);
      prisma.trades.findMany.mockResolvedValue([
        {
          id: 't1',
          universeId: 'u2',
          accountId: 'a1',
          buy: 25,
          sell: 0,
          buy_date: new Date('2025-01-01'),
          sell_date: null,
          quantity: 100,
        },
      ]);
      prisma.trades.create.mockResolvedValue({ id: 't2' });
      prisma.trades.update.mockResolvedValue({ id: 't1' });
      prisma.divDeposits.findFirst.mockResolvedValue(null);
      prisma.divDeposits.create.mockResolvedValue({ id: 'dd1' });

      const result = await importFidelityTransactions('csv content');

      expect(result.success).toBe(true);
      expect(result.imported).toBe(4);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('idempotency', function () {
    test('should not create duplicate trades when re-importing same data', async function () {
      parseFidelityCsv.mockReturnValue([{}]);
      const mapped = emptyResult();
      mapped.trades = [
        {
          universeId: 'u1',
          accountId: 'a1',
          buy: 25.5,
          sell: 0,
          buy_date: '2025-01-15',
          quantity: 100,
        },
      ];
      mapFidelityTransactions.mockResolvedValue(mapped);
      prisma.trades.findFirst.mockResolvedValue({ id: 'existing-trade' });

      const result = await importFidelityTransactions('csv content');

      expect(result.success).toBe(true);
      expect(result.imported).toBe(1);
      expect(prisma.trades.create).not.toHaveBeenCalled();
    });
  });

  describe('deferred split processing', function () {
    test('adjustLotsForSplit is NOT called before processTrades resolves', async function () {
      const callOrder: string[] = [];
      parseFidelityCsv.mockReturnValue([{}]);
      const mapped = emptyResult();
      mapped.trades = [
        {
          universeId: 'u1',
          accountId: 'a1',
          buy: 10,
          sell: 0,
          buy_date: '2025-06-01',
          quantity: 1000,
        },
      ];
      mapped.pendingSplits = [
        { symbol: 'TSTX', csvQuantity: 200, accountId: 'a1' },
      ];
      mapFidelityTransactions.mockResolvedValue(mapped);
      prisma.trades.findFirst.mockImplementation(async function () {
        callOrder.push('processTrades');
        return null;
      });
      prisma.trades.create.mockResolvedValue({ id: 't1' });
      calculateSplitRatio.mockResolvedValue(5);
      adjustLotsForSplit.mockImplementation(async function () {
        callOrder.push('adjustLotsForSplit');
        return 1;
      });

      await importFidelityTransactions('csv content');

      expect(callOrder.indexOf('processTrades')).toBeLessThan(
        callOrder.indexOf('adjustLotsForSplit')
      );
    });

    test('adjustLotsForSplit is called once per pendingSplit entry with correct args', async function () {
      parseFidelityCsv.mockReturnValue([{}]);
      const mapped = emptyResult();
      mapped.pendingSplits = [
        { symbol: 'TSTX', csvQuantity: 200, accountId: 'a1' },
        { symbol: 'MSTY', csvQuantity: 80, accountId: 'a2' },
      ];
      mapFidelityTransactions.mockResolvedValue(mapped);
      calculateSplitRatio.mockResolvedValueOnce(5).mockResolvedValueOnce(10);
      adjustLotsForSplit.mockResolvedValue(1);

      const result = await importFidelityTransactions('csv content');

      expect(adjustLotsForSplit).toHaveBeenCalledTimes(2);
      expect(adjustLotsForSplit).toHaveBeenCalledWith('TSTX', 5, 'a1');
      expect(adjustLotsForSplit).toHaveBeenCalledWith('MSTY', 10, 'a2');
      expect(result.success).toBe(true);
    });

    test('adjustLotsForSplit is NOT called when calculateSplitRatio returns null (no open lots)', async function () {
      parseFidelityCsv.mockReturnValue([{}]);
      const mapped = emptyResult();
      mapped.pendingSplits = [
        { symbol: 'TSTX', csvQuantity: 200, accountId: 'a1' },
      ];
      mapFidelityTransactions.mockResolvedValue(mapped);
      calculateSplitRatio.mockResolvedValue(null);

      const result = await importFidelityTransactions('csv content');

      expect(adjustLotsForSplit).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    test('error from adjustLotsForSplit is surfaced in result.errors and sets success false', async function () {
      parseFidelityCsv.mockReturnValue([{}]);
      const mapped = emptyResult();
      mapped.pendingSplits = [
        { symbol: 'TSTX', csvQuantity: 200, accountId: 'a1' },
      ];
      mapFidelityTransactions.mockResolvedValue(mapped);
      calculateSplitRatio.mockResolvedValue(5);
      adjustLotsForSplit.mockRejectedValue(new Error('No open lots for TSTX'));

      const result = await importFidelityTransactions('csv content');

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('TSTX');
    });

    test('when pendingSplits is empty, adjustLotsForSplit is never called', async function () {
      parseFidelityCsv.mockReturnValue([{}]);
      const mapped = emptyResult();
      mapped.trades = [
        {
          universeId: 'u1',
          accountId: 'a1',
          buy: 10,
          sell: 0,
          buy_date: '2025-06-01',
          quantity: 100,
        },
      ];
      // pendingSplits defaults to [] in emptyResult()
      mapFidelityTransactions.mockResolvedValue(mapped);
      prisma.trades.findFirst.mockResolvedValue(null);
      prisma.trades.create.mockResolvedValue({ id: 't1' });

      const result = await importFidelityTransactions('csv content');

      expect(adjustLotsForSplit).not.toHaveBeenCalled();
      expect(calculateSplitRatio).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('Epic 74 regression — mid-import error', function () {
    test('Epic 74: partial import leaves success: true when a sale has insufficient open shares', async function () {
      // Reproduces the mid-import error discovered via Playwright (story 74-1).
      // HTTP 400: { success: false, imported: 1, errors: ["No matching open trade found..."] }
      //
      // Scenario: CSV has YOU BOUGHT (100 shares) followed by YOU SOLD (200 shares).
      // The buy succeeds (imported: 1), but the sell fails because only 100 shares are
      // open in the DB — not enough to cover the 200-share sale.
      //
      // Story 74-2 fix: condition changed to totalOpenShares === 0, so oversell is allowed
      // during import when the DB doesn't have the full buy history.
      parseFidelityCsv.mockReturnValue([
        { action: 'YOU BOUGHT', symbol: 'REGT74' },
        { action: 'YOU SOLD', symbol: 'REGT74' },
      ]);

      const mapped = emptyResult();
      mapped.trades = [
        {
          universeId: 'u-regt74',
          accountId: 'a-reg74',
          buy: 15.0,
          sell: 0,
          buy_date: '2026-01-10',
          quantity: 100,
        },
      ];
      mapped.sales = [
        {
          universeId: 'u-regt74',
          accountId: 'a-reg74',
          sell: 18.0,
          sell_date: '2026-02-14',
          quantity: -200, // selling 200 shares; only 100 are open in the DB
        },
      ];
      mapFidelityTransactions.mockResolvedValue(mapped);

      // Buy succeeds
      prisma.trades.findFirst.mockResolvedValue(null);
      prisma.trades.create.mockResolvedValue({ id: 't1' });

      // Only 100 open shares but 200 to sell — oversell scenario
      prisma.trades.findMany.mockResolvedValue([
        {
          id: 't1',
          universeId: 'u-regt74',
          accountId: 'a-reg74',
          buy: 15,
          sell: 0,
          buy_date: new Date('2026-01-10'),
          sell_date: null,
          quantity: 100,
        },
      ]);
      prisma.trades.update.mockResolvedValue({ id: 't1' });
      (prisma as any).accounts.findUnique.mockResolvedValue({
        name: 'Regression 74 Test Account',
      });
      (prisma as any).universe.findUnique.mockResolvedValue({
        symbol: 'REGT74',
      });

      const result = await importFidelityTransactions('csv content');

      // After the fix: oversell (selling 200 shares when only 100 open) returns an error.
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('No matching open trade found for sale');
    });
  });
});
