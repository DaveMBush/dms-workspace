import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../routes/settings/yahoo-finance.instance', function () {
  return {
    yahooFinance: {
      search: vi.fn(),
    },
  };
});

import { yahooFinance } from '../../routes/settings/yahoo-finance.instance';
import { FidelityCsvRow } from './fidelity-csv-row.interface';
import { isCusip } from './is-cusip.function';
import { resolveCusipSymbols } from './resolve-cusip.function';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const mockYahooSearch = yahooFinance.search as ReturnType<typeof vi.fn>;

function mockFetchResponse(data: unknown, ok: boolean = true): void {
  mockFetch.mockResolvedValue({
    ok,
    json: async () => data,
  });
}

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
    mockFetch.mockReset();
    mockYahooSearch.mockReset();
    vi.unstubAllEnvs();
    vi.stubEnv('OPENFIGI_API_KEY', '');
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

  test('should resolve a CUSIP to a ticker symbol via OpenFIGI', async function () {
    const rows = [createRow('88634T493')];
    mockFetchResponse([{ data: [{ ticker: 'MSTY' }] }]);

    await resolveCusipSymbols(rows);

    expect(rows[0].symbol).toBe('MSTY');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.openfigi.com/v3/mapping',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  test('should include X-OPENFIGI-APIKEY header when env var is set', async function () {
    vi.stubEnv('OPENFIGI_API_KEY', 'test-api-key');
    const rows = [createRow('88634T493')];
    mockFetchResponse([{ data: [{ ticker: 'MSTY' }] }]);

    await resolveCusipSymbols(rows);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.openfigi.com/v3/mapping',
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          'X-OPENFIGI-APIKEY': 'test-api-key',
        },
      })
    );
  });

  test('should keep original CUSIP when OpenFIGI returns no data', async function () {
    const rows = [createRow('99999X999')];
    mockFetchResponse([{ error: 'No identifier found.' }]);

    await resolveCusipSymbols(rows);

    expect(rows[0].symbol).toBe('99999X999');
  });

  test('should keep original CUSIP when fetch throws', async function () {
    const rows = [createRow('88634T493')];
    mockFetch.mockRejectedValue(new Error('Network error'));

    await resolveCusipSymbols(rows);

    expect(rows[0].symbol).toBe('88634T493');
  });

  test('should keep original CUSIP when API returns non-OK status', async function () {
    const rows = [createRow('88634T493')];
    mockFetchResponse([], false);

    await resolveCusipSymbols(rows);

    expect(rows[0].symbol).toBe('88634T493');
  });

  test('should not call API for regular ticker symbols', async function () {
    const rows = [createRow('SPY'), createRow('AAPL')];

    await resolveCusipSymbols(rows);

    expect(rows[0].symbol).toBe('SPY');
    expect(rows[1].symbol).toBe('AAPL');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('should deduplicate CUSIPs in batch request', async function () {
    const rows = [createRow('88634T493'), createRow('88634T493')];
    mockFetchResponse([{ data: [{ ticker: 'MSTY' }] }]);

    await resolveCusipSymbols(rows);

    expect(rows[0].symbol).toBe('MSTY');
    expect(rows[1].symbol).toBe('MSTY');
    // Only one fetch call since both CUSIPs are the same
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  test('should resolve multiple different CUSIPs in single batch', async function () {
    const rows = [createRow('88634T493'), createRow('12345A678')];
    mockFetchResponse([
      { data: [{ ticker: 'MSTY' }] },
      { data: [{ ticker: 'XYZ' }] },
    ]);

    await resolveCusipSymbols(rows);

    expect(rows[0].symbol).toBe('MSTY');
    expect(rows[1].symbol).toBe('XYZ');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  test('should skip empty symbols', async function () {
    const rows = [createRow('')];

    await resolveCusipSymbols(rows);

    expect(rows[0].symbol).toBe('');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('should fall back to Yahoo Finance description search when OpenFIGI fails', async function () {
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
    // OpenFIGI returns no data
    mockFetchResponse([{ error: 'No identifier found.' }]);
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

  test('should not call Yahoo Finance fallback when OpenFIGI resolves', async function () {
    const rows = [createRow('88634T493')];
    mockFetchResponse([{ data: [{ ticker: 'MSTY' }] }]);

    await resolveCusipSymbols(rows);

    expect(rows[0].symbol).toBe('MSTY');
    expect(mockYahooSearch).not.toHaveBeenCalled();
  });

  test('should keep CUSIP when both OpenFIGI and Yahoo Finance fail', async function () {
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
    mockFetchResponse([{ error: 'No identifier found.' }]);
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
    mockFetchResponse([{ error: 'No identifier found.' }]);
    mockYahooSearch.mockResolvedValue({
      quotes: [
        { symbol: 'OXLC.IDX', quoteType: 'INDEX' },
        { symbol: 'OXLC', quoteType: 'EQUITY' },
      ],
    });

    await resolveCusipSymbols(rows);

    expect(rows[0].symbol).toBe('OXLC');
  });
});
