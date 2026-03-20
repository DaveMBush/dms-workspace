import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('./structured-logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { logger } from './structured-logger';
import {
  enforceThirteenfRateLimit,
  resolveCusipViaThirteenf,
} from './thirteenf-cusip.service';

const mockLogger = vi.mocked(logger);

function buildJsonLdHtml(ticker: string): string {
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        name: ticker,
        item: 'https://13f.info/cusip/691543102',
        alternateName: 'Some Corp.',
        identifier: '691543102',
      },
    ],
  });
  return `<html><head><script type="application/ld+json">${jsonLd}</script></head><body></body></html>`;
}

function buildHtmlWithoutJsonLd(): string {
  return '<html><head></head><body></body></html>';
}

function buildJsonLdHtmlEmpty(): string {
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [],
  });
  return `<html><head><script type="application/ld+json">${jsonLd}</script></head><body></body></html>`;
}

describe('thirteenf-cusip.service', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('resolveCusipViaThirteenf', () => {
    test('returns ticker symbol from JSON-LD on successful resolution', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValueOnce(buildJsonLdHtml('OXLC')),
      });

      const result = await resolveCusipViaThirteenf('691543102');

      expect(result).toBe('OXLC');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://13f.info/cusip/691543102'
      );
    });

    test('returns null when JSON-LD is absent', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValueOnce(buildHtmlWithoutJsonLd()),
      });

      const result = await resolveCusipViaThirteenf('000000000');

      expect(result).toBeNull();
    });

    test('returns null when itemListElement is empty', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValueOnce(buildJsonLdHtmlEmpty()),
      });

      const result = await resolveCusipViaThirteenf('000000000');

      expect(result).toBeNull();
    });

    test('returns null and logs warning on HTTP non-200 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await resolveCusipViaThirteenf('BADCUSIP');

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '13f.info returned 404 for CUSIP BADCUSIP',
        { cusip: 'BADCUSIP', status: 404 }
      );
    });

    test('returns null and logs warning on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      const result = await resolveCusipViaThirteenf('691543102');

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Error resolving CUSIP 691543102 via 13f.info',
        { cusip: '691543102', error: 'Error: Network failure' }
      );
    });
  });

  describe('rate limiting', () => {
    test('enforces delay between consecutive calls', async () => {
      // Start fake timers far in the future to avoid stale lastThirteenfCallTime from prior tests
      vi.useFakeTimers({ now: new Date('2030-01-01T00:00:00.000Z') });

      // First call establishes baseline (eagerly reserves a slot)
      await enforceThirteenfRateLimit();
      const callTime = Date.now();

      // Second call should be rate limited
      const rateLimitPromise = enforceThirteenfRateLimit();

      // Advance time past the rate limit delay
      vi.advanceTimersByTime(1000);

      await rateLimitPromise;

      const elapsed = Date.now() - callTime;
      expect(elapsed).toBeGreaterThanOrEqual(1000);

      vi.useRealTimers();
    });

    test('does not delay when enough time has passed', async () => {
      // Start fake timers far in the future to avoid stale lastThirteenfCallTime from prior tests
      vi.useFakeTimers({ now: new Date('2030-06-01T00:00:00.000Z') });

      // First call establishes baseline
      await enforceThirteenfRateLimit();

      // Advance well past the rate limit
      vi.advanceTimersByTime(1500);

      const before = Date.now();
      await enforceThirteenfRateLimit();
      const after = Date.now();

      expect(after - before).toBe(0);

      vi.useRealTimers();
    });
  });
});
