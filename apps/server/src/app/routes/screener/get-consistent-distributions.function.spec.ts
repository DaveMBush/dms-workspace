import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { ProcessedRow } from '../../common/distribution-api.function';
import { getConsistentDistributions } from './get-consistent-distributions.function';

// Hoisted mock
const mockFetchDistributionData = vi.hoisted(() => vi.fn());

vi.mock('../common/distribution-api.function', () => ({
  fetchDistributionData: mockFetchDistributionData,
}));

describe('getConsistentDistributions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-11-09T10:00:00Z'));
  });

  afterEach(() => {
    try {
      vi.useRealTimers();
    } catch {
      // Ignore errors when restoring timers
    }
  });

  describe('basic functionality', () => {
    test('returns false for empty data', async () => {
      mockFetchDistributionData.mockResolvedValueOnce([]);

      const result = await getConsistentDistributions('EMPTY');

      expect(result).toBe(false);
    });

    test('returns true when less than 3 past distributions', async () => {
      const mockRows: ProcessedRow[] = [
        { amount: 0.5, date: new Date('2025-10-15') },
        { amount: 0.5, date: new Date('2025-11-01') },
      ];

      mockFetchDistributionData.mockResolvedValueOnce(mockRows);

      const result = await getConsistentDistributions('TWO_ONLY');

      expect(result).toBe(true);
    });

    test('returns true for consistent distributions', async () => {
      const mockRows: ProcessedRow[] = [
        { amount: 0.5, date: new Date('2025-09-15') },
        { amount: 0.5, date: new Date('2025-10-15') },
        { amount: 0.5, date: new Date('2025-11-01') },
      ];

      mockFetchDistributionData.mockResolvedValueOnce(mockRows);

      const result = await getConsistentDistributions('CONSISTENT');

      expect(result).toBe(true);
    });
  });

  describe('future dividend filtering', () => {
    test('excludes future dividends from trend analysis', async () => {
      const mockRows: ProcessedRow[] = [
        { amount: 0.5, date: new Date('2025-08-15') },
        { amount: 0.5, date: new Date('2025-09-15') },
        { amount: 0.5, date: new Date('2025-10-15') },
        { amount: 0.25, date: new Date('2025-11-15') }, // Future
        { amount: 0.1, date: new Date('2025-12-15') }, // Future
      ];

      mockFetchDistributionData.mockResolvedValueOnce(mockRows);

      const result = await getConsistentDistributions('WITH_FUTURE');

      // Should analyze only the 3 past distributions (all 0.5, consistent)
      expect(result).toBe(true);
    });

    test('returns true when only future dividends exist', async () => {
      const mockRows: ProcessedRow[] = [
        { amount: 0.5, date: new Date('2025-11-15') },
        { amount: 0.5, date: new Date('2025-12-15') },
      ];

      mockFetchDistributionData.mockResolvedValueOnce(mockRows);

      const result = await getConsistentDistributions('ONLY_FUTURE');

      // No past distributions, cannot determine trend
      expect(result).toBe(true);
    });

    test('detects declining past distributions when mixed with future', async () => {
      const mockRows: ProcessedRow[] = [
        { amount: 0.8, date: new Date('2025-07-15') },
        { amount: 0.6, date: new Date('2025-08-15') },
        { amount: 0.4, date: new Date('2025-09-15') }, // Declining trend
        { amount: 0.9, date: new Date('2025-11-15') }, // Future - ignored
      ];

      mockFetchDistributionData.mockResolvedValueOnce(mockRows);

      const result = await getConsistentDistributions('DECLINING_WITH_FUTURE');

      // Should detect declining trend in past distributions
      expect(result).toBe(false);
    });
  });

  describe('duplicate date handling', () => {
    test('removes duplicate dates and analyzes unique distributions', async () => {
      const mockRows: ProcessedRow[] = [
        { amount: 0.5, date: new Date('2025-09-15') },
        { amount: 0.6, date: new Date('2025-09-15') }, // Duplicate date
        { amount: 0.5, date: new Date('2025-10-15') },
        { amount: 0.5, date: new Date('2025-11-01') },
      ];

      mockFetchDistributionData.mockResolvedValueOnce(mockRows);

      const result = await getConsistentDistributions('WITH_DUPLICATES');

      // Should analyze 3 unique dates, keeping first occurrence (0.5)
      expect(result).toBe(true);
    });

    test('returns true when duplicates reduce count below 3', async () => {
      const mockRows: ProcessedRow[] = [
        { amount: 0.5, date: new Date('2025-10-15') },
        { amount: 0.6, date: new Date('2025-10-15') }, // Duplicate
        { amount: 0.7, date: new Date('2025-11-01') },
      ];

      mockFetchDistributionData.mockResolvedValueOnce(mockRows);

      const result = await getConsistentDistributions(
        'DUPLICATES_INSUFFICIENT'
      );

      // Only 2 unique dates after de-duplication
      expect(result).toBe(true);
    });

    test('keeps first occurrence when removing duplicates', async () => {
      const mockRows: ProcessedRow[] = [
        { amount: 0.8, date: new Date('2025-08-15') },
        { amount: 0.6, date: new Date('2025-09-15') },
        { amount: 0.4, date: new Date('2025-10-15') },
        { amount: 0.999, date: new Date('2025-10-15') }, // Duplicate - removed
      ];

      mockFetchDistributionData.mockResolvedValueOnce(mockRows);

      const result = await getConsistentDistributions('DUPLICATE_LAST');

      // Should use first occurrence (0.4), detect declining trend
      expect(result).toBe(false);
    });

    test('handles all distributions on same date', async () => {
      const mockRows: ProcessedRow[] = [
        { amount: 0.5, date: new Date('2025-10-15') },
        { amount: 0.6, date: new Date('2025-10-15') },
        { amount: 0.7, date: new Date('2025-10-15') },
      ];

      mockFetchDistributionData.mockResolvedValueOnce(mockRows);

      const result = await getConsistentDistributions('ALL_SAME_DATE');

      // Only 1 unique date after deduplication
      expect(result).toBe(true);
    });
  });

  describe('declining trend detection', () => {
    test('detects declining trend with valid data', async () => {
      const mockRows: ProcessedRow[] = [
        { amount: 0.8, date: new Date('2025-08-15') },
        { amount: 0.6, date: new Date('2025-09-15') },
        { amount: 0.4, date: new Date('2025-10-15') },
      ];

      mockFetchDistributionData.mockResolvedValueOnce(mockRows);

      const result = await getConsistentDistributions('DECLINING');

      expect(result).toBe(false);
    });

    test('returns true for stable distributions', async () => {
      const mockRows: ProcessedRow[] = [
        { amount: 0.5, date: new Date('2025-08-15') },
        { amount: 0.5, date: new Date('2025-09-15') },
        { amount: 0.5, date: new Date('2025-10-15') },
      ];

      mockFetchDistributionData.mockResolvedValueOnce(mockRows);

      const result = await getConsistentDistributions('STABLE');

      expect(result).toBe(true);
    });

    test('returns true for increasing distributions', async () => {
      const mockRows: ProcessedRow[] = [
        { amount: 0.4, date: new Date('2025-08-15') },
        { amount: 0.6, date: new Date('2025-09-15') },
        { amount: 0.8, date: new Date('2025-10-15') },
      ];

      mockFetchDistributionData.mockResolvedValueOnce(mockRows);

      const result = await getConsistentDistributions('INCREASING');

      expect(result).toBe(true);
    });

    test('returns true when middle value breaks declining pattern', async () => {
      const mockRows: ProcessedRow[] = [
        { amount: 0.8, date: new Date('2025-08-15') },
        { amount: 0.9, date: new Date('2025-09-15') }, // Breaks pattern
        { amount: 0.4, date: new Date('2025-10-15') },
      ];

      mockFetchDistributionData.mockResolvedValueOnce(mockRows);

      const result = await getConsistentDistributions('NON_CONSISTENT_DECLINE');

      // Not a consistent declining trend
      expect(result).toBe(true);
    });
  });

  describe('date ordering validation', () => {
    test('returns false when dates are not properly ordered', async () => {
      const mockRows: ProcessedRow[] = [
        { amount: 0.5, date: new Date('2025-10-15') },
        { amount: 0.6, date: new Date('2025-08-15') }, // Out of order
        { amount: 0.7, date: new Date('2025-09-15') },
      ];

      mockFetchDistributionData.mockResolvedValueOnce(mockRows);

      const result = await getConsistentDistributions('UNORDERED');

      // Data not properly ordered, cannot determine trend
      expect(result).toBe(false);
    });

    test('handles properly ordered data correctly', async () => {
      const mockRows: ProcessedRow[] = [
        { amount: 0.8, date: new Date('2025-08-15') },
        { amount: 0.6, date: new Date('2025-09-15') },
        { amount: 0.4, date: new Date('2025-10-15') },
      ];

      mockFetchDistributionData.mockResolvedValueOnce(mockRows);

      const result = await getConsistentDistributions('ORDERED');

      // Properly ordered, declining trend detected
      expect(result).toBe(false);
    });
  });

  describe('edge cases', () => {
    test('handles exactly 3 distributions at time boundary', async () => {
      const mockRows: ProcessedRow[] = [
        { amount: 0.5, date: new Date('2025-09-15') },
        { amount: 0.5, date: new Date('2025-10-15') },
        { amount: 0.5, date: new Date('2025-11-09T09:59:59Z') }, // Just before "today"
      ];

      mockFetchDistributionData.mockResolvedValueOnce(mockRows);

      const result = await getConsistentDistributions('BOUNDARY');

      expect(result).toBe(true);
    });

    test('handles more than 3 distributions by using last 3', async () => {
      const mockRows: ProcessedRow[] = [
        { amount: 0.9, date: new Date('2025-06-15') },
        { amount: 0.85, date: new Date('2025-07-15') },
        { amount: 0.8, date: new Date('2025-08-15') },
        { amount: 0.6, date: new Date('2025-09-15') },
        { amount: 0.4, date: new Date('2025-10-15') },
      ];

      mockFetchDistributionData.mockResolvedValueOnce(mockRows);

      const result = await getConsistentDistributions('MANY');

      // Should analyze last 3 (0.8, 0.6, 0.4) - declining
      expect(result).toBe(false);
    });

    test('handles single distribution', async () => {
      const mockRows: ProcessedRow[] = [
        { amount: 0.5, date: new Date('2025-10-15') },
      ];

      mockFetchDistributionData.mockResolvedValueOnce(mockRows);

      const result = await getConsistentDistributions('SINGLE');

      // Not enough data to determine trend
      expect(result).toBe(true);
    });
  });

  describe('real-world scenarios', () => {
    test('handles typical quarterly distribution pattern', async () => {
      const mockRows: ProcessedRow[] = [
        { amount: 0.5, date: new Date('2025-02-15') },
        { amount: 0.5, date: new Date('2025-05-15') },
        { amount: 0.5, date: new Date('2025-08-15') },
        { amount: 0.5, date: new Date('2025-11-01') },
      ];

      mockFetchDistributionData.mockResolvedValueOnce(mockRows);

      const result = await getConsistentDistributions('QUARTERLY');

      // Consistent quarterly distributions
      expect(result).toBe(true);
    });

    test('handles monthly distributions with recent decline', async () => {
      const mockRows: ProcessedRow[] = [
        { amount: 0.1, date: new Date('2025-07-15') },
        { amount: 0.1, date: new Date('2025-08-15') },
        { amount: 0.08, date: new Date('2025-09-15') },
        { amount: 0.06, date: new Date('2025-10-15') },
      ];

      mockFetchDistributionData.mockResolvedValueOnce(mockRows);

      const result = await getConsistentDistributions('MONTHLY_DECLINING');

      // Last 3: 0.1, 0.08, 0.06 - declining
      expect(result).toBe(false);
    });

    test('handles frequency change with consistent amounts', async () => {
      const mockRows: ProcessedRow[] = [
        { amount: 0.4, date: new Date('2025-08-15') },
        { amount: 0.4, date: new Date('2025-09-15') },
        { amount: 0.1, date: new Date('2025-10-21') },
        { amount: 0.1, date: new Date('2025-10-28') },
        { amount: 0.1, date: new Date('2025-11-04') },
      ];

      mockFetchDistributionData.mockResolvedValueOnce(mockRows);

      const result = await getConsistentDistributions('FREQUENCY_CHANGE');

      // Last 3: 0.1, 0.1, 0.1 - consistent
      expect(result).toBe(true);
    });
  });
});
