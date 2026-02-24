import { describe, expect, test } from 'vitest';

import { parseFidelityCsv } from './fidelity-csv-parser.function';

describe.skip('parseFidelityCsv', function () {
  describe('valid CSV parsing', function () {
    test('should parse a single purchase row', function () {
      const csv = [
        'Date,Action,Symbol,Description,Quantity,Price,Total Amount,Account',
        '02/15/2026,YOU BOUGHT,SPY,SPDR S&P 500 ETF,10,450.25,-4502.50,My Brokerage',
      ].join('\n');

      const result = parseFidelityCsv(csv);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        date: '02/15/2026',
        action: 'YOU BOUGHT',
        symbol: 'SPY',
        description: 'SPDR S&P 500 ETF',
        quantity: 10,
        price: 450.25,
        totalAmount: -4502.5,
        account: 'My Brokerage',
      });
    });

    test('should parse multiple rows', function () {
      const csv = [
        'Date,Action,Symbol,Description,Quantity,Price,Total Amount,Account',
        '02/15/2026,YOU BOUGHT,SPY,SPDR S&P 500 ETF,10,450.25,-4502.50,My Brokerage',
        '02/16/2026,YOU SOLD,AAPL,APPLE INC,5,185.00,925.00,My Brokerage',
        '02/17/2026,DIVIDEND RECEIVED,SPY,SPDR S&P 500 ETF,0,0,15.75,My Brokerage',
      ].join('\n');

      const result = parseFidelityCsv(csv);

      expect(result).toHaveLength(3);
    });

    test('should parse a sale row', function () {
      const csv = [
        'Date,Action,Symbol,Description,Quantity,Price,Total Amount,Account',
        '02/16/2026,YOU SOLD,AAPL,APPLE INC,5,185.00,925.00,My Brokerage',
      ].join('\n');

      const result = parseFidelityCsv(csv);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        date: '02/16/2026',
        action: 'YOU SOLD',
        symbol: 'AAPL',
        description: 'APPLE INC',
        quantity: 5,
        price: 185.0,
        totalAmount: 925.0,
        account: 'My Brokerage',
      });
    });

    test('should parse a dividend row', function () {
      const csv = [
        'Date,Action,Symbol,Description,Quantity,Price,Total Amount,Account',
        '02/17/2026,DIVIDEND RECEIVED,SPY,SPDR S&P 500 ETF,0,0,15.75,My Brokerage',
      ].join('\n');

      const result = parseFidelityCsv(csv);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        date: '02/17/2026',
        action: 'DIVIDEND RECEIVED',
        symbol: 'SPY',
        description: 'SPDR S&P 500 ETF',
        quantity: 0,
        price: 0,
        totalAmount: 15.75,
        account: 'My Brokerage',
      });
    });

    test('should parse a cash deposit row', function () {
      const csv = [
        'Date,Action,Symbol,Description,Quantity,Price,Total Amount,Account',
        '02/18/2026,ELECTRONIC FUNDS TRANSFER,,DIRECT DEPOSIT,0,0,5000.00,My Brokerage',
      ].join('\n');

      const result = parseFidelityCsv(csv);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        date: '02/18/2026',
        action: 'ELECTRONIC FUNDS TRANSFER',
        symbol: '',
        description: 'DIRECT DEPOSIT',
        quantity: 0,
        price: 0,
        totalAmount: 5000.0,
        account: 'My Brokerage',
      });
    });

    test('should handle values with extra whitespace', function () {
      const csv = [
        'Date,Action,Symbol,Description,Quantity,Price,Total Amount,Account',
        ' 02/15/2026 , YOU BOUGHT , SPY , SPDR S&P 500 ETF , 10 , 450.25 , -4502.50 , My Brokerage ',
      ].join('\n');

      const result = parseFidelityCsv(csv);

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('02/15/2026');
      expect(result[0].action).toBe('YOU BOUGHT');
      expect(result[0].symbol).toBe('SPY');
      expect(result[0].account).toBe('My Brokerage');
    });

    test('should handle CSV with trailing newline', function () {
      const csv = [
        'Date,Action,Symbol,Description,Quantity,Price,Total Amount,Account',
        '02/15/2026,YOU BOUGHT,SPY,SPDR S&P 500 ETF,10,450.25,-4502.50,My Brokerage',
        '',
      ].join('\n');

      const result = parseFidelityCsv(csv);

      expect(result).toHaveLength(1);
    });

    test('should handle CSV with Windows line endings', function () {
      const csv = [
        'Date,Action,Symbol,Description,Quantity,Price,Total Amount,Account',
        '02/15/2026,YOU BOUGHT,SPY,SPDR S&P 500 ETF,10,450.25,-4502.50,My Brokerage',
      ].join('\r\n');

      const result = parseFidelityCsv(csv);

      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('SPY');
    });
  });

  describe('invalid CSV handling', function () {
    test('should throw error for CSV with missing header', function () {
      const csv =
        '02/15/2026,YOU BOUGHT,SPY,SPDR S&P 500 ETF,10,450.25,-4502.50,My Brokerage';

      expect(function () {
        parseFidelityCsv(csv);
      }).toThrow();
    });

    test('should throw error for CSV with incorrect header columns', function () {
      const csv = ['Wrong,Headers,Here', '02/15/2026,YOU BOUGHT,SPY'].join(
        '\n'
      );

      expect(function () {
        parseFidelityCsv(csv);
      }).toThrow();
    });

    test('should throw error for row with wrong number of columns', function () {
      const csv = [
        'Date,Action,Symbol,Description,Quantity,Price,Total Amount,Account',
        '02/15/2026,YOU BOUGHT,SPY',
      ].join('\n');

      expect(function () {
        parseFidelityCsv(csv);
      }).toThrow();
    });
  });

  describe('empty file handling', function () {
    test('should return empty array for empty string', function () {
      const result = parseFidelityCsv('');

      expect(result).toEqual([]);
    });

    test('should return empty array for header-only CSV', function () {
      const csv =
        'Date,Action,Symbol,Description,Quantity,Price,Total Amount,Account';

      const result = parseFidelityCsv(csv);

      expect(result).toEqual([]);
    });

    test('should return empty array for whitespace-only input', function () {
      const result = parseFidelityCsv('   \n\n  ');

      expect(result).toEqual([]);
    });
  });

  describe('malformed data handling', function () {
    test('should throw error for non-numeric quantity', function () {
      const csv = [
        'Date,Action,Symbol,Description,Quantity,Price,Total Amount,Account',
        '02/15/2026,YOU BOUGHT,SPY,SPDR S&P 500 ETF,abc,450.25,-4502.50,My Brokerage',
      ].join('\n');

      expect(function () {
        parseFidelityCsv(csv);
      }).toThrow();
    });

    test('should throw error for non-numeric price', function () {
      const csv = [
        'Date,Action,Symbol,Description,Quantity,Price,Total Amount,Account',
        '02/15/2026,YOU BOUGHT,SPY,SPDR S&P 500 ETF,10,not-a-price,-4502.50,My Brokerage',
      ].join('\n');

      expect(function () {
        parseFidelityCsv(csv);
      }).toThrow();
    });

    test('should throw error for non-numeric total amount', function () {
      const csv = [
        'Date,Action,Symbol,Description,Quantity,Price,Total Amount,Account',
        '02/15/2026,YOU BOUGHT,SPY,SPDR S&P 500 ETF,10,450.25,invalid,My Brokerage',
      ].join('\n');

      expect(function () {
        parseFidelityCsv(csv);
      }).toThrow();
    });

    test('should handle dollar signs and commas in numeric fields', function () {
      const csv = [
        'Date,Action,Symbol,Description,Quantity,Price,Total Amount,Account',
        '02/15/2026,YOU BOUGHT,SPY,SPDR S&P 500 ETF,10,$450.25,"-$4,502.50",My Brokerage',
      ].join('\n');

      const result = parseFidelityCsv(csv);

      expect(result).toHaveLength(1);
      expect(result[0].price).toBe(450.25);
      expect(result[0].totalAmount).toBe(-4502.5);
    });
  });
});
