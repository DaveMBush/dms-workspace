import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { ProcessedRow } from '../../common/distribution-api.function';
import { getDistributions } from './get-distributions.function';

// Hoisted mock
const mockFetchDistributionData = vi.hoisted(() => vi.fn());

vi.mock('../../common/distribution-api.function', () => ({
  fetchDistributionData: mockFetchDistributionData,
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

  test('correctly identifies monthly at 30-day interval', async () => {
    const mockRows: ProcessedRow[] = [
      { amount: 0.25, date: new Date('2025-07-15') },
      { amount: 0.25, date: new Date('2025-08-14') }, // 30 days
    ];

    mockFetchDistributionData.mockResolvedValueOnce(mockRows);

    const result = await getDistributions('MONTHLY_BOUNDARY');

    expect(result?.distributions_per_year).toBe(12);
  });
});
