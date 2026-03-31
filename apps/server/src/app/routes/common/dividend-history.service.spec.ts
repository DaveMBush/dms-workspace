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
  {
    ex_div: '2026-03-12',
    payday: '2026-04-01',
    payout: 0.2205,
    type: '',
    currency: 'USD',
    pctChange: '',
  },
  {
    ex_div: '2026-02-12',
    payday: '2026-03-02',
    payout: 0.2205,
    type: '',
    currency: 'USD',
    pctChange: '',
  },
  {
    ex_div: '2026-01-13',
    payday: '2026-02-02',
    payout: 0.2205,
    type: '',
    currency: 'USD',
    pctChange: '',
  },
];

const UNCONFIRMED_ROW = {
  ex_div: '2026-04-10',
  payday: '2026-05-01',
  payout: 0.2205,
  type: 'u',
  currency: 'USD',
  pctChange: '',
};

function buildDividendHtml(rows: unknown[]): string {
  return `<html><body><script type="application/json" data-dividend-chart-json>${JSON.stringify(rows)}</script></body></html>`;
}

function buildHtmlWithoutScript(): string {
  return '<html><body><p>No dividend data found.</p></body></html>';
}

function buildHtmlWithInvalidJson(): string {
  return '<html><body><script type="application/json" data-dividend-chart-json>not valid json</script></body></html>';
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
        text: vi.fn().mockResolvedValueOnce(
          buildDividendHtml(SAMPLE_DIVIDEND_ROWS)
        ),
      });

      const result = await fetchDividendHistory('PDI');

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        amount: 0.2205,
        date: new Date('2026-01-13'),
      });
      expect(result[1]).toEqual({
        amount: 0.2205,
        date: new Date('2026-02-12'),
      });
      expect(result[2]).toEqual({
        amount: 0.2205,
        date: new Date('2026-03-12'),
      });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://dividendhistory.org/payout/PDI/'
      );
    });

    test('uppercases ticker in URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValueOnce(
          buildDividendHtml(SAMPLE_DIVIDEND_ROWS)
        ),
      });

      await fetchDividendHistory('pdi');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://dividendhistory.org/payout/PDI/'
      );
    });

    test('filters out unconfirmed rows (type === u)', async () => {
      const rowsWithUnconfirmed = [...SAMPLE_DIVIDEND_ROWS, UNCONFIRMED_ROW];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValueOnce(
          buildDividendHtml(rowsWithUnconfirmed)
        ),
      });

      const result = await fetchDividendHistory('PDI');

      expect(result).toHaveLength(3);
      expect(
        result.every(
          function checkNoFutureDate(row) {
            return row.date < new Date('2026-04-10');
          }
        )
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
        'dividendhistory.org returned 404 for ticker UNKNOWN',
        { ticker: 'UNKNOWN', status: 404 }
      );
    });

    test('returns empty array and logs warning when script tag is missing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValueOnce(buildHtmlWithoutScript()),
      });

      const result = await fetchDividendHistory('NODATA');

      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No dividend data found on dividendhistory.org for ticker NODATA',
        { ticker: 'NODATA' }
      );
    });

    test('returns empty array and logs warning when JSON is invalid', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValueOnce(buildHtmlWithInvalidJson()),
      });

      const result = await fetchDividendHistory('BAD');

      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No dividend data found on dividendhistory.org for ticker BAD',
        { ticker: 'BAD' }
      );
    });

    test('returns empty array and logs warning when JSON array is empty', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValueOnce(buildDividendHtml([])),
      });

      const result = await fetchDividendHistory('EMPTY');

      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No dividend data found on dividendhistory.org for ticker EMPTY',
        { ticker: 'EMPTY' }
      );
    });

    test('returns empty array and logs warning on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      const result = await fetchDividendHistory('NET');

      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Error fetching dividend history for NET from dividendhistory.org',
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
        text: vi.fn().mockResolvedValueOnce(
          buildDividendHtml(rowsWithZeroPayout)
        ),
      });

      const result = await fetchDividendHistory('PDI');

      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(0.2205);
    });

    test('sorts result by date ascending', async () => {
      const unsorted = [
        SAMPLE_DIVIDEND_ROWS[2], // 2026-01-13
        SAMPLE_DIVIDEND_ROWS[0], // 2026-03-12
        SAMPLE_DIVIDEND_ROWS[1], // 2026-02-12
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValueOnce(buildDividendHtml(unsorted)),
      });

      const result = await fetchDividendHistory('PDI');

      expect(result[0].date).toEqual(new Date('2026-01-13'));
      expect(result[1].date).toEqual(new Date('2026-02-12'));
      expect(result[2].date).toEqual(new Date('2026-03-12'));
    });

    test('logs debug on successful fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValueOnce(
          buildDividendHtml(SAMPLE_DIVIDEND_ROWS)
        ),
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
