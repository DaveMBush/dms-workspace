import { describe, expect, it } from 'vitest';

import { buildEnrichedPoints } from './build-enriched-points.function';

describe('buildEnrichedPoints', function () {
  it('should return empty array for empty input', function () {
    expect(buildEnrichedPoints([])).toEqual([]);
  });

  it('should compute per-point capital gains and dividends lines', function () {
    const result = buildEnrichedPoints([
      { month: 'Jan', deposits: 1000, capitalGains: 50, dividends: 10 },
      { month: 'Feb', deposits: 1000, capitalGains: 30, dividends: 20 },
    ]);

    expect(result).toEqual([
      {
        month: 'Jan',
        base: 1000,
        capitalGainsLine: 1050,
        dividendsLine: 1060,
      },
      {
        month: 'Feb',
        base: 1000,
        capitalGainsLine: 1030,
        dividendsLine: 1050,
      },
    ]);
  });

  it('should handle single data point', function () {
    const result = buildEnrichedPoints([
      { month: 'Jan', deposits: 500, capitalGains: 25, dividends: 5 },
    ]);

    expect(result).toEqual([
      {
        month: 'Jan',
        base: 500,
        capitalGainsLine: 525,
        dividendsLine: 530,
      },
    ]);
  });
});
