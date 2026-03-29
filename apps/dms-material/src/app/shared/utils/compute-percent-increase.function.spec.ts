import { describe, expect, it } from 'vitest';

import { computePercentIncrease } from './compute-percent-increase.function';

describe('computePercentIncrease', function () {
  it('should return 0 when basis is 0', function () {
    expect(computePercentIncrease(0, 100, 50)).toBe(0);
  });

  it('should compute annualized percent increase', function () {
    expect(computePercentIncrease(1000, 50, 25)).toBe((12 * (50 + 25)) / 1000);
  });

  it('should handle negative gains', function () {
    expect(computePercentIncrease(1000, -50, 25)).toBe(
      (12 * (-50 + 25)) / 1000
    );
  });
});
