import { describe, expect, it } from 'vitest';

import { buildAllocationChartData } from './build-allocation-chart-data.function';

describe('buildAllocationChartData', function () {
  it('should build pie chart data from summary', function () {
    const result = buildAllocationChartData({
      deposits: 10000,
      dividends: 500,
      capitalGains: 200,
      equities: 6000,
      income: 3000,
      tax_free_income: 1000,
    });

    expect(result.labels).toEqual(['Equities', 'Income', 'Tax Free']);
    expect(result.datasets[0].data).toEqual([6000, 3000, 1000]);
    expect(result.datasets[0].backgroundColor).toEqual([
      '#3B82F6',
      '#10B981',
      '#F59E0B',
    ]);
  });

  it('should handle zero values', function () {
    const result = buildAllocationChartData({
      deposits: 0,
      dividends: 0,
      capitalGains: 0,
      equities: 0,
      income: 0,
      tax_free_income: 0,
    });

    expect(result.datasets[0].data).toEqual([0, 0, 0]);
  });
});
