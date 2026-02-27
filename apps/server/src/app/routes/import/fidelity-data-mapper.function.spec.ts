import { describe, expect, test, vi, beforeEach } from 'vitest';

import { mapFidelityTransactions } from './fidelity-data-mapper.function';
import { prisma } from '../../prisma/prisma-client';

vi.mock('../../prisma/prisma-client', function () {
  return {
    prisma: {
      accounts: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      universe: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      divDepositType: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      risk_group: {
        findFirst: vi.fn(),
      },
    },
  };
});

const mockPrisma = prisma as any;

interface ParsedCsvRow {
  date: string;
  action: string;
  symbol: string;
  description: string;
  quantity: number;
  price: number;
  totalAmount: number;
  account: string;
}

describe('mapFidelityTransactions', function () {
  beforeEach(function () {
    vi.clearAllMocks();
  });

  describe('purchase transaction mapping', function () {
    test('should map a purchase to a trade creation request', async function () {
      const rows: ParsedCsvRow[] = [
        {
          date: '02/15/2026',
          action: 'YOU BOUGHT',
          symbol: 'SPY',
          description: 'SPDR S&P 500 ETF',
          quantity: 10,
          price: 450.25,
          totalAmount: -4502.5,
          account: 'My Brokerage',
        },
      ];

      mockPrisma.accounts.findFirst.mockResolvedValue({
        id: 'account-123',
        name: 'My Brokerage',
      });
      mockPrisma.universe.findFirst.mockResolvedValue({
        id: 'universe-456',
        symbol: 'SPY',
      });

      const result = await mapFidelityTransactions(rows);

      expect(result.trades).toHaveLength(1);
      expect(result.trades[0]).toEqual({
        universeId: 'universe-456',
        accountId: 'account-123',
        buy: 450.25,
        sell: 0,
        buy_date: '2026-02-15',
        quantity: 10,
      });
    });

    test('should handle multiple purchases of different symbols', async function () {
      const rows: ParsedCsvRow[] = [
        {
          date: '02/15/2026',
          action: 'YOU BOUGHT',
          symbol: 'SPY',
          description: 'SPDR S&P 500 ETF',
          quantity: 10,
          price: 450.25,
          totalAmount: -4502.5,
          account: 'My Brokerage',
        },
        {
          date: '02/16/2026',
          action: 'YOU BOUGHT',
          symbol: 'AAPL',
          description: 'APPLE INC',
          quantity: 5,
          price: 185.0,
          totalAmount: -925.0,
          account: 'My Brokerage',
        },
      ];

      mockPrisma.accounts.findFirst.mockResolvedValue({
        id: 'account-123',
        name: 'My Brokerage',
      });
      mockPrisma.universe.findFirst
        .mockResolvedValueOnce({ id: 'universe-spy', symbol: 'SPY' })
        .mockResolvedValueOnce({ id: 'universe-aapl', symbol: 'AAPL' });

      const result = await mapFidelityTransactions(rows);

      expect(result.trades).toHaveLength(2);
      expect(result.trades[0].universeId).toBe('universe-spy');
      expect(result.trades[1].universeId).toBe('universe-aapl');
    });
  });

  describe('sale transaction mapping', function () {
    test('should map a sale transaction', async function () {
      const rows: ParsedCsvRow[] = [
        {
          date: '02/16/2026',
          action: 'YOU SOLD',
          symbol: 'AAPL',
          description: 'APPLE INC',
          quantity: 5,
          price: 185.0,
          totalAmount: 925.0,
          account: 'My Brokerage',
        },
      ];

      mockPrisma.accounts.findFirst.mockResolvedValue({
        id: 'account-123',
        name: 'My Brokerage',
      });
      mockPrisma.universe.findFirst.mockResolvedValue({
        id: 'universe-789',
        symbol: 'AAPL',
      });

      const result = await mapFidelityTransactions(rows);

      expect(result.sales).toHaveLength(1);
      expect(result.sales[0]).toEqual({
        universeId: 'universe-789',
        accountId: 'account-123',
        sell: 185.0,
        sell_date: '2026-02-16',
        quantity: 5,
      });
    });

    test('should handle sale with fractional shares', async function () {
      const rows: ParsedCsvRow[] = [
        {
          date: '02/16/2026',
          action: 'YOU SOLD',
          symbol: 'AAPL',
          description: 'APPLE INC',
          quantity: 3.5,
          price: 185.0,
          totalAmount: 647.5,
          account: 'My Brokerage',
        },
      ];

      mockPrisma.accounts.findFirst.mockResolvedValue({
        id: 'account-123',
        name: 'My Brokerage',
      });
      mockPrisma.universe.findFirst.mockResolvedValue({
        id: 'universe-789',
        symbol: 'AAPL',
      });

      const result = await mapFidelityTransactions(rows);

      expect(result.sales).toHaveLength(1);
      expect(result.sales[0].quantity).toBe(3.5);
    });
  });

  describe('dividend transaction mapping', function () {
    test('should map a dividend to a div deposit creation request', async function () {
      const rows: ParsedCsvRow[] = [
        {
          date: '02/17/2026',
          action: 'DIVIDEND RECEIVED',
          symbol: 'SPY',
          description: 'SPDR S&P 500 ETF',
          quantity: 0,
          price: 0,
          totalAmount: 15.75,
          account: 'My Brokerage',
        },
      ];

      mockPrisma.accounts.findFirst.mockResolvedValue({
        id: 'account-123',
        name: 'My Brokerage',
      });
      mockPrisma.universe.findFirst.mockResolvedValue({
        id: 'universe-456',
        symbol: 'SPY',
      });
      mockPrisma.divDepositType.findFirst.mockResolvedValue({
        id: 'type-dividend',
        name: 'Dividend',
      });

      const result = await mapFidelityTransactions(rows);

      expect(result.divDeposits).toHaveLength(1);
      expect(result.divDeposits[0]).toEqual({
        date: '2026-02-17',
        amount: 15.75,
        accountId: 'account-123',
        divDepositTypeId: 'type-dividend',
        universeId: 'universe-456',
      });
    });

    test('should map multiple dividends from different symbols', async function () {
      const rows: ParsedCsvRow[] = [
        {
          date: '02/17/2026',
          action: 'DIVIDEND RECEIVED',
          symbol: 'SPY',
          description: 'SPDR S&P 500 ETF',
          quantity: 0,
          price: 0,
          totalAmount: 15.75,
          account: 'My Brokerage',
        },
        {
          date: '02/18/2026',
          action: 'DIVIDEND RECEIVED',
          symbol: 'AAPL',
          description: 'APPLE INC',
          quantity: 0,
          price: 0,
          totalAmount: 5.25,
          account: 'My Brokerage',
        },
      ];

      mockPrisma.accounts.findFirst.mockResolvedValue({
        id: 'account-123',
        name: 'My Brokerage',
      });
      mockPrisma.universe.findFirst
        .mockResolvedValueOnce({ id: 'universe-spy', symbol: 'SPY' })
        .mockResolvedValueOnce({ id: 'universe-aapl', symbol: 'AAPL' });
      mockPrisma.divDepositType.findFirst.mockResolvedValue({
        id: 'type-dividend',
        name: 'Dividend',
      });

      const result = await mapFidelityTransactions(rows);

      expect(result.divDeposits).toHaveLength(2);
      expect(result.divDeposits[0].universeId).toBe('universe-spy');
      expect(result.divDeposits[1].universeId).toBe('universe-aapl');
    });
  });

  describe('cash deposit mapping', function () {
    test('should map a cash deposit to a div deposit creation request', async function () {
      const rows: ParsedCsvRow[] = [
        {
          date: '02/18/2026',
          action: 'ELECTRONIC FUNDS TRANSFER',
          symbol: '',
          description: 'DIRECT DEPOSIT',
          quantity: 0,
          price: 0,
          totalAmount: 5000.0,
          account: 'My Brokerage',
        },
      ];

      mockPrisma.accounts.findFirst.mockResolvedValue({
        id: 'account-123',
        name: 'My Brokerage',
      });
      mockPrisma.divDepositType.findFirst.mockResolvedValue({
        id: 'type-cash-deposit',
        name: 'Cash Deposit',
      });

      const result = await mapFidelityTransactions(rows);

      expect(result.divDeposits).toHaveLength(1);
      expect(result.divDeposits[0]).toEqual({
        date: '2026-02-18',
        amount: 5000.0,
        accountId: 'account-123',
        divDepositTypeId: 'type-cash-deposit',
        universeId: null,
      });
    });

    test('should handle cash deposit with no symbol', async function () {
      const rows: ParsedCsvRow[] = [
        {
          date: '02/18/2026',
          action: 'ELECTRONIC FUNDS TRANSFER',
          symbol: '',
          description: 'DIRECT DEPOSIT',
          quantity: 0,
          price: 0,
          totalAmount: 5000.0,
          account: 'My Brokerage',
        },
      ];

      mockPrisma.accounts.findFirst.mockResolvedValue({
        id: 'account-123',
        name: 'My Brokerage',
      });
      mockPrisma.divDepositType.findFirst.mockResolvedValue({
        id: 'type-cash-deposit',
        name: 'Cash Deposit',
      });

      const result = await mapFidelityTransactions(rows);

      expect(result.divDeposits[0].universeId).toBeNull();
    });

    test('should auto-create Cash Deposit type if not found', async function () {
      const rows: ParsedCsvRow[] = [
        {
          date: '02/18/2026',
          action: 'ELECTRONIC FUNDS TRANSFER',
          symbol: '',
          description: 'DIRECT DEPOSIT',
          quantity: 0,
          price: 0,
          totalAmount: 5000.0,
          account: 'My Brokerage',
        },
      ];

      mockPrisma.accounts.findFirst.mockResolvedValue({
        id: 'account-123',
        name: 'My Brokerage',
      });
      mockPrisma.divDepositType.findFirst.mockResolvedValue(null);
      mockPrisma.divDepositType.create.mockResolvedValue({
        id: 'new-cash-deposit-type',
        name: 'Cash Deposit',
      });

      const result = await mapFidelityTransactions(rows);

      expect(mockPrisma.divDepositType.create).toHaveBeenCalledWith({
        data: { name: 'Cash Deposit' },
      });
      expect(result.divDeposits).toHaveLength(1);
      expect(result.divDeposits[0].divDepositTypeId).toBe(
        'new-cash-deposit-type'
      );
    });

    test('should auto-create Dividend type if not found', async function () {
      const rows: ParsedCsvRow[] = [
        {
          date: '03/01/2026',
          action: 'DIVIDEND RECEIVED',
          symbol: 'AAPL',
          description: 'APPLE INC',
          quantity: 0,
          price: 0,
          totalAmount: 100.0,
          account: 'My Brokerage',
        },
      ];

      mockPrisma.accounts.findFirst.mockResolvedValue({
        id: 'account-123',
        name: 'My Brokerage',
      });
      mockPrisma.universe.findFirst.mockResolvedValue({
        id: 'universe-aapl',
        symbol: 'AAPL',
      });
      mockPrisma.divDepositType.findFirst.mockResolvedValue(null);
      mockPrisma.divDepositType.create.mockResolvedValue({
        id: 'new-dividend-type',
        name: 'Dividend',
      });

      const result = await mapFidelityTransactions(rows);

      expect(mockPrisma.divDepositType.create).toHaveBeenCalledWith({
        data: { name: 'Dividend' },
      });
      expect(result.divDeposits).toHaveLength(1);
      expect(result.divDeposits[0].divDepositTypeId).toBe('new-dividend-type');
    });
  });

  describe('account name matching', function () {
    test('should match account by name from CSV', async function () {
      const rows: ParsedCsvRow[] = [
        {
          date: '02/15/2026',
          action: 'YOU BOUGHT',
          symbol: 'SPY',
          description: 'SPDR S&P 500 ETF',
          quantity: 10,
          price: 450.25,
          totalAmount: -4502.5,
          account: 'My Brokerage',
        },
      ];

      mockPrisma.accounts.findFirst.mockResolvedValue({
        id: 'account-123',
        name: 'My Brokerage',
      });
      mockPrisma.universe.findFirst.mockResolvedValue({
        id: 'universe-456',
        symbol: 'SPY',
      });

      await mapFidelityTransactions(rows);

      expect(mockPrisma.accounts.findFirst).toHaveBeenCalledWith({
        where: { name: 'My Brokerage' },
      });
    });

    test('should auto-create account when not found', async function () {
      const rows: ParsedCsvRow[] = [
        {
          date: '02/15/2026',
          action: 'YOU BOUGHT',
          symbol: 'SPY',
          description: 'SPDR S&P 500 ETF',
          quantity: 10,
          price: 450.25,
          totalAmount: -4502.5,
          account: 'New Account',
        },
      ];

      mockPrisma.accounts.findFirst.mockResolvedValue(null);
      mockPrisma.accounts.create.mockResolvedValue({
        id: 'new-account-123',
        name: 'New Account',
      });
      mockPrisma.universe.findFirst.mockResolvedValue({
        id: 'universe-spy',
        symbol: 'SPY',
      });

      const result = await mapFidelityTransactions(rows);

      expect(mockPrisma.accounts.create).toHaveBeenCalledWith({
        data: { name: 'New Account' },
      });
      expect(result.trades).toHaveLength(1);
      expect(result.trades[0].accountId).toBe('new-account-123');
    });

    test('should reuse cached account for multiple rows with same account', async function () {
      const rows: ParsedCsvRow[] = [
        {
          date: '02/15/2026',
          action: 'YOU BOUGHT',
          symbol: 'SPY',
          description: 'SPDR S&P 500 ETF',
          quantity: 10,
          price: 450.25,
          totalAmount: -4502.5,
          account: 'My Brokerage',
        },
        {
          date: '02/16/2026',
          action: 'YOU BOUGHT',
          symbol: 'AAPL',
          description: 'APPLE INC',
          quantity: 5,
          price: 185.0,
          totalAmount: -925.0,
          account: 'My Brokerage',
        },
      ];

      mockPrisma.accounts.findFirst.mockResolvedValue({
        id: 'account-123',
        name: 'My Brokerage',
      });
      mockPrisma.universe.findFirst
        .mockResolvedValueOnce({ id: 'universe-spy', symbol: 'SPY' })
        .mockResolvedValueOnce({ id: 'universe-aapl', symbol: 'AAPL' });

      await mapFidelityTransactions(rows);

      expect(mockPrisma.accounts.findFirst).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', function () {
    test('should throw error for missing required date field', async function () {
      const rows: ParsedCsvRow[] = [
        {
          date: '',
          action: 'YOU BOUGHT',
          symbol: 'SPY',
          description: 'SPDR S&P 500 ETF',
          quantity: 10,
          price: 450.25,
          totalAmount: -4502.5,
          account: 'My Brokerage',
        },
      ];

      mockPrisma.accounts.findFirst.mockResolvedValue({
        id: 'account-123',
        name: 'My Brokerage',
      });

      await expect(mapFidelityTransactions(rows)).rejects.toThrow();
    });

    test('should throw error for invalid date format', async function () {
      const rows: ParsedCsvRow[] = [
        {
          date: 'not-a-date',
          action: 'YOU BOUGHT',
          symbol: 'SPY',
          description: 'SPDR S&P 500 ETF',
          quantity: 10,
          price: 450.25,
          totalAmount: -4502.5,
          account: 'My Brokerage',
        },
      ];

      mockPrisma.accounts.findFirst.mockResolvedValue({
        id: 'account-123',
        name: 'My Brokerage',
      });

      await expect(mapFidelityTransactions(rows)).rejects.toThrow();
    });

    test('should throw error for negative quantity on purchase', async function () {
      const rows: ParsedCsvRow[] = [
        {
          date: '02/15/2026',
          action: 'YOU BOUGHT',
          symbol: 'SPY',
          description: 'SPDR S&P 500 ETF',
          quantity: -10,
          price: 450.25,
          totalAmount: -4502.5,
          account: 'My Brokerage',
        },
      ];

      mockPrisma.accounts.findFirst.mockResolvedValue({
        id: 'account-123',
        name: 'My Brokerage',
      });

      await expect(mapFidelityTransactions(rows)).rejects.toThrow();
    });

    test('should report unknown transaction types', async function () {
      const rows: ParsedCsvRow[] = [
        {
          date: '02/15/2026',
          action: 'UNKNOWN ACTION',
          symbol: 'SPY',
          description: 'SPDR S&P 500 ETF',
          quantity: 10,
          price: 450.25,
          totalAmount: -4502.5,
          account: 'My Brokerage',
        },
      ];

      mockPrisma.accounts.findFirst.mockResolvedValue({
        id: 'account-123',
        name: 'My Brokerage',
      });

      const result = await mapFidelityTransactions(rows);

      expect(result.unknownTransactions).toHaveLength(1);
      expect(result.unknownTransactions[0].action).toBe('UNKNOWN ACTION');
    });

    test('should auto-create symbol for BUY when not found in universe', async function () {
      const rows: ParsedCsvRow[] = [
        {
          date: '02/15/2026',
          action: 'YOU BOUGHT',
          symbol: 'NEWSTOCK',
          description: 'NEW STOCK',
          quantity: 10,
          price: 100.0,
          totalAmount: -1000.0,
          account: 'My Brokerage',
        },
      ];

      mockPrisma.accounts.findFirst.mockResolvedValue({
        id: 'account-123',
        name: 'My Brokerage',
      });
      mockPrisma.universe.findFirst.mockResolvedValue(null);
      mockPrisma.risk_group.findFirst.mockResolvedValue({
        id: 'default-risk-group',
        name: 'Default',
      });
      mockPrisma.universe.create.mockResolvedValue({
        id: 'new-universe-123',
        symbol: 'NEWSTOCK',
        risk_group_id: 'default-risk-group',
      });

      const result = await mapFidelityTransactions(rows);

      expect(mockPrisma.universe.create).toHaveBeenCalledWith({
        data: {
          symbol: 'NEWSTOCK',
          risk_group_id: 'default-risk-group',
          last_price: 0,
          distribution: 0,
          distributions_per_year: 0,
          ex_date: null,
          most_recent_sell_date: null,
          expired: false,
          is_closed_end_fund: true,
        },
      });
      expect(result.trades).toHaveLength(1);
      expect(result.trades[0].universeId).toBe('new-universe-123');
    });

    test('should treat SELL of unknown symbol as cash deposit', async function () {
      const rows: ParsedCsvRow[] = [
        {
          date: '02/15/2026',
          action: 'YOU SOLD',
          symbol: 'UNKNOWN',
          description: 'UNKNOWN STOCK',
          quantity: 10,
          price: 100.0,
          totalAmount: 1000.0,
          account: 'My Brokerage',
        },
      ];

      mockPrisma.accounts.findFirst.mockResolvedValue({
        id: 'account-123',
        name: 'My Brokerage',
      });
      mockPrisma.universe.findFirst.mockResolvedValue(null);
      mockPrisma.divDepositType.findFirst.mockResolvedValue({
        id: 'cash-deposit-type',
        name: 'Cash Deposit',
      });

      const result = await mapFidelityTransactions(rows);

      expect(mockPrisma.universe.create).not.toHaveBeenCalled();
      expect(result.sales).toHaveLength(0);
      expect(result.divDeposits).toHaveLength(1);
      expect(result.divDeposits[0]).toEqual({
        accountId: 'account-123',
        date: '2026-02-15',
        amount: 1000.0,
        divDepositTypeId: 'cash-deposit-type',
        universeId: null,
      });
    });

    test('should handle real Fidelity action format with descriptions', async function () {
      const rows: ParsedCsvRow[] = [
        {
          date: '06/30/2025',
          action: 'YOU BOUGHT OFS CREDIT COMPANY INC COM (OCCI) (Cash)',
          symbol: 'OCCI',
          description: 'OFS CREDIT COMPANY INC COM',
          quantity: 300,
          price: 6.18,
          totalAmount: -1854,
          account: 'Joint Brokerage',
        },
        {
          date: '06/30/2025',
          action:
            'YOU SOLD 25181G8B1P OFS CREDIT COMPANY INC COM (OCCI) (Cash)',
          symbol: 'OCCI',
          description: 'OFS CREDIT COMPANY INC COM',
          quantity: -300,
          price: 6.23,
          totalAmount: 1869,
          account: 'Joint Brokerage',
        },
      ];

      mockPrisma.accounts.findFirst.mockResolvedValue({
        id: 'account-123',
        name: 'Joint Brokerage',
      });
      mockPrisma.universe.findFirst.mockResolvedValue({
        id: 'universe-occi',
        symbol: 'OCCI',
      });

      const result = await mapFidelityTransactions(rows);

      expect(result.trades).toHaveLength(1);
      expect(result.sales).toHaveLength(1);
      expect(result.unknownTransactions).toHaveLength(0);
    });

    test('should handle PURCHASE INTO CORE ACCOUNT and REDEMPTION FROM CORE ACCOUNT', async function () {
      const rows: ParsedCsvRow[] = [
        {
          date: '06/30/2025',
          action:
            'YOU BOUGHT BLACKROCK CAPITAL ALLOCATION TERM CO... (BCAT) (Cash)',
          symbol: 'BCAT',
          description: 'BLACKROCK CAPITAL ALLOCATION TERM COM U',
          quantity: 100,
          price: 15.1,
          totalAmount: -1510,
          account: 'Joint Brokerage',
        },
        {
          date: '06/27/2025',
          action:
            'YOU SOLD BLACKROCK CAPITAL ALLOCATION TERM CO... (BCAT) (Cash)',
          symbol: 'BCAT',
          description: 'BLACKROCK CAPITAL ALLOCATION TERM COM U',
          quantity: -100,
          price: 15.5,
          totalAmount: 1550,
          account: 'Joint Brokerage',
        },
      ];

      mockPrisma.accounts.findFirst.mockResolvedValue({
        id: 'account-123',
        name: 'Joint Brokerage',
      });
      mockPrisma.universe.findFirst.mockResolvedValue({
        id: 'universe-bcat',
        symbol: 'BCAT',
      });

      const result = await mapFidelityTransactions(rows);

      expect(result.trades).toHaveLength(1);
      expect(result.sales).toHaveLength(1);
      expect(result.unknownTransactions).toHaveLength(0);
    });

    test('should handle REINVESTMENT action type', async function () {
      const rows: ParsedCsvRow[] = [
        {
          date: '06/30/2025',
          action:
            'REINVESTMENT FRANKLIN LTD DURATION INCOME T COM (FTF) (Cash)',
          symbol: 'FTF',
          description: 'FRANKLIN LTD DURATION INCOME T COM',
          quantity: 12.63,
          price: 6.42,
          totalAmount: -81.08,
          account: 'Joint Brokerage',
        },
      ];

      mockPrisma.accounts.findFirst.mockResolvedValue({
        id: 'account-123',
        name: 'Joint Brokerage',
      });
      mockPrisma.universe.findFirst.mockResolvedValue({
        id: 'universe-ftf',
        symbol: 'FTF',
      });

      const result = await mapFidelityTransactions(rows);

      expect(result.trades).toHaveLength(1);
      expect(result.unknownTransactions).toHaveLength(0);
    });

    test('should handle DIVIDEND RECEIVED with full description', async function () {
      const rows: ParsedCsvRow[] = [
        {
          date: '06/30/2025',
          action:
            'DIVIDEND RECEIVED FRANKLIN LTD DURATION INCOME T COM (FTF) (Cash)',
          symbol: 'FTF',
          description: 'FRANKLIN LTD DURATION INCOME T COM',
          quantity: 0,
          price: 0,
          totalAmount: 18.45,
          account: 'Joint Brokerage',
        },
      ];

      mockPrisma.accounts.findFirst.mockResolvedValue({
        id: 'account-123',
        name: 'Joint Brokerage',
      });
      mockPrisma.universe.findFirst.mockResolvedValue({
        id: 'universe-ftf',
        symbol: 'FTF',
      });
      mockPrisma.divDepositType.findFirst.mockResolvedValue({
        id: 'div-type-123',
        name: 'Dividend',
      });

      const result = await mapFidelityTransactions(rows);

      expect(result.divDeposits).toHaveLength(1);
      expect(result.unknownTransactions).toHaveLength(0);
    });

    test('should treat SPAXX purchases and redemptions as cash movements', async function () {
      const rows: ParsedCsvRow[] = [
        {
          date: '06/30/2025',
          action:
            'PURCHASE INTO CORE ACCOUNT FIDELITY GOVERNMENT MONEY MARKET (SPAXX) MORNING TRADE (Cash)',
          symbol: 'SPAXX',
          description: 'FIDELITY GOVERNMENT MONEY MARKET',
          quantity: 153.05,
          price: 1,
          totalAmount: -153.05,
          account: 'Joint Brokerage',
        },
        {
          date: '06/27/2025',
          action:
            'REDEMPTION FROM CORE ACCOUNT FIDELITY GOVERNMENT MONEY MARKET (SPAXX) MORNING TRADE (Cash)',
          symbol: 'SPAXX',
          description: 'FIDELITY GOVERNMENT MONEY MARKET',
          quantity: -6043.5,
          price: 1,
          totalAmount: 6043.5,
          account: 'Joint Brokerage',
        },
      ];

      mockPrisma.accounts.findFirst.mockResolvedValue({
        id: 'account-123',
        name: 'Joint Brokerage',
      });
      mockPrisma.divDepositType.findFirst.mockResolvedValue({
        id: 'cash-deposit-type',
        name: 'Cash Deposit',
      });

      const result = await mapFidelityTransactions(rows);

      // Should create cash deposits, not trades or sales
      expect(result.trades).toHaveLength(0);
      expect(result.sales).toHaveLength(0);
      expect(result.divDeposits).toHaveLength(2);
      expect(result.divDeposits[0].amount).toBe(6043.5); // Redemption (sorted first by date)
      expect(result.divDeposits[1].amount).toBe(-153.05); // Purchase
      expect(result.unknownTransactions).toHaveLength(0);
    });

    test('should auto-create SPAXX universe entry for dividends but not for trades', async function () {
      const rows: ParsedCsvRow[] = [
        {
          date: '06/30/2025',
          action:
            'DIVIDEND RECEIVED FIDELITY GOVERNMENT MONEY MARKET (SPAXX) (Cash)',
          symbol: 'SPAXX',
          description: 'FIDELITY GOVERNMENT MONEY MARKET',
          quantity: 0,
          price: 0,
          totalAmount: 12.63,
          account: 'Joint Brokerage',
        },
      ];

      mockPrisma.accounts.findFirst.mockResolvedValue({
        id: 'account-123',
        name: 'Joint Brokerage',
      });
      mockPrisma.universe.findFirst.mockResolvedValue(null);
      mockPrisma.risk_group.findFirst.mockResolvedValue({
        id: 'default-risk-group',
        name: 'Default',
      });
      mockPrisma.universe.create.mockResolvedValue({
        id: 'new-spaxx-universe',
        symbol: 'SPAXX',
        risk_group_id: 'default-risk-group',
      });
      mockPrisma.divDepositType.findFirst.mockResolvedValue({
        id: 'div-type-123',
        name: 'Dividend',
      });

      const result = await mapFidelityTransactions(rows);

      // Should auto-create SPAXX universe entry
      expect(mockPrisma.universe.create).toHaveBeenCalledWith({
        data: {
          symbol: 'SPAXX',
          risk_group_id: 'default-risk-group',
          last_price: 0,
          distribution: 0,
          distributions_per_year: 0,
          ex_date: null,
          most_recent_sell_date: null,
          expired: false,
          is_closed_end_fund: true,
        },
      });
      // Should create dividend deposit linked to SPAXX
      expect(result.divDeposits).toHaveLength(1);
      expect(result.divDeposits[0].universeId).toBe('new-spaxx-universe');
      expect(result.divDeposits[0].amount).toBe(12.63);
      expect(result.unknownTransactions).toHaveLength(0);
    });

    test('should return empty results for empty input array', async function () {
      const result = await mapFidelityTransactions([]);

      expect(result.trades).toEqual([]);
      expect(result.sales).toEqual([]);
      expect(result.divDeposits).toEqual([]);
      expect(result.unknownTransactions).toEqual([]);
    });

    test('should handle mixed transaction types in single import', async function () {
      const rows: ParsedCsvRow[] = [
        {
          date: '02/15/2026',
          action: 'YOU BOUGHT',
          symbol: 'SPY',
          description: 'SPDR S&P 500 ETF',
          quantity: 10,
          price: 450.25,
          totalAmount: -4502.5,
          account: 'My Brokerage',
        },
        {
          date: '02/16/2026',
          action: 'YOU SOLD',
          symbol: 'AAPL',
          description: 'APPLE INC',
          quantity: 5,
          price: 185.0,
          totalAmount: 925.0,
          account: 'My Brokerage',
        },
        {
          date: '02/17/2026',
          action: 'DIVIDEND RECEIVED',
          symbol: 'SPY',
          description: 'SPDR S&P 500 ETF',
          quantity: 0,
          price: 0,
          totalAmount: 15.75,
          account: 'My Brokerage',
        },
        {
          date: '02/18/2026',
          action: 'ELECTRONIC FUNDS TRANSFER',
          symbol: '',
          description: 'DIRECT DEPOSIT',
          quantity: 0,
          price: 0,
          totalAmount: 5000.0,
          account: 'My Brokerage',
        },
      ];

      mockPrisma.accounts.findFirst.mockResolvedValue({
        id: 'account-123',
        name: 'My Brokerage',
      });
      mockPrisma.universe.findFirst
        .mockResolvedValueOnce({ id: 'universe-spy', symbol: 'SPY' })
        .mockResolvedValueOnce({ id: 'universe-aapl', symbol: 'AAPL' })
        .mockResolvedValueOnce({ id: 'universe-spy', symbol: 'SPY' });
      mockPrisma.divDepositType.findFirst
        .mockResolvedValueOnce({ id: 'type-dividend', name: 'Dividend' })
        .mockResolvedValueOnce({
          id: 'type-cash-deposit',
          name: 'Cash Deposit',
        });

      const result = await mapFidelityTransactions(rows);

      expect(result.trades).toHaveLength(1);
      expect(result.sales).toHaveLength(1);
      expect(result.divDeposits).toHaveLength(2);
      expect(result.unknownTransactions).toHaveLength(0);
    });
  });
});
