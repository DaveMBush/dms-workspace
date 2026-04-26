import { describe, expect, it } from 'vitest';

import { calculateVolatility } from './volatility-calculation.function';
import { VolatilityCategory } from './volatility-category.type';

describe('calculateVolatility', () => {
  it('returns insufficient-history for an empty array', () => {
    const result: VolatilityCategory = calculateVolatility([]);
    expect(result).toBe('insufficient-history');
  });

  it('returns insufficient-history for fewer than 12 data points', () => {
    const result: VolatilityCategory = calculateVolatility([1, 2, 3, 4, 5, 6]);
    expect(result).toBe('insufficient-history');
  });

  it('returns insufficient-history for exactly 11 data points (boundary check)', () => {
    const amounts = Array.from({ length: 11 }, function constant() {
      return 1.0;
    });
    const result: VolatilityCategory = calculateVolatility(amounts);
    expect(result).toBe('insufficient-history');
  });

  it('returns steady for 12 months of identical amounts', () => {
    const amounts = Array.from({ length: 12 }, function constant() {
      return 1.0;
    });
    const result: VolatilityCategory = calculateVolatility(amounts);
    expect(result).toBe('steady');
  });

  it('returns steady for 12 months with very low variance', () => {
    // CV = stddev/mean; all very close to 1.0 → CV << 0.10
    const amounts = [
      1.0, 1.01, 0.99, 1.0, 1.01, 0.99, 1.0, 1.0, 1.01, 0.99, 1.0, 1.0,
    ];
    const result: VolatilityCategory = calculateVolatility(amounts);
    expect(result).toBe('steady');
  });

  it('returns increasing for 12 months of linearly increasing amounts', () => {
    // Strongly upward trend: 1, 2, 3, ..., 12
    const amounts = Array.from({ length: 12 }, function makeValue(_, i) {
      return i + 1;
    });
    const result: VolatilityCategory = calculateVolatility(amounts);
    expect(result).toBe('increasing');
  });

  it('returns decreasing for 12 months of linearly decreasing amounts', () => {
    // Strongly downward trend: 12, 11, 10, ..., 1
    const amounts = Array.from({ length: 12 }, function makeValue(_, i) {
      return 12 - i;
    });
    const result: VolatilityCategory = calculateVolatility(amounts);
    expect(result).toBe('decreasing');
  });

  it('returns volatile for 12 months of high-variance amounts with no trend', () => {
    // Mirror-symmetric pattern: slope = 0, CV = 4/5 = 0.8 >> 0.10 → volatile
    const amounts = [9, 1, 9, 1, 9, 1, 1, 9, 1, 9, 1, 9];
    const result: VolatilityCategory = calculateVolatility(amounts);
    expect(result).toBe('volatile');
  });

  it('returns insufficient-history when mean is zero', () => {
    const amounts = Array.from({ length: 12 }, function constant() {
      return 0;
    });
    const result: VolatilityCategory = calculateVolatility(amounts);
    expect(result).toBe('insufficient-history');
  });

  it('works correctly with more than 12 data points (60 months)', () => {
    // 60 months of identical values → steady
    const amounts = Array.from({ length: 60 }, function constant() {
      return 2.5;
    });
    const result: VolatilityCategory = calculateVolatility(amounts);
    expect(result).toBe('steady');
  });
});
