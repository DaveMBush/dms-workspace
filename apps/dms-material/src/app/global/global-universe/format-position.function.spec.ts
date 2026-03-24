// Story 15.2: re-enabled from TDD Story 15.1
import { describe, expect, it } from 'vitest';

import { formatPosition } from './format-position.function';

describe('formatPosition', () => {
  it('should format zero as "0.00"', () => {
    expect(formatPosition(0)).toBe('0.00');
  });

  it('should format small numbers with 2 decimal places: 100 → "100.00"', () => {
    expect(formatPosition(100)).toBe('100.00');
  });

  it('should format thousands with comma separator: 1000 → "1,000.00"', () => {
    expect(formatPosition(1000)).toBe('1,000.00');
  });

  it('should format decimals correctly: 1234.56 → "1,234.56"', () => {
    expect(formatPosition(1234.56)).toBe('1,234.56');
  });

  it('should format large numbers: 100000 → "100,000.00"', () => {
    expect(formatPosition(100000)).toBe('100,000.00');
  });

  it('should format negative numbers: -1234.56 → "-1,234.56"', () => {
    expect(formatPosition(-1234.56)).toBe('-1,234.56');
  });

  it('should round to 2 decimal places: 1234.567 → "1,234.57"', () => {
    expect(formatPosition(1234.567)).toBe('1,234.57');
  });

  it('should format very small decimals: 0.01 → "0.01"', () => {
    expect(formatPosition(0.01)).toBe('0.01');
  });
});
