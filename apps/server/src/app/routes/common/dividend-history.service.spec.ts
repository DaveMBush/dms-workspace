import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../utils/structured-logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { logger } from '../../../utils/structured-logger';
import {
  enforceDividendHistoryRateLimit,
  fetchDividendHistory,
  updateDividendHistoryCallTime,
} from './dividend-history.service';

const mockLogger = vi.mocked(logger);

const SAMPLE_DIVIDEND_ROWS = [
  { exDiv: '03/12/2026', payDay: '04/01/2026', payout: 0.2205 },
  { exDiv: '02/12/2026', payDay: '03/02/2026', payout: 0.2205 },
  { exDiv: '01/13/2026', payDay: '02/02/2026', payout: 0.2205 },
];

function buildDividendHtml(
  rows: Array<{ exDiv: string; payDay: string; payout: number }>
): string {
  const tableRows = rows
    .map(
      (r) =>
        `<tr><td>${r.exDiv}</td><td></td><td></td><td>${
          r.payDay
        }</td><td></td><td>$${r.payout.toFixed(5)}</td></tr>`
    )
    .join('\n');
  return `<html><body><table class="table table-bordered"><thead><tr><th>Ex-Div</th><th></th><th></th><th>Pay Date</th><th></th><th>Amount</th></tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
}

function buildHtmlWithoutScript(): string {
  return '<html><body><p>No dividend data found.</p></body></html>';
}

function buildHtmlWithMalformedTable(): string {
  return '<html><body><table class="table table-bordered"><tbody><tr><td>03/12/2026</td><td>only two</td></tr></tbody></table></body></html>';
}

function buildMultiTableDividendHtml(
  rows: Array<{ exDiv: string; payDay: string; payout: number }>
): string {
  const dummyTable =
    '<table class="table table-bordered"><tbody><tr><td>Symbol</td><td>Info</td></tr></tbody></table>';
  const tableRows = rows
    .map(
      (r) =>
        `<tr><td>${r.exDiv}</td><td></td><td></td><td>${
          r.payDay
        }</td><td></td><td>$${r.payout.toFixed(5)}</td></tr>`
    )
    .join('\n');
  const dividendTable = `<table class="table table-bordered"><thead><tr><th>Ex-Div</th><th></th><th></th><th>Pay Date</th><th></th><th>Amount</th></tr></thead><tbody>${tableRows}</tbody></table>`;
  return `<html><body>${dummyTable}${dividendTable}</body></html>`;
}

describe('dividend-history.service', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = mockFetch;
    // Reset rate-limit state: set lastCallTime to epoch zero so the 10-second
    // window has already elapsed when each test runs under real time.
    vi.useFakeTimers({ now: 0 });
    updateDividendHistoryCallTime(); // sets lastDividendHistoryCallTime = 0
    vi.useRealTimers(); // real Date.now() ≫ 0 + 10000, so no delay
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchDividendHistory', () => {
    test('returns ProcessedRow array on successful fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: vi
          .fn()
          .mockResolvedValueOnce(buildDividendHtml(SAMPLE_DIVIDEND_ROWS)),
      });

      const result = await fetchDividendHistory('PDI');

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        amount: 0.2205,
        date: new Date(2026, 0, 13),
      });
      expect(result[1]).toEqual({
        amount: 0.2205,
        date: new Date(2026, 1, 12),
      });
      expect(result[2]).toEqual({
        amount: 0.2205,
        date: new Date(2026, 2, 12),
      });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://dividendhistory.net/pdi-dividend-yield',
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
              '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,' +
              'image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            Referer: 'https://dividendhistory.net/',
          },
        }
      );
    });

    test('lowercases ticker in URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: vi
          .fn()
          .mockResolvedValueOnce(buildDividendHtml(SAMPLE_DIVIDEND_ROWS)),
      });

      await fetchDividendHistory('pdi');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://dividendhistory.net/pdi-dividend-yield',
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
              '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,' +
              'image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            Referer: 'https://dividendhistory.net/',
          },
        }
      );
    });

    test('parses dividend rows from multiple table.table-bordered tables', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: vi
          .fn()
          .mockResolvedValueOnce(
            buildMultiTableDividendHtml(SAMPLE_DIVIDEND_ROWS)
          ),
      });

      const result = await fetchDividendHistory('PDI');

      expect(result).toHaveLength(3);
      expect(result[0].date).toEqual(new Date(2026, 0, 13));
      expect(result[2].date).toEqual(new Date(2026, 2, 12));
    });

    test('filters out future ex-div rows', async () => {
      const futureRow = {
        exDiv: '12/31/2099',
        payDay: '01/31/2100',
        payout: 0.2205,
      };
      const rowsWithFuture = [...SAMPLE_DIVIDEND_ROWS, futureRow];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValueOnce(buildDividendHtml(rowsWithFuture)),
      });

      const result = await fetchDividendHistory('PDI');

      expect(result).toHaveLength(3);
      expect(
        result.every(function checkNoPastDate(row) {
          return row.date < new Date('12/31/2099');
        })
      ).toBe(true);
    });

    test('returns empty array and logs warning on HTTP non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await fetchDividendHistory('UNKNOWN');

      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'dividendhistory.net returned 404 for ticker UNKNOWN',
        { ticker: 'UNKNOWN', status: 404 }
      );
    });

    test('returns empty array and logs warning when no dividend table found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValueOnce(buildHtmlWithoutScript()),
      });

      const result = await fetchDividendHistory('NODATA');

      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No dividend data found on dividendhistory.net for ticker NODATA',
        { ticker: 'NODATA' }
      );
    });

    test('returns empty array and logs warning when table has insufficient columns', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValueOnce(buildHtmlWithMalformedTable()),
      });

      const result = await fetchDividendHistory('BAD');

      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No dividend data found on dividendhistory.net for ticker BAD',
        { ticker: 'BAD' }
      );
    });

    test('returns empty array when table has no data rows', async () => {
      const htmlWithOnlyHeader =
        '<html><body><table class="table table-bordered"><thead><tr><th>Ex-Div</th></tr></thead><tbody></tbody></table></body></html>';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValueOnce(htmlWithOnlyHeader),
      });

      const result = await fetchDividendHistory('OBJ');

      expect(result).toEqual([]);
    });

    test('returns empty array and logs warning when table is empty', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValueOnce(buildDividendHtml([])),
      });

      const result = await fetchDividendHistory('EMPTY');

      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No dividend data found on dividendhistory.net for ticker EMPTY',
        { ticker: 'EMPTY' }
      );
    });

    test('returns empty array and logs warning on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      const result = await fetchDividendHistory('NET');

      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Error fetching dividend history for NET from dividendhistory.net',
        { ticker: 'NET', error: 'Error: Network failure' }
      );
    });

    test('filters out rows with zero or negative payout', async () => {
      const rowsWithZeroPayout = [
        { ...SAMPLE_DIVIDEND_ROWS[0], payout: 0 },
        { ...SAMPLE_DIVIDEND_ROWS[1], payout: -0.1 },
        SAMPLE_DIVIDEND_ROWS[2],
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: vi
          .fn()
          .mockResolvedValueOnce(buildDividendHtml(rowsWithZeroPayout)),
      });

      const result = await fetchDividendHistory('PDI');

      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(0.2205);
    });

    test('filters out rows with empty ex-div date', async () => {
      const rowsWithEmptyExDiv = [
        { ...SAMPLE_DIVIDEND_ROWS[0], exDiv: '' },
        SAMPLE_DIVIDEND_ROWS[1],
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: vi
          .fn()
          .mockResolvedValueOnce(buildDividendHtml(rowsWithEmptyExDiv)),
      });

      const result = await fetchDividendHistory('PDI');

      expect(result).toHaveLength(1);
    });

    test('filters out rows with non-numeric payout amount', async () => {
      const htmlWithNaNPayout = `<html><body><table class="table table-bordered"><thead><tr><th>Ex-Div</th><th></th><th></th><th>Pay Date</th><th></th><th>Amount</th></tr></thead><tbody><tr><td>03/12/2026</td><td></td><td></td><td>04/01/2026</td><td></td><td>$N/A</td></tr><tr><td>02/12/2026</td><td></td><td></td><td>03/02/2026</td><td></td><td>$0.22050</td></tr></tbody></table></body></html>`;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValueOnce(htmlWithNaNPayout),
      });

      const result = await fetchDividendHistory('PDI');

      expect(result).toHaveLength(1);
    });

    test('sorts result by date ascending', async () => {
      const unsorted = [
        SAMPLE_DIVIDEND_ROWS[2], // 01/13/2026
        SAMPLE_DIVIDEND_ROWS[0], // 03/12/2026
        SAMPLE_DIVIDEND_ROWS[1], // 02/12/2026
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValueOnce(buildDividendHtml(unsorted)),
      });

      const result = await fetchDividendHistory('PDI');

      expect(result[0].date).toEqual(new Date(2026, 0, 13));
      expect(result[1].date).toEqual(new Date(2026, 1, 12));
      expect(result[2].date).toEqual(new Date(2026, 2, 12));
    });

    test('logs debug on successful fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: vi
          .fn()
          .mockResolvedValueOnce(buildDividendHtml(SAMPLE_DIVIDEND_ROWS)),
      });

      await fetchDividendHistory('PDI');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('PDI'),
        expect.objectContaining({ ticker: 'PDI' })
      );
    });
  });

  describe('updateDividendHistoryCallTime', () => {
    test('is callable without error', () => {
      expect(() => updateDividendHistoryCallTime()).not.toThrow();
    });
  });

  describe('rate limiting', () => {
    test('enforces delay between consecutive calls', async () => {
      vi.useFakeTimers({ now: new Date('2030-01-01T00:00:00.000Z') });

      // First call sets baseline
      updateDividendHistoryCallTime();
      const callTime = Date.now();

      // Second call should be rate limited
      const rateLimitPromise = enforceDividendHistoryRateLimit();

      // Advance past the 10s rate limit
      vi.advanceTimersByTime(10000);

      await rateLimitPromise;

      const elapsed = Date.now() - callTime;
      expect(elapsed).toBeGreaterThanOrEqual(10000);

      vi.useRealTimers();
    });

    test('does not delay when enough time has passed', async () => {
      vi.useFakeTimers({ now: new Date('2030-06-01T00:00:00.000Z') });

      // Set call time in the past
      updateDividendHistoryCallTime();

      // Advance well past rate limit
      vi.advanceTimersByTime(15000);

      const before = Date.now();
      await enforceDividendHistoryRateLimit();
      const after = Date.now();

      expect(after - before).toBe(0);

      vi.useRealTimers();
    });
  });
});
