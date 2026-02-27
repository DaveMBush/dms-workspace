import { describe, expect, test } from 'vitest';

import { parseFidelityCsv } from './fidelity-csv-parser.function';

describe('parseFidelityCsv', function () {
  const HEADER =
    'Run Date,Account,Account Number,Action,Symbol,Description,Type,Price ($),Quantity,Commission ($),Fees ($),Accrued Interest ($),Amount ($),Settlement Date';

  describe('valid CSV parsing', function () {
    test('should parse a single purchase row', function () {
      const csv = [
        HEADER,
        '02/15/2026,My Brokerage,12345678,YOU BOUGHT,SPY,SPDR S&P 500 ETF,Stock,450.25,10,,,,-4502.50,02/15/2026',
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
        HEADER,
        '02/15/2026,My Brokerage,12345678,YOU BOUGHT,SPY,SPDR S&P 500 ETF,Stock,450.25,10,,,,-4502.50,02/15/2026',
        '02/16/2026,My Brokerage,12345678,YOU SOLD,AAPL,APPLE INC,Stock,185.00,5,,,,925.00,02/16/2026',
        '02/17/2026,My Brokerage,12345678,DIVIDEND RECEIVED,SPY,SPDR S&P 500 ETF,Cash,0,0,,,,15.75,02/17/2026',
      ].join('\n');

      const result = parseFidelityCsv(csv);

      expect(result).toHaveLength(3);
    });

    test('should parse a sale row', function () {
      const csv = [
        HEADER,
        '02/16/2026,My Brokerage,12345678,YOU SOLD,AAPL,APPLE INC,Stock,185.00,5,,,,925.00,02/16/2026',
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
        HEADER,
        '02/17/2026,My Brokerage,12345678,DIVIDEND RECEIVED,SPY,SPDR S&P 500 ETF,Cash,0,0,,,,15.75,02/17/2026',
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
        HEADER,
        '02/18/2026,My Brokerage,12345678,ELECTRONIC FUNDS TRANSFER,,DIRECT DEPOSIT,Cash,0,0,,,,5000.00,02/18/2026',
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
        HEADER,
        ' 02/15/2026 , My Brokerage , 12345678 , YOU BOUGHT , SPY , SPDR S&P 500 ETF , Stock , 450.25 , 10 , , , , -4502.50 , 02/15/2026 ',
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
        HEADER,
        '02/15/2026,My Brokerage,12345678,YOU BOUGHT,SPY,SPDR S&P 500 ETF,Stock,450.25,10,,,,-4502.50,02/15/2026',
        '',
      ].join('\n');

      const result = parseFidelityCsv(csv);

      expect(result).toHaveLength(1);
    });

    test('should handle CSV with Windows line endings', function () {
      const csv = [
        HEADER,
        '02/15/2026,My Brokerage,12345678,YOU BOUGHT,SPY,SPDR S&P 500 ETF,Stock,450.25,10,,,,-4502.50,02/15/2026',
      ].join('\r\n');

      const result = parseFidelityCsv(csv);

      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('SPY');
    });
  });

  describe('invalid CSV handling', function () {
    test('should throw error for CSV with missing header', function () {
      const csv =
        '02/15/2026,My Brokerage,12345678,YOU BOUGHT,SPY,SPDR S&P 500 ETF,Stock,450.25,10,,,,-4502.50,02/15/2026';

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
      const csv = [HEADER, '02/15/2026,YOU BOUGHT,SPY'].join('\n');

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
      const csv = HEADER;

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
        HEADER,
        '02/15/2026,My Brokerage,12345678,YOU BOUGHT,SPY,SPDR S&P 500 ETF,Stock,450.25,abc,,,,-4502.50,02/15/2026',
      ].join('\n');

      expect(function () {
        parseFidelityCsv(csv);
      }).toThrow();
    });

    test('should throw error for non-numeric price', function () {
      const csv = [
        HEADER,
        '02/15/2026,My Brokerage,12345678,YOU BOUGHT,SPY,SPDR S&P 500 ETF,Stock,not-a-price,10,,,,-4502.50,02/15/2026',
      ].join('\n');

      expect(function () {
        parseFidelityCsv(csv);
      }).toThrow();
    });

    test('should throw error for non-numeric total amount', function () {
      const csv = [
        HEADER,
        '02/15/2026,My Brokerage,12345678,YOU BOUGHT,SPY,SPDR S&P 500 ETF,Stock,450.25,10,,,,invalid,02/15/2026',
      ].join('\n');

      expect(function () {
        parseFidelityCsv(csv);
      }).toThrow();
    });

    test('should handle dollar signs and commas in numeric fields', function () {
      const csv = [
        HEADER,
        '02/15/2026,My Brokerage,12345678,YOU BOUGHT,SPY,SPDR S&P 500 ETF,Stock,$450.25,10,,,,"-$4,502.50",02/15/2026',
      ].join('\n');

      const result = parseFidelityCsv(csv);

      expect(result).toHaveLength(1);
      expect(result[0].price).toBe(450.25);
      expect(result[0].totalAmount).toBe(-4502.5);
    });

    test('should handle empty numeric fields (defaults to 0)', function () {
      const csv = [
        HEADER,
        '06/30/2025,My Brokerage,12345678,DIVIDEND RECEIVED,SPY,SPDR S&P 500 ETF,Cash,,0,,,,40.50,06/30/2025',
      ].join('\n');

      const result = parseFidelityCsv(csv);

      expect(result).toHaveLength(1);
      expect(result[0].price).toBe(0);
      expect(result[0].quantity).toBe(0);
      expect(result[0].totalAmount).toBe(40.5);
    });
  });
});
