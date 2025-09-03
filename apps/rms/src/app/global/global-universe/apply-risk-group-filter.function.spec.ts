import { describe, expect, test } from 'vitest';

import { applyRiskGroupFilter } from './apply-risk-group-filter.function';
import type { UniverseDisplayData } from './universe-display-data.interface';

describe('applyRiskGroupFilter', () => {
  const createMockData = (
    riskGroup: string,
    symbol = 'TEST'
  ): UniverseDisplayData => ({
    symbol,
    riskGroup,
    distribution: 0.25,
    distributions_per_year: 4,
    last_price: 150.0,
    most_recent_sell_date: null,
    most_recent_sell_price: null,
    ex_date: new Date('2024-03-15'),
    yield_percent: 1.0,
    avg_purchase_yield_percent: 1.0,
    expired: false,
    position: 1000,
  });

  test('returns all data when riskGroupFilter is empty string', () => {
    const data = [
      createMockData('Growth', 'AAPL'),
      createMockData('Value', 'KO'),
      createMockData('Dividend', 'JNJ'),
    ];

    const result = applyRiskGroupFilter(data, '');

    expect(result).toEqual(data);
    expect(result).toHaveLength(3);
  });

  test('returns all data when riskGroupFilter is null', () => {
    const data = [
      createMockData('Growth', 'AAPL'),
      createMockData('Value', 'KO'),
    ];

    const result = applyRiskGroupFilter(data, null as unknown as string);

    expect(result).toEqual(data);
    expect(result).toHaveLength(2);
  });

  test('filters symbols by exact risk group match (case sensitive)', () => {
    const data = [
      createMockData('Growth', 'AAPL'),
      createMockData('Value', 'KO'),
      createMockData('Dividend', 'JNJ'),
      createMockData('Growth', 'MSFT'),
    ];

    const result = applyRiskGroupFilter(data, 'Growth');

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.symbol)).toEqual(['AAPL', 'MSFT']);
    expect(result.every((r) => r.riskGroup === 'Growth')).toBe(true);
  });

  test('filters symbols by risk group (case sensitive)', () => {
    const data = [
      createMockData('Growth', 'AAPL'),
      createMockData('Value', 'KO'),
      createMockData('growth', 'GOOGL'), // lowercase
      createMockData('GROWTH', 'AMZN'), // uppercase
    ];

    const result = applyRiskGroupFilter(data, 'growth');

    // Only exact case match
    expect(result).toHaveLength(1);
    expect(result.map((r) => r.symbol)).toEqual(['GOOGL']);
  });

  test('returns empty array when no symbols match risk group', () => {
    const data = [
      createMockData('Growth', 'AAPL'),
      createMockData('Value', 'KO'),
    ];

    const result = applyRiskGroupFilter(data, 'Tech');

    expect(result).toHaveLength(0);
  });

  test('handles empty data array', () => {
    const result = applyRiskGroupFilter([], 'Growth');
    expect(result).toEqual([]);
  });

  test('handles special characters and spaces in risk group names', () => {
    const data = [
      createMockData('High-Growth', 'AAPL'),
      createMockData('Blue Chip', 'KO'),
      createMockData('High-Growth', 'MSFT'),
      createMockData('Value', 'JNJ'),
    ];

    const result = applyRiskGroupFilter(data, 'High-Growth');

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.symbol)).toEqual(['AAPL', 'MSFT']);
  });

  test('handles mixed case filtering (case sensitive)', () => {
    const data = [
      createMockData('Growth', 'AAPL'),
      createMockData('GROWTH', 'MSFT'),
      createMockData('growth', 'GOOGL'),
      createMockData('Value', 'KO'),
    ];

    const result = applyRiskGroupFilter(data, 'GROWTH');

    // Only exact case match
    expect(result).toHaveLength(1);
    expect(result.map((r) => r.symbol)).toEqual(['MSFT']);
  });

  test('handles whitespace in filter term', () => {
    const data = [
      createMockData('Growth', 'AAPL'),
      createMockData('Value', 'KO'),
    ];

    const result = applyRiskGroupFilter(data, ' Growth ');

    // Implementation checks trim() != '' but uses original filter for matching
    // so ' Growth ' will not match 'Growth'
    expect(result).toHaveLength(0);
  });

  test('handles numeric and mixed alphanumeric risk groups', () => {
    const data = [
      createMockData('Category1', 'AAPL'),
      createMockData('Category2', 'MSFT'),
      createMockData('Category1', 'GOOGL'),
    ];

    const result = applyRiskGroupFilter(data, 'Category1');

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.symbol)).toEqual(['AAPL', 'GOOGL']);
  });
});
