import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../routes/settings/yahoo-finance.instance', function () {
  return {
    yahooFinance: {
      search: vi.fn(),
    },
  };
});

vi.mock('../../prisma/prisma-client', function () {
  return {
    prisma: {},
  };
});

vi.mock('./cusip-cache.service', function () {
  return {
    cusipCacheService: {
      findManyCusips: vi.fn(),
      upsertManyMappings: vi.fn(),
    },
  };
});

vi.mock('../../../utils/thirteenf-cusip.service', function () {
  return {
    resolveCusipViaThirteenf: vi.fn(),
  };
});

import { resolveCusipViaThirteenf } from '../../../utils/thirteenf-cusip.service';
import { yahooFinance } from '../../routes/settings/yahoo-finance.instance';
import { cusipCacheService } from './cusip-cache.service';
import { FidelityCsvRow } from './fidelity-csv-row.interface';
import { isCusip } from './is-cusip.function';
import { resolveCusipSymbols } from './resolve-cusip.function';

const mockResolveCusipViaThirteenf = resolveCusipViaThirteenf as ReturnType<
  typeof vi.fn
>;
const mockYahooSearch = yahooFinance.search as ReturnType<typeof vi.fn>;
const mockFindManyCusips = cusipCacheService.findManyCusips as ReturnType<
  typeof vi.fn
>;
const mockUpsertManyMappings =
  cusipCacheService.upsertManyMappings as ReturnType<typeof vi.fn>;

describe('isCusip', function () {
  test('should detect a valid 9-character CUSIP with digits', function () {
    expect(isCusip('88634T493')).toBe(true);
  });

  test('should detect an all-numeric CUSIP', function () {
    expect(isCusip('123456789')).toBe(true);
  });

  test('should reject a regular ticker symbol', function () {
    expect(isCusip('SPY')).toBe(false);
  });

  test('should reject a 5-letter ticker', function () {
    expect(isCusip('SPAXX')).toBe(false);
  });

  test('should reject an empty string', function () {
    expect(isCusip('')).toBe(false);
  });

  test('should reject 9 letters with no digits', function () {
    expect(isCusip('ABCDEFGHI')).toBe(false);
  });

  test('should reject a symbol with lowercase', function () {
    expect(isCusip('88634t493')).toBe(false);
  });

  test('should reject a symbol shorter than 9 characters', function () {
    expect(isCusip('8863T49')).toBe(false);
  });

  test('should reject a symbol longer than 9 characters', function () {
    expect(isCusip('88634T4930')).toBe(false);
  });
});

describe('resolveCusipSymbols', function () {
  beforeEach(function () {
    mockResolveCusipViaThirteenf.mockReset();
    mockYahooSearch.mockReset();
    mockFindManyCusips.mockReset();
    mockUpsertManyMappings.mockReset();
    // Default: 13f.info returns null (no match)
    mockResolveCusipViaThirteenf.mockResolvedValue(null);
    // Default: cache returns empty (cache miss)
    mockFindManyCusips.mockResolvedValue(new Map<string, string>());
    mockUpsertManyMappings.mockResolvedValue(undefined);
  });

  function createRow(symbol: string): FidelityCsvRow {
    return {
      date: '12/31/2025',
      action: 'YOU BOUGHT',
      symbol,
      description: 'TEST',
      quantity: 10,
      price: 100,
      totalAmount: -1000,
      account: 'My Brokerage',
    };
  }

  test('should resolve a CUSIP to a ticker symbol via 13f.info', async function () {
    const rows = [createRow('88634T493')];
    mockResolveCusipViaThirteenf.mockResolvedValue('MSTY');

    await resolveCusipSymbols(rows);

    expect(rows[0].symbol).toBe('MSTY');
    expect(mockResolveCusipViaThirteenf).toHaveBeenCalledWith('88634T493');
  });

  test('should keep original CUSIP when 13f.info returns null', async function () {
    const rows = [createRow('99999X999')];
    mockResolveCusipViaThirteenf.mockResolvedValue(null);

    await resolveCusipSymbols(rows);

    expect(rows[0].symbol).toBe('99999X999');
  });

  test('should keep original CUSIP when 13f.info throws', async function () {
    const rows = [createRow('88634T493')];
    mockResolveCusipViaThirteenf.mockRejectedValue(new Error('Network error'));

    await resolveCusipSymbols(rows);

    expect(rows[0].symbol).toBe('88634T493');
  });

  test('should not call API for regular ticker symbols', async function () {
    const rows = [createRow('SPY'), createRow('AAPL')];

    await resolveCusipSymbols(rows);

    expect(rows[0].symbol).toBe('SPY');
    expect(rows[1].symbol).toBe('AAPL');
    expect(mockResolveCusipViaThirteenf).not.toHaveBeenCalled();
  });

  test('should deduplicate CUSIPs in lookup', async function () {
    const rows = [createRow('88634T493'), createRow('88634T493')];
    mockResolveCusipViaThirteenf.mockResolvedValue('MSTY');

    await resolveCusipSymbols(rows);

    expect(rows[0].symbol).toBe('MSTY');
    expect(rows[1].symbol).toBe('MSTY');
    // Only one call since both CUSIPs are the same
    expect(mockResolveCusipViaThirteenf).toHaveBeenCalledTimes(1);
  });

  test('should resolve multiple different CUSIPs', async function () {
    const rows = [createRow('88634T493'), createRow('12345A678')];
    mockResolveCusipViaThirteenf
      .mockResolvedValueOnce('MSTY')
      .mockResolvedValueOnce('XYZ');

    await resolveCusipSymbols(rows);

    expect(rows[0].symbol).toBe('MSTY');
    expect(rows[1].symbol).toBe('XYZ');
    expect(mockResolveCusipViaThirteenf).toHaveBeenCalledTimes(2);
  });

  test('should skip empty symbols', async function () {
    const rows = [createRow('')];

    await resolveCusipSymbols(rows);

    expect(rows[0].symbol).toBe('');
    expect(mockResolveCusipViaThirteenf).not.toHaveBeenCalled();
  });

  test('should fall back to Yahoo Finance when 13f.info returns null', async function () {
    const rows: FidelityCsvRow[] = [
      {
        date: '12/31/2025',
        action: 'YOU BOUGHT',
        symbol: '691543102',
        description: 'OXFORD LANE CAPITAL CORP',
        quantity: 10,
        price: 5.0,
        totalAmount: -50.0,
        account: 'My Brokerage',
      },
    ];
    // 13f.info returns null
    mockResolveCusipViaThirteenf.mockResolvedValue(null);
    // Yahoo Finance returns OXLC
    mockYahooSearch.mockResolvedValue({
      quotes: [{ symbol: 'OXLC', quoteType: 'ETF' }],
    });

    await resolveCusipSymbols(rows);

    expect(rows[0].symbol).toBe('OXLC');
    expect(mockYahooSearch).toHaveBeenCalledWith('OXFORD LANE CAPITAL CORP', {
      quotesCount: 5,
      newsCount: 0,
    });
  });

  test('should fall back to Yahoo Finance when 13f.info throws network error', async function () {
    const rows: FidelityCsvRow[] = [
      {
        date: '12/31/2025',
        action: 'YOU BOUGHT',
        symbol: '691543102',
        description: 'OXFORD LANE CAPITAL CORP',
        quantity: 10,
        price: 5.0,
        totalAmount: -50.0,
        account: 'My Brokerage',
      },
    ];
    mockResolveCusipViaThirteenf.mockRejectedValue(new Error('Network error'));
    mockYahooSearch.mockResolvedValue({
      quotes: [{ symbol: 'OXLC', quoteType: 'ETF' }],
    });

    await resolveCusipSymbols(rows);

    expect(rows[0].symbol).toBe('OXLC');
  });

  test('should not call Yahoo Finance fallback when 13f.info resolves', async function () {
    const rows = [createRow('88634T493')];
    mockResolveCusipViaThirteenf.mockResolvedValue('MSTY');

    await resolveCusipSymbols(rows);

    expect(rows[0].symbol).toBe('MSTY');
    expect(mockYahooSearch).not.toHaveBeenCalled();
  });

  test('should keep CUSIP when both 13f.info and Yahoo Finance fail', async function () {
    const rows: FidelityCsvRow[] = [
      {
        date: '12/31/2025',
        action: 'YOU BOUGHT',
        symbol: '999999999',
        description: 'UNKNOWN FUND',
        quantity: 1,
        price: 1,
        totalAmount: -1,
        account: 'My Brokerage',
      },
    ];
    mockResolveCusipViaThirteenf.mockResolvedValue(null);
    mockYahooSearch.mockResolvedValue({ quotes: [] });

    await resolveCusipSymbols(rows);

    expect(rows[0].symbol).toBe('999999999');
  });

  test('should prefer EQUITY/ETF results from Yahoo Finance fallback', async function () {
    const rows: FidelityCsvRow[] = [
      {
        date: '12/31/2025',
        action: 'YOU BOUGHT',
        symbol: '691543102',
        description: 'OXFORD LANE CAPITAL CORP',
        quantity: 10,
        price: 5.0,
        totalAmount: -50.0,
        account: 'My Brokerage',
      },
    ];
    mockResolveCusipViaThirteenf.mockResolvedValue(null);
    mockYahooSearch.mockResolvedValue({
      quotes: [
        { symbol: 'OXLC.IDX', quoteType: 'INDEX' },
        { symbol: 'OXLC', quoteType: 'EQUITY' },
      ],
    });

    await resolveCusipSymbols(rows);

    expect(rows[0].symbol).toBe('OXLC');
  });

  // === Cache Integration Tests (AC: 11-14) ===

  describe('cache integration', function () {
    test('should check cache before making API calls', async function () {
      const rows = [createRow('88634T493')];
      mockFindManyCusips.mockResolvedValue(
        new Map<string, string>([['88634T493', 'MSTY']])
      );

      await resolveCusipSymbols(rows);
      expect(rows[0].symbol).toBe('MSTY');
      expect(mockResolveCusipViaThirteenf).not.toHaveBeenCalled();
      expect(mockYahooSearch).not.toHaveBeenCalled();
    });

    test('should trigger 13f.info lookup on cache miss', async function () {
      const rows = [createRow('88634T493')];
      mockFindManyCusips.mockResolvedValue(new Map<string, string>());
      mockResolveCusipViaThirteenf.mockResolvedValue('MSTY');

      await resolveCusipSymbols(rows);
      expect(rows[0].symbol).toBe('MSTY');
      expect(mockResolveCusipViaThirteenf).toHaveBeenCalled();
    });

    test('should bypass both 13f.info and Yahoo Finance on cache hit', async function () {
      const rows: FidelityCsvRow[] = [
        {
          date: '12/31/2025',
          action: 'YOU BOUGHT',
          symbol: '691543102',
          description: 'OXFORD LANE CAPITAL CORP',
          quantity: 10,
          price: 5.0,
          totalAmount: -50.0,
          account: 'My Brokerage',
        },
      ];
      mockFindManyCusips.mockResolvedValue(
        new Map<string, string>([['691543102', 'OXLC']])
      );

      await resolveCusipSymbols(rows);
      expect(rows[0].symbol).toBe('OXLC');
      expect(mockResolveCusipViaThirteenf).not.toHaveBeenCalled();
      expect(mockYahooSearch).not.toHaveBeenCalled();
    });

    test('should cache 13f.info results with source THIRTEENF', async function () {
      const rows = [createRow('88634T493')];
      mockFindManyCusips.mockResolvedValue(new Map<string, string>());
      mockResolveCusipViaThirteenf.mockResolvedValue('MSTY');

      await resolveCusipSymbols(rows);
      expect(rows[0].symbol).toBe('MSTY');

      expect(mockUpsertManyMappings).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            cusip: '88634T493',
            symbol: 'MSTY',
            source: 'THIRTEENF',
          }),
        ])
      );
    });
  });

  // === Regression Tests: Previously Failing CUSIPs (Story 2.4) ===

  describe('regression: previously failing CUSIPs resolve via 13f.info', function () {
    test('should resolve 691543102 to OXLC via 13f.info', async function () {
      const rows: FidelityCsvRow[] = [
        {
          date: '12/31/2025',
          action: 'YOU BOUGHT',
          symbol: '691543102',
          description: 'OXFORD LANE CAPITAL CORP',
          quantity: 10,
          price: 5.0,
          totalAmount: -50.0,
          account: 'My Brokerage',
        },
      ];
      mockResolveCusipViaThirteenf.mockResolvedValue('OXLC');

      await resolveCusipSymbols(rows);

      expect(rows[0].symbol).toBe('OXLC');
      expect(mockResolveCusipViaThirteenf).toHaveBeenCalledWith('691543102');
      expect(mockUpsertManyMappings).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            cusip: '691543102',
            symbol: 'OXLC',
            source: 'THIRTEENF',
          }),
        ])
      );
    });

    test('should resolve 88636J527 to ULTY via 13f.info', async function () {
      const rows: FidelityCsvRow[] = [
        {
          date: '12/31/2025',
          action: 'YOU BOUGHT',
          symbol: '88636J527',
          description: 'YIELDMAX ULTRA OPTION INCOME STRATEGY ETF',
          quantity: 20,
          price: 10.0,
          totalAmount: -200.0,
          account: 'My Brokerage',
        },
      ];
      mockResolveCusipViaThirteenf.mockResolvedValue('ULTY');

      await resolveCusipSymbols(rows);

      expect(rows[0].symbol).toBe('ULTY');
      expect(mockResolveCusipViaThirteenf).toHaveBeenCalledWith('88636J527');
      expect(mockUpsertManyMappings).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            cusip: '88636J527',
            symbol: 'ULTY',
            source: 'THIRTEENF',
          }),
        ])
      );
    });

    test('should resolve 88634T493 to MSTY via 13f.info', async function () {
      const rows: FidelityCsvRow[] = [
        {
          date: '12/31/2025',
          action: 'YOU BOUGHT',
          symbol: '88634T493',
          description: 'YIELDMAX MSTR OPTION INCOME STRATEGY ETF',
          quantity: 15,
          price: 25.0,
          totalAmount: -375.0,
          account: 'My Brokerage',
        },
      ];
      mockResolveCusipViaThirteenf.mockResolvedValue('MSTY');

      await resolveCusipSymbols(rows);

      expect(rows[0].symbol).toBe('MSTY');
      expect(mockResolveCusipViaThirteenf).toHaveBeenCalledWith('88634T493');
      expect(mockUpsertManyMappings).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            cusip: '88634T493',
            symbol: 'MSTY',
            source: 'THIRTEENF',
          }),
        ])
      );
    });

    test('should resolve all three CUSIPs in one batch', async function () {
      const rows: FidelityCsvRow[] = [
        {
          date: '12/31/2025',
          action: 'YOU BOUGHT',
          symbol: '691543102',
          description: 'OXFORD LANE CAPITAL CORP',
          quantity: 10,
          price: 5.0,
          totalAmount: -50.0,
          account: 'My Brokerage',
        },
        {
          date: '12/31/2025',
          action: 'YOU BOUGHT',
          symbol: '88636J527',
          description: 'YIELDMAX ULTRA OPTION INCOME STRATEGY ETF',
          quantity: 20,
          price: 10.0,
          totalAmount: -200.0,
          account: 'My Brokerage',
        },
        {
          date: '12/31/2025',
          action: 'YOU BOUGHT',
          symbol: '88634T493',
          description: 'YIELDMAX MSTR OPTION INCOME STRATEGY ETF',
          quantity: 15,
          price: 25.0,
          totalAmount: -375.0,
          account: 'My Brokerage',
        },
      ];
      mockResolveCusipViaThirteenf
        .mockResolvedValueOnce('OXLC')
        .mockResolvedValueOnce('ULTY')
        .mockResolvedValueOnce('MSTY');

      await resolveCusipSymbols(rows);

      expect(rows[0].symbol).toBe('OXLC');
      expect(rows[1].symbol).toBe('ULTY');
      expect(rows[2].symbol).toBe('MSTY');
      expect(mockResolveCusipViaThirteenf).toHaveBeenCalledTimes(3);
      expect(mockYahooSearch).not.toHaveBeenCalled();
    });
  });
});
