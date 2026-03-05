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
      }).toThrow('does not match web format');
    });

    test('should throw error for CSV with incorrect header columns', function () {
      const csv = ['Wrong,Headers,Here', '02/15/2026,YOU BOUGHT,SPY'].join(
        '\n'
      );

      expect(function () {
        parseFidelityCsv(csv);
      }).toThrow('does not match web format');
    });

    test('should list all missing columns in error message', function () {
      const csv = ['Run Date,Account', '02/15/2026,My Brokerage'].join('\n');

      expect(function () {
        parseFidelityCsv(csv);
      }).toThrow(
        'does not match web format (missing: Action, Symbol, Description, Price ($), Quantity, Amount ($))'
      );
    });

    test('should throw error for row with too few columns', function () {
      const csv = [HEADER, '02/15/2026,YOU BOUGHT,SPY'].join('\n');

      expect(function () {
        parseFidelityCsv(csv);
      }).toThrow('expected at least');
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

  describe('extra columns handling (web format with extra columns)', function () {
    const DESKTOP_HEADER =
      'Run Date,Account,Account Number,Action,Symbol,Description,Type,Exchange Quantity,Exchange Currency,Price ($),Quantity,Commission ($),Fees ($),Accrued Interest ($),Amount ($),Settlement Date,Cash Balance';

    test('should accept CSV with extra columns', function () {
      const csv = [
        DESKTOP_HEADER,
        '02/15/2026,My Brokerage,12345678,YOU BOUGHT,SPY,SPDR S&P 500 ETF,Stock,,USD,450.25,10,,,,-4502.50,02/15/2026,10000.00',
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

    test('should correctly map columns by header name regardless of position', function () {
      const reorderedHeader =
        'Account,Run Date,Symbol,Action,Description,Quantity,Price ($),Amount ($)';
      const csv = [
        reorderedHeader,
        'My Brokerage,02/15/2026,SPY,YOU BOUGHT,SPDR S&P 500 ETF,10,450.25,-4502.50',
      ].join('\n');

      const result = parseFidelityCsv(csv);

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('02/15/2026');
      expect(result[0].account).toBe('My Brokerage');
      expect(result[0].symbol).toBe('SPY');
      expect(result[0].action).toBe('YOU BOUGHT');
      expect(result[0].quantity).toBe(10);
      expect(result[0].price).toBe(450.25);
      expect(result[0].totalAmount).toBe(-4502.5);
    });

    test('should accept header with only required columns', function () {
      const minimalHeader =
        'Run Date,Account,Action,Symbol,Description,Price ($),Quantity,Amount ($)';
      const csv = [
        minimalHeader,
        '02/15/2026,My Brokerage,YOU BOUGHT,SPY,SPDR S&P 500 ETF,450.25,10,-4502.50',
      ].join('\n');

      const result = parseFidelityCsv(csv);

      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('SPY');
      expect(result[0].price).toBe(450.25);
    });

    test('should throw for row with fewer columns than highest required index', function () {
      const csv = [
        DESKTOP_HEADER,
        '02/15/2026,My Brokerage,12345678,YOU BOUGHT,SPY',
      ].join('\n');

      expect(function () {
        parseFidelityCsv(csv);
      }).toThrow('expected at least');
    });
  });

  describe('desktop format parsing', function () {
    const DESKTOP_FORMAT_HEADER =
      'Date,Description,Symbol,Quantity,Price,Amount,Cash Balance,Security Description,Commission,Fees,Account';

    test('should parse a desktop dividend row', function () {
      const csv = [
        DESKTOP_FORMAT_HEADER,
        'Dec-31-2025,DIVIDEND RECEIVED,XFLT,--,--,65.24,"+5,763.43",XAI OCTAGON FLOATING RATE &ALTERNA COMMON SHS BENEFICIAL INTEREST USD0.01,--,--,Joint Brokerage *4767',
      ].join('\n');

      const result = parseFidelityCsv(csv);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        date: '12/31/2025',
        action: 'DIVIDEND RECEIVED',
        symbol: 'XFLT',
        description:
          'XAI OCTAGON FLOATING RATE &ALTERNA COMMON SHS BENEFICIAL INTEREST USD0.01',
        quantity: 0,
        price: 0,
        totalAmount: 65.24,
        account: 'Joint Brokerage *4767',
      });
    });

    test('should parse a desktop reinvestment row', function () {
      const csv = [
        DESKTOP_FORMAT_HEADER,
        'Dec-31-2025,REINVESTMENT REINVEST @ $1.000,SPAXX,9.57,1.00,-9.57,"+4,442.47",FIDELITY GOVERNMENT MONEY MARKET,--,--,Joint Brokerage *4767',
      ].join('\n');

      const result = parseFidelityCsv(csv);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        date: '12/31/2025',
        action: 'REINVESTMENT REINVEST @ $1.000',
        symbol: 'SPAXX',
        description: 'FIDELITY GOVERNMENT MONEY MARKET',
        quantity: 9.57,
        price: 1.0,
        totalAmount: -9.57,
        account: 'Joint Brokerage *4767',
      });
    });

    test('should parse a desktop purchase row with quoted negative amount', function () {
      const csv = [
        DESKTOP_FORMAT_HEADER,
        'Oct-13-2025,YOU BOUGHT,88634T493,400,13.06,"-5,226.00","+4,409.22",TIDAL TR II YIELDMAX MSTR OP...,--,--,Joint Brokerage *4767',
      ].join('\n');

      const result = parseFidelityCsv(csv);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        date: '10/13/2025',
        action: 'YOU BOUGHT',
        symbol: '88634T493',
        description: 'TIDAL TR II YIELDMAX MSTR OP...',
        quantity: 400,
        price: 13.06,
        totalAmount: -5226.0,
        account: 'Joint Brokerage *4767',
      });
    });

    test('should convert single-digit day with zero padding', function () {
      const csv = [
        DESKTOP_FORMAT_HEADER,
        'Dec-8-2025,REVERSE SPLIT R/S FROM 88634T493#REOR M0051704770001,MSTY,80,--,--,"+2,637.48",TIDAL TRUST II YIELDMAX MSTR OP,--,--,Joint Brokerage *4767',
      ].join('\n');

      const result = parseFidelityCsv(csv);

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('12/08/2025');
      expect(result[0].action).toBe(
        'REVERSE SPLIT R/S FROM 88634T493#REOR M0051704770001'
      );
      expect(result[0].symbol).toBe('MSTY');
      expect(result[0].quantity).toBe(80);
      expect(result[0].price).toBe(0);
      expect(result[0].totalAmount).toBe(0);
    });

    test('should parse multiple desktop rows', function () {
      const csv = [
        DESKTOP_FORMAT_HEADER,
        'Dec-31-2025,DIVIDEND RECEIVED,XFLT,--,--,65.24,"+5,763.43",XAI OCTAGON FLOATING RATE &ALTERNA COMMON SHS BENEFICIAL INTEREST USD0.01,--,--,Joint Brokerage *4767',
        'Dec-31-2025,REINVESTMENT REINVEST @ $1.000,SPAXX,9.57,1.00,-9.57,"+4,442.47",FIDELITY GOVERNMENT MONEY MARKET,--,--,Joint Brokerage *4767',
        'Dec-8-2025,REVERSE SPLIT R/S FROM 88634T493#REOR M0051704770001,MSTY,80,--,--,"+2,637.48",TIDAL TRUST II YIELDMAX MSTR OP,--,--,Joint Brokerage *4767',
        'Oct-13-2025,YOU BOUGHT,88634T493,400,13.06,"-5,226.00","+4,409.22",TIDAL TR II YIELDMAX MSTR OP...,--,--,Joint Brokerage *4767',
      ].join('\n');

      const result = parseFidelityCsv(csv);

      expect(result).toHaveLength(4);
      expect(result[0].symbol).toBe('XFLT');
      expect(result[1].symbol).toBe('SPAXX');
      expect(result[2].symbol).toBe('MSTY');
      expect(result[3].symbol).toBe('88634T493');
    });

    test('should treat -- as zero for numeric fields', function () {
      const csv = [
        DESKTOP_FORMAT_HEADER,
        'Jan-15-2026,DIVIDEND RECEIVED,TEST,--,--,50.00,100.00,TEST FUND,--,--,My Account',
      ].join('\n');

      const result = parseFidelityCsv(csv);

      expect(result).toHaveLength(1);
      expect(result[0].quantity).toBe(0);
      expect(result[0].price).toBe(0);
      expect(result[0].totalAmount).toBe(50.0);
    });

    test('should auto-detect desktop format by headers', function () {
      const csv = [
        DESKTOP_FORMAT_HEADER,
        'Feb-01-2026,YOU BOUGHT,SPY,10,450.25,-4502.50,10000.00,SPDR S&P 500 ETF,--,--,My Brokerage',
      ].join('\n');

      const result = parseFidelityCsv(csv);

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('02/01/2026');
      expect(result[0].action).toBe('YOU BOUGHT');
      expect(result[0].description).toBe('SPDR S&P 500 ETF');
    });

    test('should return empty array for desktop header-only CSV', function () {
      const csv = DESKTOP_FORMAT_HEADER;

      const result = parseFidelityCsv(csv);

      expect(result).toEqual([]);
    });

    test('should throw for desktop row with too few columns', function () {
      const csv = [DESKTOP_FORMAT_HEADER, 'Dec-31-2025,DIVIDEND,XFLT'].join(
        '\n'
      );

      expect(function () {
        parseFidelityCsv(csv);
      }).toThrow('expected at least');
    });
  });
});
