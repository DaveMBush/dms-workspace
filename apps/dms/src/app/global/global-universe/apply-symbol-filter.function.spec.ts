import { describe, expect, test } from 'vitest';

import { applySymbolFilter } from './apply-symbol-filter.function';
import type { UniverseDisplayData } from './universe-display-data.interface';

describe('applySymbolFilter', () => {
  const createMockData = (symbol: string): UniverseDisplayData => ({
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
    expired: false,
    position: 1000,
  });

  test('returns all data when symbolFilter is empty string', () => {
    const data = [
      createMockData('AAPL'),
      createMockData('MSFT'),
      createMockData('GOOGL'),
    ];

    const result = applySymbolFilter(data, '');

    expect(result).toEqual(data);
    expect(result).toHaveLength(3);
  });

  test('returns all data when symbolFilter is null', () => {
    const data = [createMockData('AAPL'), createMockData('MSFT')];

    const result = applySymbolFilter(data, null as unknown as string);

    expect(result).toEqual(data);
    expect(result).toHaveLength(2);
  });

  test('filters symbols containing the search term (case insensitive)', () => {
    const data = [
      createMockData('AAPL'),
      createMockData('MSFT'),
      createMockData('GOOGL'),
      createMockData('AMZN'),
    ];

    const result = applySymbolFilter(data, 'A');

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.symbol)).toEqual(['AAPL', 'AMZN']);
  });

  test('filters symbols with partial matches (case insensitive)', () => {
    const data = [
      createMockData('AAPL'),
      createMockData('MSFT'),
      createMockData('GOOGL'),
      createMockData('GOOG'),
    ];

    const result = applySymbolFilter(data, 'goog');

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.symbol)).toEqual(['GOOGL', 'GOOG']);
  });

  test('returns empty array when no symbols match', () => {
    const data = [createMockData('AAPL'), createMockData('MSFT')];

    const result = applySymbolFilter(data, 'XYZ');

    expect(result).toHaveLength(0);
  });

  test('handles empty data array', () => {
    const result = applySymbolFilter([], 'AAPL');
    expect(result).toEqual([]);
  });

  test('filters by exact match', () => {
    const data = [
      createMockData('AAPL'),
      createMockData('AAPLX'),
      createMockData('MSFT'),
    ];

    const result = applySymbolFilter(data, 'AAPL');

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.symbol)).toEqual(['AAPL', 'AAPLX']);
  });

  test('handles symbols with numbers and special characters', () => {
    const data = [
      createMockData('BRK-A'),
      createMockData('BRK-B'),
      createMockData('SPY'),
      createMockData('QQQ'),
    ];

    const result = applySymbolFilter(data, 'BRK');

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.symbol)).toEqual(['BRK-A', 'BRK-B']);
  });

  test('handles whitespace in search term', () => {
    const data = [createMockData('AAPL'), createMockData('MSFT')];

    const result = applySymbolFilter(data, ' AAPL ');

    // Implementation uses original filter (not trimmed) for matching
    // so ' AAPL ' will not match 'AAPL'
    expect(result).toHaveLength(0);
  });
});
