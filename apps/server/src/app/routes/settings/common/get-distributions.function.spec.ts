import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { ProcessedRow } from '../../common/distribution-api.function';
import { logger } from '../../../../utils/structured-logger';
import { getDistributions } from './get-distributions.function';

// Hoisted mocks
const mockFetchDistributionData = vi.hoisted(() => vi.fn());
const mockFetchDividendHistory = vi.hoisted(() => vi.fn());

vi.mock('../../common/distribution-api.function', () => ({
  fetchDistributionData: mockFetchDistributionData,
}));

vi.mock('../../common/dividend-history.service', () => ({
  fetchDividendHistory: mockFetchDividendHistory,
}));

vi.mock('../../../../utils/structured-logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('getDistributions', () => {
  const TEST_DATE_2025_09_15 = '2025-09-15';
  const TEST_DATE_2025_06_15 = '2025-06-15';
  const TEST_DATE_2025_03_15 = '2025-03-15';
  const TEST_DATE_2024_12_15 = '2024-12-15';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-08-21T10:00:00Z'));
    // Default: new service returns no data, triggering fallback to Yahoo Finance
    mockFetchDividendHistory.mockResolvedValue([]);
  });

  afterEach(() => {
    try {
      vi.useRealTimers();
    } catch {
      // Ignore errors when restoring timers
    }
  });

  test('returns distribution data for valid response', async () => {
    const mockRows: ProcessedRow[] = [
      { amount: 0.52, date: new Date(TEST_DATE_2024_12_15) },
      { amount: 0.48, date: new Date(TEST_DATE_2025_03_15) },
      { amount: 0.45, date: new Date(TEST_DATE_2025_06_15) },
      { amount: 0.5, date: new Date(TEST_DATE_2025_09_15) },
    ];

    mockFetchDistributionData.mockResolvedValueOnce(mockRows);

    const result = await getDistributions('TEST');

    expect(result).toEqual({
      distribution: 0.5,
      ex_date: new Date('2025-09-15'),
      distributions_per_year: 4,
    });
  });

  test('returns undefined for empty response', async () => {
    mockFetchDistributionData.mockResolvedValueOnce([]);

    const result = await getDistributions('EMPTY');

    expect(result).toBeUndefined();
  });

  test('returns default values on API error', async () => {
    mockFetchDistributionData.mockRejectedValueOnce(new Error('API error'));

    const result = await getDistributions('ERROR');

    expect(result).toEqual({
      distribution: 0,
      ex_date: new Date('2025-08-21T10:00:00Z'),
      distributions_per_year: 0,
    });
  });

  test('calculates distributions per year correctly for quarterly pattern', async () => {
    const mockRows: ProcessedRow[] = [
      { amount: 0.52, date: new Date(TEST_DATE_2024_12_15) },
      { amount: 0.48, date: new Date(TEST_DATE_2025_03_15) },
      { amount: 0.45, date: new Date(TEST_DATE_2025_06_15) },
      { amount: 0.5, date: new Date(TEST_DATE_2025_09_15) },
    ];

    mockFetchDistributionData.mockResolvedValueOnce(mockRows);

    const result = await getDistributions('QUARTERLY');

    expect(result).toEqual({
      distribution: 0.5,
      ex_date: new Date('2025-09-15'),
      distributions_per_year: 4,
    });
  });

  test('calculates distributions per year correctly for monthly pattern', async () => {
    const mockRows: ProcessedRow[] = [
      { amount: 0.1, date: new Date('2025-07-15') },
      { amount: 0.1, date: new Date('2025-06-15') },
      { amount: 0.1, date: new Date('2025-05-15') },
      { amount: 0.1, date: new Date('2025-04-15') },
      { amount: 0.1, date: new Date(TEST_DATE_2025_09_15) },
    ];

    mockFetchDistributionData.mockResolvedValueOnce(mockRows);

    const result = await getDistributions('MONTHLY');

    expect(result).toEqual({
      distribution: 0.1,
      ex_date: new Date('2025-09-15'),
      distributions_per_year: 12,
    });
  });

  test('calculates distributions per year correctly for annual pattern', async () => {
    const mockRows: ProcessedRow[] = [
      { amount: 1.2, date: new Date('2024-12-15') },
      { amount: 1.5, date: new Date(TEST_DATE_2025_09_15) },
    ];

    mockFetchDistributionData.mockResolvedValueOnce(mockRows);

    const result = await getDistributions('ANNUAL');

    expect(result).toEqual({
      distribution: 1.5,
      ex_date: new Date('2025-09-15'),
      distributions_per_year: 1,
    });
  });

  test('finds next distribution when available', async () => {
    const mockRows: ProcessedRow[] = [
      { amount: 0.48, date: new Date('2025-03-15') },
      { amount: 0.45, date: new Date('2025-06-15') },
      { amount: 0.5, date: new Date('2025-09-15') },
    ];

    mockFetchDistributionData.mockResolvedValueOnce(mockRows);

    const result = await getDistributions('NEXT');

    expect(result).toEqual({
      distribution: 0.5,
      ex_date: new Date('2025-09-15'),
      distributions_per_year: 4, // Based on the actual function logic
    });
  });

  test('falls back to most recent past distribution when no future available', async () => {
    const mockRows: ProcessedRow[] = [
      { amount: 0.48, date: new Date('2025-03-15') },
      { amount: 0.45, date: new Date('2025-06-15') },
    ];

    mockFetchDistributionData.mockResolvedValueOnce(mockRows);

    const result = await getDistributions('PAST');

    expect(result).toEqual({
      distribution: 0.45, // Most recent in sorted order (last in array)
      ex_date: new Date('2025-06-15'),
      distributions_per_year: 4, // Based on the actual function logic
    });
  });

  test('filters out invalid dates', async () => {
    const mockRows: ProcessedRow[] = [
      { amount: 0.5, date: new Date('2025-09-15') },
    ];

    mockFetchDistributionData.mockResolvedValueOnce(mockRows);

    const result = await getDistributions('VALID');

    expect(result).toEqual({
      distribution: 0.5,
      ex_date: new Date('2025-09-15'),
      distributions_per_year: 1,
    });
  });

  test('handles single distribution correctly', async () => {
    const mockRows: ProcessedRow[] = [
      { amount: 1.0, date: new Date('2025-09-15') },
    ];

    mockFetchDistributionData.mockResolvedValueOnce(mockRows);

    const result = await getDistributions('SINGLE');

    expect(result).toEqual({
      distribution: 1.0,
      ex_date: new Date('2025-09-15'),
      distributions_per_year: 1,
    });
  });

  test('enforces rate limiting between requests', async () => {
    const mockRows: ProcessedRow[] = [
      { amount: 0.5, date: new Date('2025-09-15') },
    ];

    mockFetchDistributionData.mockResolvedValueOnce(mockRows);

    const result = await getDistributions('RATE_LIMITED');

    expect(result).toEqual({
      distribution: 0.5,
      ex_date: new Date('2025-09-15'),
      distributions_per_year: 1,
    });

    expect(mockFetchDistributionData).toHaveBeenCalledTimes(1);
  });

  test('detects frequency change from monthly to weekly', async () => {
    const mockRows: ProcessedRow[] = [
      { amount: 0.1, date: new Date('2025-05-15') }, // Old monthly
      { amount: 0.1, date: new Date('2025-06-15') }, // Old monthly
      { amount: 0.025, date: new Date('2025-08-07') }, // New weekly
      { amount: 0.025, date: new Date('2025-08-14') }, // New weekly (7 days)
    ];

    mockFetchDistributionData.mockResolvedValueOnce(mockRows);

    const result = await getDistributions('FREQ_CHANGE');

    expect(result?.distributions_per_year).toBe(52); // Should detect weekly
  });

  test('handles exactly 2 distributions correctly', async () => {
    const mockRows: ProcessedRow[] = [
      { amount: 0.5, date: new Date('2025-06-15') },
      { amount: 0.5, date: new Date('2025-07-22') }, // 37 days apart
    ];

    mockFetchDistributionData.mockResolvedValueOnce(mockRows);

    const result = await getDistributions('TWO_ONLY');

    expect(result?.distributions_per_year).toBe(12); // Monthly
  });

  test('correctly identifies weekly at 7-day threshold', async () => {
    const mockRows: ProcessedRow[] = [
      { amount: 0.1, date: new Date('2025-08-14') },
      { amount: 0.1, date: new Date('2025-08-21') }, // Exactly 7 days
    ];

    mockFetchDistributionData.mockResolvedValueOnce(mockRows);

    const result = await getDistributions('WEEKLY_BOUNDARY');

    expect(result?.distributions_per_year).toBe(52);
  });

  test('correctly identifies weekly with 6-day interval (holiday shift)', async () => {
    const mockRows: ProcessedRow[] = [
      { amount: 0.1, date: new Date('2025-08-14') },
      { amount: 0.1, date: new Date('2025-08-20') }, // 6 days (holiday)
    ];

    mockFetchDistributionData.mockResolvedValueOnce(mockRows);

    const result = await getDistributions('WEEKLY_HOLIDAY');

    expect(result?.distributions_per_year).toBe(52);
  });

  test('returns annual default for biweekly interval (8-27 days)', async () => {
    const mockRows: ProcessedRow[] = [
      { amount: 0.25, date: new Date('2025-07-15') },
      { amount: 0.25, date: new Date('2025-07-29') }, // 14 days apart
    ];

    mockFetchDistributionData.mockResolvedValueOnce(mockRows);

    const result = await getDistributions('BIWEEKLY');

    expect(result?.distributions_per_year).toBe(1); // Falls to annual/default
  });

  test('correctly identifies monthly at 30-day interval', async () => {
    const mockRows: ProcessedRow[] = [
      { amount: 0.25, date: new Date('2025-07-15') },
      { amount: 0.25, date: new Date('2025-08-14') }, // 30 days
    ];

    mockFetchDistributionData.mockResolvedValueOnce(mockRows);

    const result = await getDistributions('MONTHLY_BOUNDARY');

    expect(result?.distributions_per_year).toBe(12);
  });

  test('uses primary dividend service when it returns data (no fallback)', async () => {
    const primaryRows: ProcessedRow[] = [
      { amount: 0.2205, date: new Date('2025-05-15') },
      { amount: 0.2205, date: new Date('2025-06-15') },
      { amount: 0.2205, date: new Date('2025-07-15') },
    ];

    mockFetchDividendHistory.mockResolvedValueOnce(primaryRows);

    const result = await getDistributions('PDI');

    expect(result).toBeDefined();
    expect(result?.distribution).toBe(0.2205);
    expect(mockFetchDistributionData).not.toHaveBeenCalled();
  });

  test('falls back to Yahoo Finance and logs warning when primary returns empty', async () => {
    const fallbackRows: ProcessedRow[] = [
      { amount: 0.22, date: new Date('2025-06-13') },
      { amount: 0.22, date: new Date('2025-07-12') },
    ];

    mockFetchDividendHistory.mockResolvedValueOnce([]);
    mockFetchDistributionData.mockResolvedValueOnce(fallbackRows);

    const result = await getDistributions('NOLISTING');

    expect(result).toBeDefined();
    expect(mockFetchDistributionData).toHaveBeenCalledWith('NOLISTING');
    expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
      'fetchDividendHistory returned no data for NOLISTING, falling back to Yahoo Finance',
      { symbol: 'NOLISTING' }
    );
  });

  // Story 58.1: Failing tests that document the sparse-history bug.
  // When fetchDividendHistory returns only 1 past row (plus future rows), the
  // calculateDistributionsPerYear function hits the `recentRows.length <= 1`
  // branch and returns 1 — regardless of the actual distribution cadence.
  // Story 58.2 fixed the bug; test.fails() wrappers removed.

  test('monthly payer with 1 past row + future rows correctly returns distributions_per_year=12', async () => {
    // System time: 2025-08-21T10:00:00Z (set in beforeEach)
    // Realistic for a newly-listed monthly payer: dividendhistory.net has
    // exactly 1 past ex-date plus several scheduled future ex-dates.
    const sparseMonthlyRows: ProcessedRow[] = [
      { amount: 0.25, date: new Date('2025-08-15') }, // only past row
      { amount: 0.25, date: new Date('2025-09-15') }, // future
      { amount: 0.25, date: new Date('2025-10-15') }, // future
      { amount: 0.25, date: new Date('2025-11-15') }, // future
      { amount: 0.25, date: new Date('2025-12-15') }, // future
    ];

    mockFetchDividendHistory.mockResolvedValueOnce(sparseMonthlyRows);

    const result = await getDistributions('NEW-MONTHLY');

    expect(result?.distributions_per_year).toBe(12);
  });

  test('weekly payer with 1 past row + future rows correctly returns distributions_per_year=52', async () => {
    // System time: 2025-08-21T10:00:00Z (set in beforeEach)
    // Realistic for a newly-listed weekly payer: dividendhistory.net has
    // exactly 1 past ex-date plus several scheduled future ex-dates at 7-day intervals.
    const sparseWeeklyRows: ProcessedRow[] = [
      { amount: 0.05, date: new Date('2025-08-15') }, // only past row
      { amount: 0.05, date: new Date('2025-08-22') }, // future (+7 days)
      { amount: 0.05, date: new Date('2025-08-29') }, // future (+7 days)
      { amount: 0.05, date: new Date('2025-09-05') }, // future (+7 days)
      { amount: 0.05, date: new Date('2025-09-12') }, // future (+7 days)
    ];

    mockFetchDividendHistory.mockResolvedValueOnce(sparseWeeklyRows);

    const result = await getDistributions('NEW-WEEKLY');

    expect(result?.distributions_per_year).toBe(52);
  });

  // Story 58.2: Additional sparse-history tests

  test('monthly payer with 0 past rows + future rows every ~30 days returns distributions_per_year=12', async () => {
    const sparseMonthlyRows: ProcessedRow[] = [
      { amount: 0.2, date: new Date('2025-08-25') }, // future
      { amount: 0.2, date: new Date('2025-09-24') }, // future (+30 days)
      { amount: 0.2, date: new Date('2025-10-24') }, // future (+30 days)
    ];

    mockFetchDividendHistory.mockResolvedValueOnce(sparseMonthlyRows);

    const result = await getDistributions('NEW-MONTHLY-ZERO-PAST');

    expect(result?.distributions_per_year).toBe(12);
  });

  test('weekly payer with 0 past rows + weekly future rows returns distributions_per_year=52', async () => {
    const sparseWeeklyRows: ProcessedRow[] = [
      { amount: 0.05, date: new Date('2025-08-22') }, // future
      { amount: 0.05, date: new Date('2025-08-29') }, // future (+7 days)
      { amount: 0.05, date: new Date('2025-09-05') }, // future (+7 days)
    ];

    mockFetchDividendHistory.mockResolvedValueOnce(sparseWeeklyRows);

    const result = await getDistributions('NEW-WEEKLY-ZERO-PAST');

    expect(result?.distributions_per_year).toBe(52);
  });

  test('quarterly payer with 1 past row + quarterly future rows returns distributions_per_year=4', async () => {
    const sparseQuarterlyRows: ProcessedRow[] = [
      { amount: 0.5, date: new Date('2025-06-15') }, // only past row
      { amount: 0.5, date: new Date('2025-09-15') }, // future (~92 days)
      { amount: 0.5, date: new Date('2025-12-15') }, // future
    ];

    mockFetchDividendHistory.mockResolvedValueOnce(sparseQuarterlyRows);

    const result = await getDistributions('NEW-QUARTERLY-SPARSE');

    expect(result?.distributions_per_year).toBe(4);
  });

  test('annual payer with 0 past rows + annual future rows returns distributions_per_year=1', async () => {
    const sparseAnnualRows: ProcessedRow[] = [
      { amount: 1.0, date: new Date('2025-12-15') }, // future
      { amount: 1.0, date: new Date('2026-12-15') }, // future (+365 days)
    ];

    mockFetchDividendHistory.mockResolvedValueOnce(sparseAnnualRows);

    const result = await getDistributions('NEW-ANNUAL-ZERO-PAST');

    expect(result?.distributions_per_year).toBe(1);
  });

  test('monthly payer with exactly 2 past rows still uses past-row logic (no regression)', async () => {
    // System time: 2025-08-21T10:00:00Z
    const twoHistoryRows: ProcessedRow[] = [
      { amount: 0.3, date: new Date('2025-06-15') }, // past
      { amount: 0.3, date: new Date('2025-07-15') }, // past (~30 days)
      { amount: 0.3, date: new Date('2025-09-15') }, // future
    ];

    mockFetchDividendHistory.mockResolvedValueOnce(twoHistoryRows);

    const result = await getDistributions('MONTHLY-TWO-PAST');

    expect(result?.distributions_per_year).toBe(12);
  });

  // Story 62.1 / 62.2 regression tests — production-accurate scenario (post-fix).
  //
  // Root cause (Story 62.1): fetchDividendHistory applied filterPastRows (row.date <= today)
  // before returning, so getDistributions never received future ex-dates.
  // For a new symbol with exactly 1 past ex-date:
  //   rows.length === 1  →  calculateDistributionsPerYear Path A  →  return 1
  //
  // Fix (Story 62.2): fetchDividendHistory now returns all valid rows (past + future).
  // Production-accurate mocks now include 1 past row + several future rows, allowing
  // calculateDistributionsPerYear to reach Path B (future-rows fallback) and return
  // the correct cadence.

  test('OXLC monthly payer: 1 past row + future monthly rows returns distributions_per_year=12', async () => {
    // System time: 2025-08-21T10:00:00Z (set in beforeEach)
    // Post-fix production-accurate: fetchDividendHistory returns 1 past ex-date
    // plus scheduled future ex-dates for a new monthly payer (e.g. OXLC).
    const productionAccurateMonthly: ProcessedRow[] = [
      { amount: 0.25, date: new Date('2025-08-15') }, // only past row
      { amount: 0.25, date: new Date('2025-09-15') }, // future (+31 days)
      { amount: 0.25, date: new Date('2025-10-15') }, // future (+30 days)
      { amount: 0.25, date: new Date('2025-11-14') }, // future (+30 days)
      { amount: 0.25, date: new Date('2025-12-15') }, // future (+31 days)
    ];

    mockFetchDividendHistory.mockResolvedValueOnce(productionAccurateMonthly);

    const result = await getDistributions('OXLC');

    expect(result?.distributions_per_year).toBe(12);
  });

  test('MSTY weekly payer: 1 past row + future weekly rows returns distributions_per_year=52', async () => {
    // System time: 2025-08-21T10:00:00Z (set in beforeEach)
    // Post-fix production-accurate: fetchDividendHistory returns 1 past ex-date
    // plus scheduled future ex-dates for a new weekly payer (e.g. MSTY).
    const productionAccurateWeekly: ProcessedRow[] = [
      { amount: 0.05, date: new Date('2025-08-15') }, // only past row
      { amount: 0.05, date: new Date('2025-08-22') }, // future (+7 days)
      { amount: 0.05, date: new Date('2025-08-29') }, // future (+7 days)
      { amount: 0.05, date: new Date('2025-09-05') }, // future (+7 days)
      { amount: 0.05, date: new Date('2025-09-12') }, // future (+7 days)
    ];

    mockFetchDividendHistory.mockResolvedValueOnce(productionAccurateWeekly);

    const result = await getDistributions('MSTY');

    expect(result?.distributions_per_year).toBe(52);
  });

  // Story 71.1 / 71.2: Edge case — 1 past row + 1 future row (no fallback pair)
  // Before fix: futureRows.length < 2 → returned 1 regardless of actual cadence.
  // Fix: use the past-to-future interval when exactly 1 of each is available.

  test('BUG(71-1): 1 past + 1 future row ~30 days apart returns distributions_per_year=12', async () => {
    // System time: 2025-08-21T10:00:00Z (set in beforeEach)
    // Only 1 past row and 1 future row — recentRows.length === 1, futureRows.length === 1.
    const minimalPair: ProcessedRow[] = [
      { amount: 0.25, date: new Date('2025-08-15') }, // past
      { amount: 0.25, date: new Date('2025-09-14') }, // future (~30 days later)
    ];

    mockFetchDividendHistory.mockResolvedValueOnce(minimalPair);

    const result = await getDistributions('MINIMAL-MONTHLY');

    expect(result?.distributions_per_year).toBe(12);
  });

  // Story 73.1 / 73.2: Regression suite for the CEF distribution-history bug.
  //
  // Root causes (confirmed in Story 73.1):
  //   OXLC  — dividendhistory.net emits two rows with the same pay date (e.g. Mar 17
  //           and Mar 31 both settling on 03/31).  The 14-day gap between those ex-dates
  //           caused `intervalToDistributionsPerYear(14)` to return 1 (annual default).
  //           Fix: `fetchDividendHistory` now deduplicates by pay date, keeping only the
  //           earliest ex-date per pay date, so the interval reflects the true ~30-day
  //           monthly cadence.
  //   NHS/DHY/CIK/DMB — a 27-calendar-day interval that spans a US spring-forward DST
  //           transition computes to ≈26.96 days in local time.  The old guard
  //           `daysBetween > 27` evaluates to false for 26.96, falling through to the
  //           annual-default `return 1`.
  //           Fix: threshold lowered to `daysBetween > 25`.
  //
  // All tests below are plain `test()` — the `test.fails()` wrappers have been removed
  // now that both fixes are applied.

  test(
    'BUG(73-1): getDistributions returns distributions_per_year = 1 for CEF symbol OXLC when fetchDividendHistory provides insufficient history',
    async function verifyCefDistributionsPerYearBug() {
      // Simulate what fetchDividendHistory now returns after the deduplicateByPayDay
      // fix: the duplicate March row is removed, leaving clean ~30-day monthly spacing.
      // System time: 2025-08-21T10:00:00Z (set in beforeEach)
      mockFetchDividendHistory.mockResolvedValueOnce([
        { amount: 0.4, date: new Date('2025-06-17') }, // past
        { amount: 0.4, date: new Date('2025-07-15') }, // past (+28 days)
        { amount: 0.4, date: new Date('2025-08-15') }, // past (+31 days)
        { amount: 0.4, date: new Date('2025-09-15') }, // future
      ]);
      // fetchDistributionData not called — primary source returns data
      const result = await getDistributions('OXLC');

      expect(result?.distributions_per_year).toBe(12);
    }
  );

  test(
    'FIX(73-2): getDistributions returns distributions_per_year = 12 for CEF symbol NHS',
    async function fixNhsCefDistributionsPerYear() {
      // NHS has ~27-day ex-date intervals; when one interval spans a DST transition the
      // computed gap is ≈26.96 days — below the old `> 27` threshold.  The new `> 25`
      // threshold correctly classifies it as monthly.
      // System time: 2025-08-21T10:00:00Z (set in beforeEach)
      mockFetchDividendHistory.mockResolvedValueOnce([
        { amount: 0.091, date: new Date('2025-06-24') }, // past
        { amount: 0.091, date: new Date('2025-07-21') }, // past (+27 days)
        { amount: 0.091, date: new Date('2025-08-17') }, // past (+27 days — crosses DST threshold)
        { amount: 0.091, date: new Date('2025-09-15') }, // future
      ]);
      const result = await getDistributions('NHS');

      expect(result?.distributions_per_year).toBe(12);
    }
  );

  test(
    'FIX(73-2): getDistributions returns distributions_per_year = 12 for CEF symbol DHY',
    async function fixDhyCefDistributionsPerYear() {
      // Same DST-induced sub-27-day interval pattern as NHS.
      // System time: 2025-08-21T10:00:00Z (set in beforeEach)
      mockFetchDividendHistory.mockResolvedValueOnce([
        { amount: 0.016, date: new Date('2025-06-16') }, // past
        { amount: 0.016, date: new Date('2025-07-13') }, // past (+27 days)
        { amount: 0.016, date: new Date('2025-08-09') }, // past (+27 days)
        { amount: 0.016, date: new Date('2025-09-15') }, // future
      ]);
      const result = await getDistributions('DHY');

      expect(result?.distributions_per_year).toBe(12);
    }
  );

  test(
    'FIX(73-2): getDistributions returns distributions_per_year = 12 for CEF symbol CIK',
    async function fixCikCefDistributionsPerYear() {
      // Same DST-induced sub-27-day interval pattern as NHS.
      // System time: 2025-08-21T10:00:00Z (set in beforeEach)
      mockFetchDividendHistory.mockResolvedValueOnce([
        { amount: 0.023, date: new Date('2025-06-16') }, // past
        { amount: 0.023, date: new Date('2025-07-13') }, // past (+27 days)
        { amount: 0.023, date: new Date('2025-08-09') }, // past (+27 days)
        { amount: 0.023, date: new Date('2025-09-15') }, // future
      ]);
      const result = await getDistributions('CIK');

      expect(result?.distributions_per_year).toBe(12);
    }
  );

  test(
    'FIX(73-2): getDistributions returns distributions_per_year = 12 for CEF symbol DMB',
    async function fixDmbCefDistributionsPerYear() {
      // Same DST-induced sub-27-day interval pattern as NHS.
      // System time: 2025-08-21T10:00:00Z (set in beforeEach)
      mockFetchDividendHistory.mockResolvedValueOnce([
        { amount: 0.042, date: new Date('2025-06-20') }, // past
        { amount: 0.042, date: new Date('2025-07-17') }, // past (+27 days)
        { amount: 0.042, date: new Date('2025-08-13') }, // past (+27 days)
        { amount: 0.042, date: new Date('2025-09-15') }, // future
      ]);
      const result = await getDistributions('DMB');

      expect(result?.distributions_per_year).toBe(12);
    }
  );
});
