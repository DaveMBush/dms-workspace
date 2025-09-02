import { describe, expect, test, vi } from 'vitest';

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

  const mockHasPositionsInAnyAccount = vi.fn();

  test('returns original data when explicit expired filter is set (null bypass)', () => {
    const data = [
      createMockData(true, 0, 'EXPIRED_NO_POS'),
      createMockData(false, 1000, 'NOT_EXPIRED'),
    ];

    const result = applyExpiredWithPositionsFilter(
      data,
      true, // expiredFilter explicitly set
      'account-1',
      mockHasPositionsInAnyAccount
    );

    expect(result).toEqual(data);
    expect(mockHasPositionsInAnyAccount).not.toHaveBeenCalled();
  });

  test('filters expired symbols without positions for specific account', () => {
    const data = [
      createMockData(true, 1000, 'EXPIRED_WITH_POS'),
      createMockData(true, 0, 'EXPIRED_NO_POS'),
      createMockData(false, 0, 'NOT_EXPIRED_NO_POS'),
      createMockData(false, 1000, 'NOT_EXPIRED_WITH_POS'),
    ];

    const result = applyExpiredWithPositionsFilter(
      data,
      null, // no explicit filter
      'account-1',
      mockHasPositionsInAnyAccount
    );

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

    const result = applyExpiredWithPositionsFilter(
      data,
      null,
      'account-1',
      mockHasPositionsInAnyAccount
    );

    expect(result).toHaveLength(3);
    expect(result.map((r) => r.symbol)).toContain('NOT_EXPIRED_NO_POS');
    expect(result.map((r) => r.symbol)).toContain('NOT_EXPIRED_WITH_POS');
    expect(result.map((r) => r.symbol)).toContain('NOT_EXPIRED_NEGATIVE_POS');
  });

  test('uses hasPositionsInAnyAccount function when selectedAccount is "all"', () => {
    mockHasPositionsInAnyAccount.mockClear();

    const data = [
      createMockData(true, 0, 'EXPIRED_SYMBOL_1'),
      createMockData(true, 0, 'EXPIRED_SYMBOL_2'),
    ];

    mockHasPositionsInAnyAccount.mockReturnValueOnce(true); // First symbol has positions
    mockHasPositionsInAnyAccount.mockReturnValueOnce(false); // Second symbol has no positions

    const result = applyExpiredWithPositionsFilter(
      data,
      null,
      'all',
      mockHasPositionsInAnyAccount
    );

    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe('EXPIRED_SYMBOL_1');
    expect(mockHasPositionsInAnyAccount).toHaveBeenCalledWith(
      'EXPIRED_SYMBOL_1'
    );
    expect(mockHasPositionsInAnyAccount).toHaveBeenCalledWith(
      'EXPIRED_SYMBOL_2'
    );
  });

  test('handles zero and negative positions correctly', () => {
    const data = [
      createMockData(true, 0, 'ZERO_POSITION'),
      createMockData(true, -100, 'NEGATIVE_POSITION'),
      createMockData(true, 0.1, 'SMALL_POSITIVE_POSITION'),
      createMockData(true, 1000, 'LARGE_POSITIVE_POSITION'),
    ];

    const result = applyExpiredWithPositionsFilter(
      data,
      null,
      'account-1',
      mockHasPositionsInAnyAccount
    );

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

    const result = applyExpiredWithPositionsFilter(
      data,
      null,
      'account-1',
      mockHasPositionsInAnyAccount
    );

    // null/undefined expired should be treated as non-expired (show)
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.symbol)).toContain('NULL_EXPIRED');
    expect(result.map((r) => r.symbol)).toContain('UNDEFINED_EXPIRED');
  });

  test('does not call hasPositionsInAnyAccount for non-expired symbols when selectedAccount is "all"', () => {
    mockHasPositionsInAnyAccount.mockClear();

    const data = [
      createMockData(false, 0, 'NOT_EXPIRED_1'),
      createMockData(false, 1000, 'NOT_EXPIRED_2'),
      createMockData(true, 0, 'EXPIRED'),
    ];

    mockHasPositionsInAnyAccount.mockReturnValue(false);

    const result = applyExpiredWithPositionsFilter(
      data,
      null,
      'all',
      mockHasPositionsInAnyAccount
    );

    expect(result).toHaveLength(2); // Two non-expired symbols
    expect(result.map((r) => r.symbol)).toContain('NOT_EXPIRED_1');
    expect(result.map((r) => r.symbol)).toContain('NOT_EXPIRED_2');
    expect(result.map((r) => r.symbol)).not.toContain('EXPIRED');

    // Should only be called once for the expired symbol
    expect(mockHasPositionsInAnyAccount).toHaveBeenCalledTimes(1);
    expect(mockHasPositionsInAnyAccount).toHaveBeenCalledWith('EXPIRED');
  });

  test('handles mixed expired and non-expired data correctly', () => {
    const data = [
      createMockData(true, 1000, 'EXPIRED_WITH_POS'),
      createMockData(true, 0, 'EXPIRED_NO_POS'),
      createMockData(false, 0, 'NOT_EXPIRED_NO_POS'),
      createMockData(false, 1000, 'NOT_EXPIRED_WITH_POS'),
    ];

    const result = applyExpiredWithPositionsFilter(
      data,
      null,
      'account-1',
      mockHasPositionsInAnyAccount
    );

    expect(result).toHaveLength(3);
    expect(result.map((r) => r.symbol)).toContain('EXPIRED_WITH_POS');
    expect(result.map((r) => r.symbol)).not.toContain('EXPIRED_NO_POS');
    expect(result.map((r) => r.symbol)).toContain('NOT_EXPIRED_NO_POS');
    expect(result.map((r) => r.symbol)).toContain('NOT_EXPIRED_WITH_POS');
  });
});
