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

describe('importFidelityTransactions', function () {
  let importFidelityTransactions: typeof import('./fidelity-import-service.function').importFidelityTransactions;
  let parseFidelityCsv: Mock;
  let mapFidelityTransactions: Mock;
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
});
