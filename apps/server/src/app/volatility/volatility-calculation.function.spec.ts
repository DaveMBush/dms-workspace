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

  it('returns flat for 12 months of identical amounts', () => {
    const amounts = Array.from({ length: 12 }, function constant() {
      return 1.0;
    });
    const result: VolatilityCategory = calculateVolatility(amounts);
    expect(result).toBe('flat');
  });

  it('returns steady for 12 months with very low variance', () => {
    const amounts = [
      1.0, 1.06, 0.94, 1.05, 0.95, 1.04, 0.96, 1.05, 0.95, 1.04, 0.96, 1.0,
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

  it('returns up-then-down for a symmetric peak pattern', () => {
    const amounts = [1, 2, 3, 4, 5, 6, 6, 5, 4, 3, 2, 1];
    const result: VolatilityCategory = calculateVolatility(amounts);
    expect(result).toBe('up-then-down');
  });

  it('returns down-then-up for a symmetric recovery pattern', () => {
    const amounts = [6, 5, 4, 3, 2, 1, 1, 2, 3, 4, 5, 6];
    const result: VolatilityCategory = calculateVolatility(amounts);
    expect(result).toBe('down-then-up');
  });

  it('returns volatile for 12 months of high-variance amounts with no trend', () => {
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
    const amounts = Array.from({ length: 60 }, function buildValue(_, index) {
      return index % 2 === 0 ? 2.1 : 1.9;
    });
    const result: VolatilityCategory = calculateVolatility(amounts);
    expect(result).toBe('steady');
  });
});
