import { describe, expect, test } from 'vitest';

import { applyYieldFilter } from './apply-yield-filter.function';
import type { UniverseDisplayData } from './universe-display-data.interface';

describe('applyYieldFilter', () => {
  const createMockData = (
    yieldPercent: number,
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
    yield_percent: yieldPercent,
    avg_purchase_yield_percent: 1.0,
    expired: false,
    position: 1000,
  });

  test('returns all data when minYield is null', () => {
    const data = [
      createMockData(2.5, 'LOW_YIELD'),
      createMockData(5.0, 'MED_YIELD'),
      createMockData(8.5, 'HIGH_YIELD'),
    ];

    const result = applyYieldFilter(data, null);

    expect(result).toEqual(data);
    expect(result).toHaveLength(3);
  });

  test('returns all data when minYield is undefined', () => {
    const data = [
      createMockData(2.5, 'LOW_YIELD'),
      createMockData(5.0, 'MED_YIELD'),
    ];

    const result = applyYieldFilter(data, undefined as unknown as number);

    expect(result).toEqual(data);
    expect(result).toHaveLength(2);
  });

  test('filters symbols with yield greater than or equal to minYield', () => {
    const data = [
      createMockData(2.5, 'LOW_YIELD'),
      createMockData(5.0, 'MED_YIELD'),
      createMockData(8.5, 'HIGH_YIELD'),
      createMockData(3.0, 'ANOTHER_LOW'),
    ];

    const result = applyYieldFilter(data, 5.0);

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.symbol)).toEqual(['MED_YIELD', 'HIGH_YIELD']);
    expect(result.every((r) => r.yield_percent >= 5.0)).toBe(true);
  });

  test('returns empty array when no symbols meet minimum yield', () => {
    const data = [
      createMockData(2.5, 'LOW_YIELD'),
      createMockData(3.0, 'ANOTHER_LOW'),
    ];

    const result = applyYieldFilter(data, 5.0);

    expect(result).toHaveLength(0);
  });

  test('handles exact yield matches', () => {
    const data = [
      createMockData(5.0, 'EXACT_MATCH'),
      createMockData(4.99, 'JUST_BELOW'),
      createMockData(5.01, 'JUST_ABOVE'),
    ];

    const result = applyYieldFilter(data, 5.0);

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.symbol)).toEqual(['EXACT_MATCH', 'JUST_ABOVE']);
  });

  test('handles empty data array', () => {
    const result = applyYieldFilter([], 5.0);
    expect(result).toEqual([]);
  });

  test('handles zero and negative yields', () => {
    const data = [
      createMockData(-1.0, 'NEGATIVE'),
      createMockData(0, 'ZERO'),
      createMockData(1.0, 'POSITIVE'),
      createMockData(5.0, 'HIGH'),
    ];

    const result = applyYieldFilter(data, 0);

    // Implementation checks minYield > 0, so minYield = 0 returns all data
    expect(result).toHaveLength(4);
    expect(result.map((r) => r.symbol)).toEqual([
      'NEGATIVE',
      'ZERO',
      'POSITIVE',
      'HIGH',
    ]);
  });

  test('handles very high minimum yield threshold', () => {
    const data = [
      createMockData(5.0, 'MEDIUM'),
      createMockData(10.0, 'HIGH'),
      createMockData(15.0, 'VERY_HIGH'),
    ];

    const result = applyYieldFilter(data, 20.0);

    expect(result).toHaveLength(0);
  });

  test('handles decimal precision correctly', () => {
    const data = [
      createMockData(4.999, 'JUST_UNDER'),
      createMockData(5.0, 'EXACT'),
      createMockData(5.001, 'JUST_OVER'),
    ];

    const result = applyYieldFilter(data, 5.0);

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.symbol)).toEqual(['EXACT', 'JUST_OVER']);
  });

  test('filters out symbols with null or undefined yield', () => {
    const data = [
      createMockData(2.5, 'VALID_YIELD'),
      { ...createMockData(0, 'NULL_YIELD'), yield_percent: null as any },
      {
        ...createMockData(0, 'UNDEFINED_YIELD'),
        yield_percent: undefined as any,
      },
      createMockData(3.0, 'ANOTHER_VALID'),
    ];

    const result = applyYieldFilter(data, 2.0);

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.symbol)).toEqual([
      'VALID_YIELD',
      'ANOTHER_VALID',
    ]);
  });

  test('filters with positive minYield correctly', () => {
    const data = [
      createMockData(-1.0, 'NEGATIVE'),
      createMockData(0, 'ZERO'),
      createMockData(1.0, 'POSITIVE'),
      createMockData(5.0, 'HIGH'),
    ];

    const result = applyYieldFilter(data, 1.0);

    // With minYield > 0, Boolean check and >= comparison apply
    // NEGATIVE: Boolean(-1.0) = true, -1.0 >= 1.0 = false → filtered out
    // ZERO: Boolean(0) = false → filtered out
    // POSITIVE: Boolean(1.0) = true, 1.0 >= 1.0 = true → included
    // HIGH: Boolean(5.0) = true, 5.0 >= 1.0 = true → included
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.symbol)).toEqual(['POSITIVE', 'HIGH']);
  });
});
