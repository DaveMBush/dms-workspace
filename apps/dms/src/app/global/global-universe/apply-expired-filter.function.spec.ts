import { describe, expect, test } from 'vitest';

import { applyExpiredFilter } from './apply-expired-filter.function';
import type { UniverseDisplayData } from './universe-display-data.interface';

describe('applyExpiredFilter', () => {
  const createMockData = (
    expired: boolean,
    symbol = 'TEST'
  ): UniverseDisplayData => ({
    symbol,
    riskGroup: 'Growth',
    distribution: 0.25,
    distributions_per_year: 4,
    last_price: 150.0,
    most_recent_sell_date: null,
    most_recent_sell_price: null,
    ex_date: new Date('2024-03-15'),
    yield_percent: 1.0,
    avg_purchase_yield_percent: 1.0,
    expired,
    position: 1000,
  });

  test('returns all data when expiredFilter is null (no filtering)', () => {
    const data = [
      createMockData(true, 'EXPIRED_SYMBOL'),
      createMockData(false, 'NOT_EXPIRED_SYMBOL'),
    ];

    const result = applyExpiredFilter(data, null);

    expect(result).toEqual(data);
    expect(result).toHaveLength(2);
  });

  test('filters to show only expired symbols when expiredFilter is true', () => {
    const data = [
      createMockData(true, 'EXPIRED_SYMBOL'),
      createMockData(false, 'NOT_EXPIRED_SYMBOL'),
      createMockData(true, 'ANOTHER_EXPIRED'),
    ];

    const result = applyExpiredFilter(data, true);

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.symbol)).toEqual([
      'EXPIRED_SYMBOL',
      'ANOTHER_EXPIRED',
    ]);
    expect(result.every((r) => r.expired)).toBe(true);
  });

  test('filters to show only non-expired symbols when expiredFilter is false', () => {
    const data = [
      createMockData(true, 'EXPIRED_SYMBOL'),
      createMockData(false, 'NOT_EXPIRED_SYMBOL'),
      createMockData(false, 'ANOTHER_NOT_EXPIRED'),
    ];

    const result = applyExpiredFilter(data, false);

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.symbol)).toEqual([
      'NOT_EXPIRED_SYMBOL',
      'ANOTHER_NOT_EXPIRED',
    ]);
    expect(result.every((r) => !r.expired)).toBe(true);
  });

  test('returns empty array when no symbols match filter', () => {
    const data = [
      createMockData(false, 'NOT_EXPIRED_SYMBOL'),
      createMockData(false, 'ANOTHER_NOT_EXPIRED'),
    ];

    const result = applyExpiredFilter(data, true);

    expect(result).toHaveLength(0);
  });

  test('handles empty data array', () => {
    const result = applyExpiredFilter([], true);
    expect(result).toEqual([]);
  });

  test('handles mixed expired states correctly', () => {
    const data = [
      createMockData(true, 'EXPIRED_1'),
      createMockData(false, 'NOT_EXPIRED_1'),
      createMockData(true, 'EXPIRED_2'),
      createMockData(false, 'NOT_EXPIRED_2'),
    ];

    const expiredResult = applyExpiredFilter(data, true);
    const notExpiredResult = applyExpiredFilter(data, false);

    expect(expiredResult).toHaveLength(2);
    expect(notExpiredResult).toHaveLength(2);
    expect(expiredResult.concat(notExpiredResult)).toHaveLength(4);
  });
});
