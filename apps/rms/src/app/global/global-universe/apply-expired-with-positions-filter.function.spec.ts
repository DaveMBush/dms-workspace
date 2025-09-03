import { describe, expect, test } from 'vitest';

import { applyExpiredWithPositionsFilter } from './apply-expired-with-positions-filter.function';
import type { UniverseDisplayData } from './universe-display-data.interface';

describe('applyExpiredWithPositionsFilter', () => {
  const createMockData = (
    expired: boolean,
    position: number,
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
    position,
  });

  test('returns original data when explicit expired filter is set (bypass)', () => {
    const data = [
      createMockData(true, 0, 'EXPIRED_NO_POS'),
      createMockData(false, 1000, 'NOT_EXPIRED'),
    ];

    const result = applyExpiredWithPositionsFilter(data, true);

    expect(result).toEqual(data);
  });

  test('returns original data when explicit expired filter is false', () => {
    const data = [
      createMockData(true, 0, 'EXPIRED_NO_POS'),
      createMockData(false, 1000, 'NOT_EXPIRED'),
    ];

    const result = applyExpiredWithPositionsFilter(data, false);

    expect(result).toEqual(data);
  });

  test('filters expired symbols without positions (basic case)', () => {
    const data = [
      createMockData(true, 1000, 'EXPIRED_WITH_POS'),
      createMockData(true, 0, 'EXPIRED_NO_POS'),
      createMockData(false, 0, 'NOT_EXPIRED_NO_POS'),
      createMockData(false, 1000, 'NOT_EXPIRED_WITH_POS'),
    ];

    const result = applyExpiredWithPositionsFilter(data, null);

    expect(result).toHaveLength(3);
    expect(result.map((r) => r.symbol)).toContain('EXPIRED_WITH_POS');
    expect(result.map((r) => r.symbol)).not.toContain('EXPIRED_NO_POS');
    expect(result.map((r) => r.symbol)).toContain('NOT_EXPIRED_NO_POS');
    expect(result.map((r) => r.symbol)).toContain('NOT_EXPIRED_WITH_POS');
  });

  test('shows all non-expired symbols regardless of position', () => {
    const data = [
      createMockData(false, 0, 'NOT_EXPIRED_NO_POS'),
      createMockData(false, 1000, 'NOT_EXPIRED_WITH_POS'),
      createMockData(false, -100, 'NOT_EXPIRED_NEGATIVE_POS'),
    ];

    const result = applyExpiredWithPositionsFilter(data, null);

    expect(result).toHaveLength(3);
    expect(result.map((r) => r.symbol)).toContain('NOT_EXPIRED_NO_POS');
    expect(result.map((r) => r.symbol)).toContain('NOT_EXPIRED_WITH_POS');
    expect(result.map((r) => r.symbol)).toContain('NOT_EXPIRED_NEGATIVE_POS');
  });

  test('handles zero and negative positions correctly', () => {
    const data = [
      createMockData(true, 0, 'ZERO_POSITION'),
      createMockData(true, -100, 'NEGATIVE_POSITION'),
      createMockData(true, 0.1, 'SMALL_POSITIVE_POSITION'),
      createMockData(true, 1000, 'LARGE_POSITIVE_POSITION'),
    ];

    const result = applyExpiredWithPositionsFilter(data, null);

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.symbol)).not.toContain('ZERO_POSITION');
    expect(result.map((r) => r.symbol)).not.toContain('NEGATIVE_POSITION');
    expect(result.map((r) => r.symbol)).toContain('SMALL_POSITIVE_POSITION');
    expect(result.map((r) => r.symbol)).toContain('LARGE_POSITIVE_POSITION');
  });

  test('handles null/undefined expired flag as non-expired', () => {
    const data = [
      {
        symbol: 'NULL_EXPIRED',
        riskGroup: 'Growth',
        distribution: 0.25,
        distributions_per_year: 4,
        last_price: 150.0,
        most_recent_sell_date: null,
        most_recent_sell_price: null,
        ex_date: new Date('2024-03-15'),
        yield_percent: 1.0,
        avg_purchase_yield_percent: 1.0,
        expired: null as unknown as boolean,
        position: 0,
      },
      {
        symbol: 'UNDEFINED_EXPIRED',
        riskGroup: 'Growth',
        distribution: 0.25,
        distributions_per_year: 4,
        last_price: 150.0,
        most_recent_sell_date: null,
        most_recent_sell_price: null,
        ex_date: new Date('2024-03-15'),
        yield_percent: 1.0,
        avg_purchase_yield_percent: 1.0,
        expired: undefined as unknown as boolean,
        position: 0,
      },
    ];

    const result = applyExpiredWithPositionsFilter(data, null);

    // null/undefined expired should be treated as non-expired (show)
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.symbol)).toContain('NULL_EXPIRED');
    expect(result.map((r) => r.symbol)).toContain('UNDEFINED_EXPIRED');
  });

  test('handles mixed expired and non-expired data correctly', () => {
    const data = [
      createMockData(true, 1000, 'EXPIRED_WITH_POS'),
      createMockData(true, 0, 'EXPIRED_NO_POS'),
      createMockData(false, 0, 'NOT_EXPIRED_NO_POS'),
      createMockData(false, 1000, 'NOT_EXPIRED_WITH_POS'),
    ];

    const result = applyExpiredWithPositionsFilter(data, null);

    expect(result).toHaveLength(3);
    expect(result.map((r) => r.symbol)).toContain('EXPIRED_WITH_POS');
    expect(result.map((r) => r.symbol)).not.toContain('EXPIRED_NO_POS');
    expect(result.map((r) => r.symbol)).toContain('NOT_EXPIRED_NO_POS');
    expect(result.map((r) => r.symbol)).toContain('NOT_EXPIRED_WITH_POS');
  });

  test('works correctly with "All Accounts" data where position represents total across accounts', () => {
    // This test simulates data after applyAllAccountsFilter has set position to total across all accounts
    const data = [
      createMockData(true, 5000, 'EXPIRED_WITH_TOTAL_POS'), // Has positions across accounts
      createMockData(true, 0, 'EXPIRED_NO_TOTAL_POS'), // No positions in any account
      createMockData(false, 0, 'NOT_EXPIRED_NO_TOTAL_POS'), // Non-expired, no positions
    ];

    const result = applyExpiredWithPositionsFilter(data, null);

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.symbol)).toContain('EXPIRED_WITH_TOTAL_POS');
    expect(result.map((r) => r.symbol)).not.toContain('EXPIRED_NO_TOTAL_POS');
    expect(result.map((r) => r.symbol)).toContain('NOT_EXPIRED_NO_TOTAL_POS');
  });
});
