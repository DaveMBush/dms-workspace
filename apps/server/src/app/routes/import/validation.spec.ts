import { describe, expect, test, vi, beforeEach, type Mock } from 'vitest';

vi.mock('../../prisma/prisma-client', function () {
  return {
    prisma: {
      accounts: {
        findFirst: vi.fn(),
      },
      universe: {
        findFirst: vi.fn(),
      },
      trades: {
        findFirst: vi.fn(),
      },
    },
  };
});

describe('Transaction Validation', function () {
  let prisma: {
    accounts: { findFirst: Mock };
    universe: { findFirst: Mock };
    trades: { findFirst: Mock };
  };

  beforeEach(async function () {
    vi.clearAllMocks();
    const prismaModule = await import('../../prisma/prisma-client');
    prisma = (prismaModule as unknown as { prisma: typeof prisma }).prisma;
  });

  describe.skip('account validation', function () {
    test('should accept account that exists in database', async function () {
      prisma.accounts.findFirst.mockResolvedValue({
        id: 'account-123',
        name: 'My Brokerage',
      });

      const mod = await import('./validate-transaction.function');
      const result = mod.validateAccount('My Brokerage');

      expect(result).toEqual({ valid: true, accountId: 'account-123' });
    });

    test('should reject account not found in database', async function () {
      prisma.accounts.findFirst.mockResolvedValue(null);

      const mod = await import('./validate-transaction.function');
      const result = mod.validateAccount('Nonexistent Account');

      expect(result).toEqual({
        valid: false,
        error: expect.stringContaining('not found'),
      });
    });

    test('should perform case-insensitive account matching', async function () {
      prisma.accounts.findFirst.mockResolvedValue({
        id: 'account-123',
        name: 'My Brokerage',
      });

      const mod = await import('./validate-transaction.function');
      const result = mod.validateAccount('my brokerage');

      expect(result).toEqual({ valid: true, accountId: 'account-123' });
    });

    test('should return descriptive error for non-existent account', async function () {
      prisma.accounts.findFirst.mockResolvedValue(null);

      const mod = await import('./validate-transaction.function');
      const result = mod.validateAccount('Roth 401k');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Roth 401k');
      expect(result.error).toContain('not found');
    });
  });

  describe.skip('symbol validation', function () {
    test('should accept valid uppercase symbol', async function () {
      const mod = await import('./validate-transaction.function');
      const result = mod.validateSymbol('SPY');

      expect(result).toEqual({ valid: true });
    });

    test('should accept symbol with 1 to 5 characters', async function () {
      const mod = await import('./validate-transaction.function');

      expect(mod.validateSymbol('A').valid).toBe(true);
      expect(mod.validateSymbol('AB').valid).toBe(true);
      expect(mod.validateSymbol('ABC').valid).toBe(true);
      expect(mod.validateSymbol('ABCD').valid).toBe(true);
      expect(mod.validateSymbol('ABCDE').valid).toBe(true);
    });

    test('should reject empty symbol', async function () {
      const mod = await import('./validate-transaction.function');
      const result = mod.validateSymbol('');

      expect(result).toEqual({
        valid: false,
        error: expect.stringContaining('required'),
      });
    });

    test('should reject symbol with special characters', async function () {
      const mod = await import('./validate-transaction.function');
      const result = mod.validateSymbol('SP@Y');

      expect(result).toEqual({
        valid: false,
        error: expect.stringContaining('invalid'),
      });
    });

    test('should allow wider symbol format for international symbols', async function () {
      const mod = await import('./validate-transaction.function');
      const result = mod.validateSymbol('BABA.HK');

      expect(result.valid).toBe(true);
    });
  });

  describe.skip('numeric field validation', function () {
    describe('quantity validation', function () {
      test('should accept positive quantity', async function () {
        const mod = await import('./validate-transaction.function');
        const result = mod.validateQuantity(10);

        expect(result).toEqual({ valid: true });
      });

      test('should reject zero quantity for purchases and sales', async function () {
        const mod = await import('./validate-transaction.function');
        const result = mod.validateQuantity(0, 'purchase');

        expect(result).toEqual({
          valid: false,
          error: expect.stringContaining('positive'),
        });
      });

      test('should reject negative quantity', async function () {
        const mod = await import('./validate-transaction.function');
        const result = mod.validateQuantity(-5);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('positive');
      });

      test('should accept decimal quantity (fractional shares)', async function () {
        const mod = await import('./validate-transaction.function');
        const result = mod.validateQuantity(3.5);

        expect(result).toEqual({ valid: true });
      });

      test('should reject NaN quantity', async function () {
        const mod = await import('./validate-transaction.function');
        const result = mod.validateQuantity(NaN);

        expect(result.valid).toBe(false);
      });
    });

    describe('price validation', function () {
      test('should accept positive price', async function () {
        const mod = await import('./validate-transaction.function');
        const result = mod.validatePrice(450.25);

        expect(result).toEqual({ valid: true });
      });

      test('should reject zero price for purchases and sales', async function () {
        const mod = await import('./validate-transaction.function');
        const result = mod.validatePrice(0, 'purchase');

        expect(result).toEqual({
          valid: false,
          error: expect.stringContaining('positive'),
        });
      });

      test('should reject negative price', async function () {
        const mod = await import('./validate-transaction.function');
        const result = mod.validatePrice(-10);

        expect(result.valid).toBe(false);
      });

      test('should handle price with many decimal places', async function () {
        const mod = await import('./validate-transaction.function');
        const result = mod.validatePrice(123.456789);

        expect(result).toEqual({ valid: true });
      });

      test('should reject NaN price', async function () {
        const mod = await import('./validate-transaction.function');
        const result = mod.validatePrice(NaN);

        expect(result.valid).toBe(false);
      });
    });

    describe('amount validation', function () {
      test('should accept valid total amount', async function () {
        const mod = await import('./validate-transaction.function');
        const result = mod.validateAmount(-4502.5);

        expect(result).toEqual({ valid: true });
      });

      test('should reject NaN amount', async function () {
        const mod = await import('./validate-transaction.function');
        const result = mod.validateAmount(NaN);

        expect(result.valid).toBe(false);
      });

      test('should accept zero amount for dividends/deposits', async function () {
        const mod = await import('./validate-transaction.function');
        const result = mod.validateAmount(0);

        expect(result).toEqual({ valid: true });
      });

      test('should handle very large numbers', async function () {
        const mod = await import('./validate-transaction.function');
        const result = mod.validateAmount(999999999.99);

        expect(result).toEqual({ valid: true });
      });

      test('should handle very small numbers (precision)', async function () {
        const mod = await import('./validate-transaction.function');
        const result = mod.validateAmount(0.01);

        expect(result).toEqual({ valid: true });
      });
    });
  });

  describe.skip('date validation', function () {
    test('should accept valid MM/DD/YYYY date', async function () {
      const mod = await import('./validate-transaction.function');
      const result = mod.validateDate('02/15/2026');

      expect(result).toEqual({ valid: true });
    });

    test('should reject invalid date format', async function () {
      const mod = await import('./validate-transaction.function');
      const result = mod.validateDate('2026-02-15');

      expect(result).toEqual({
        valid: false,
        error: expect.stringContaining('format'),
      });
    });

    test('should reject future dates', async function () {
      const mod = await import('./validate-transaction.function');
      const result = mod.validateDate('12/31/2099');

      expect(result).toEqual({
        valid: false,
        error: expect.stringContaining('future'),
      });
    });

    test('should reject very old dates', async function () {
      const mod = await import('./validate-transaction.function');
      const result = mod.validateDate('01/01/1900');

      expect(result).toEqual({
        valid: false,
        error: expect.stringContaining('old'),
      });
    });

    test('should reject empty date string', async function () {
      const mod = await import('./validate-transaction.function');
      const result = mod.validateDate('');

      expect(result.valid).toBe(false);
    });

    test('should reject malformed date like 13/32/2026', async function () {
      const mod = await import('./validate-transaction.function');
      const result = mod.validateDate('13/32/2026');

      expect(result.valid).toBe(false);
    });

    test('should accept date in various valid formats', async function () {
      const mod = await import('./validate-transaction.function');

      expect(mod.validateDate('01/01/2020').valid).toBe(true);
      expect(mod.validateDate('12/31/2025').valid).toBe(true);
    });

    test('should reject date with text', async function () {
      const mod = await import('./validate-transaction.function');
      const result = mod.validateDate('not-a-date');

      expect(result.valid).toBe(false);
    });
  });

  describe.skip('duplicate transaction detection', function () {
    test('should detect same transaction appearing multiple times in file', async function () {
      const mod = await import('./validate-transaction.function');
      const rows = [
        {
          date: '02/15/2026',
          action: 'YOU BOUGHT',
          symbol: 'SPY',
          quantity: 10,
          price: 450.25,
          account: 'My Brokerage',
        },
        {
          date: '02/15/2026',
          action: 'YOU BOUGHT',
          symbol: 'SPY',
          quantity: 10,
          price: 450.25,
          account: 'My Brokerage',
        },
      ];

      const duplicates = mod.detectDuplicatesInFile(rows);

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0]).toEqual(expect.objectContaining({ row: 2 }));
    });

    test('should detect transaction already in database', async function () {
      prisma.trades.findFirst.mockResolvedValue({
        id: 'existing-trade',
        universeId: 'u1',
        accountId: 'a1',
        buy: 450.25,
        buy_date: new Date('2026-02-15'),
        quantity: 10,
      });

      const mod = await import('./validate-transaction.function');
      const result = await mod.detectDuplicateInDb({
        accountId: 'a1',
        universeId: 'u1',
        date: '2026-02-15',
        quantity: 10,
        price: 450.25,
      });

      expect(result.isDuplicate).toBe(true);
    });

    test('should not flag as duplicate when quantity or price differs', async function () {
      prisma.trades.findFirst.mockResolvedValue(null);

      const mod = await import('./validate-transaction.function');
      const result = await mod.detectDuplicateInDb({
        accountId: 'a1',
        universeId: 'u1',
        date: '2026-02-15',
        quantity: 20,
        price: 450.25,
      });

      expect(result.isDuplicate).toBe(false);
    });

    test('should allow same symbol/date if quantity/price differ', async function () {
      const mod = await import('./validate-transaction.function');
      const rows = [
        {
          date: '02/15/2026',
          action: 'YOU BOUGHT',
          symbol: 'SPY',
          quantity: 10,
          price: 450.25,
          account: 'My Brokerage',
        },
        {
          date: '02/15/2026',
          action: 'YOU BOUGHT',
          symbol: 'SPY',
          quantity: 5,
          price: 451.0,
          account: 'My Brokerage',
        },
      ];

      const duplicates = mod.detectDuplicatesInFile(rows);

      expect(duplicates).toHaveLength(0);
    });

    test('should report duplicates as warnings not errors', async function () {
      prisma.trades.findFirst.mockResolvedValue({
        id: 'existing-trade',
      });

      const mod = await import('./validate-transaction.function');
      const result = await mod.detectDuplicateInDb({
        accountId: 'a1',
        universeId: 'u1',
        date: '2026-02-15',
        quantity: 10,
        price: 450.25,
      });

      expect(result.isDuplicate).toBe(true);
      expect(result.severity).toBe('warning');
    });
  });

  describe.skip('error reporting', function () {
    test('should include row number in error message', async function () {
      const mod = await import('./validate-transaction.function');
      const error = mod.formatValidationError(
        5,
        'account',
        'Account not found'
      );

      expect(error.row).toBe(5);
    });

    test('should include field name in error message', async function () {
      const mod = await import('./validate-transaction.function');
      const error = mod.formatValidationError(
        5,
        'account',
        'Account not found'
      );

      expect(error.field).toBe('account');
    });

    test('should produce user-friendly error message', async function () {
      const mod = await import('./validate-transaction.function');
      const error = mod.formatValidationError(
        5,
        'account',
        "Account 'Roth 401k' not found"
      );

      expect(error.message).toBe("Account 'Roth 401k' not found");
    });

    test('should aggregate multiple errors per row', async function () {
      const mod = await import('./validate-transaction.function');
      const errors = [
        { row: 5, field: 'account', message: 'Account not found' },
        { row: 5, field: 'quantity', message: 'Quantity must be positive' },
        { row: 8, field: 'date', message: 'Invalid date format' },
      ];

      const aggregated = mod.aggregateErrors(errors);

      expect(aggregated[5]).toHaveLength(2);
      expect(aggregated[8]).toHaveLength(1);
    });

    test('should collect all errors not just first error', async function () {
      const mod = await import('./validate-transaction.function');
      const row = {
        date: 'invalid',
        action: 'YOU BOUGHT',
        symbol: '',
        description: 'Test',
        quantity: -1,
        price: 0,
        totalAmount: 0,
        account: 'Unknown',
      };

      const errors = mod.validateRow(row, 5);

      expect(errors.length).toBeGreaterThan(1);
    });

    test('should report successful rows separately', async function () {
      const mod = await import('./validate-transaction.function');
      const rows = [
        {
          date: '02/15/2026',
          action: 'YOU BOUGHT',
          symbol: 'SPY',
          description: 'SPDR',
          quantity: 10,
          price: 450.25,
          totalAmount: -4502.5,
          account: 'My Brokerage',
        },
        {
          date: 'invalid',
          action: 'YOU BOUGHT',
          symbol: '',
          description: 'Bad',
          quantity: -1,
          price: 0,
          totalAmount: 0,
          account: 'Unknown',
        },
      ];

      const result = mod.validateRows(rows);

      expect(result.validRows).toHaveLength(1);
      expect(result.errors).not.toHaveLength(0);
    });

    test('should generate warning for suspicious data', async function () {
      const mod = await import('./validate-transaction.function');
      const warning = mod.checkAmountMismatch(10, 150.5, 1506.0, 10);

      expect(warning).not.toBeNull();
      expect(warning.row).toBe(10);
      expect(warning.message).toContain("doesn't match");
    });
  });

  describe.skip('edge cases', function () {
    test('should report error for missing required fields', async function () {
      const mod = await import('./validate-transaction.function');
      const row = {
        date: '',
        action: '',
        symbol: '',
        description: '',
        quantity: 0,
        price: 0,
        totalAmount: 0,
        account: '',
      };

      const errors = mod.validateRow(row, 1);

      expect(errors.length).toBeGreaterThan(0);
    });

    test('should handle extra or unknown columns gracefully', async function () {
      const mod = await import('./validate-transaction.function');
      const row = {
        date: '02/15/2026',
        action: 'YOU BOUGHT',
        symbol: 'SPY',
        description: 'SPDR',
        quantity: 10,
        price: 450.25,
        totalAmount: -4502.5,
        account: 'My Brokerage',
        extraField: 'ignored',
      };

      const errors = mod.validateRow(row as any, 1);

      expect(errors).toHaveLength(0);
    });

    test('should warn when amount does not match quantity times price', async function () {
      const mod = await import('./validate-transaction.function');
      const warning = mod.checkAmountMismatch(10, 150.55, 1506.0, 5);

      expect(warning).not.toBeNull();
      expect(warning.message).toContain("doesn't match");
    });

    test('should not warn when amount matches quantity times price', async function () {
      const mod = await import('./validate-transaction.function');
      const warning = mod.checkAmountMismatch(10, 150.5, 1505.0, 5);

      expect(warning).toBeNull();
    });

    test('should handle very large numbers', async function () {
      const mod = await import('./validate-transaction.function');
      const result = mod.validateQuantity(999999999);

      expect(result).toEqual({ valid: true });
    });

    test('should handle very small numbers (precision)', async function () {
      const mod = await import('./validate-transaction.function');
      const result = mod.validateQuantity(0.001);

      expect(result).toEqual({ valid: true });
    });

    test('should validate action is a recognized transaction type', async function () {
      const mod = await import('./validate-transaction.function');

      expect(mod.validateAction('YOU BOUGHT').valid).toBe(true);
      expect(mod.validateAction('YOU SOLD').valid).toBe(true);
      expect(mod.validateAction('DIVIDEND RECEIVED').valid).toBe(true);
      expect(mod.validateAction('ELECTRONIC FUNDS TRANSFER').valid).toBe(true);
      expect(mod.validateAction('UNKNOWN ACTION').valid).toBe(false);
    });
  });
});
