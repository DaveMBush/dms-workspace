import { describe, expect, it } from 'vitest';

import { buildPerformanceChartData } from './build-performance-chart-data.function';

describe('buildPerformanceChartData', function () {
  it('should build line chart data from graph points', function () {
    const result = buildPerformanceChartData([
      { month: 'Jan', deposits: 1000, capitalGains: 50, dividends: 10 },
      { month: 'Feb', deposits: 1000, capitalGains: 30, dividends: 20 },
    ]);

    expect(result.labels).toEqual(['Jan', 'Feb']);
    expect(result.datasets).toHaveLength(3);
    expect(result.datasets[0].label).toBe('Base');
    expect(result.datasets[0].data).toEqual([1000, 1000]);
    expect(result.datasets[1].label).toBe('Capital Gains');
    expect(result.datasets[1].data).toEqual([1050, 1080]);
    expect(result.datasets[2].label).toBe('Dividends');
    expect(result.datasets[2].data).toEqual([1060, 1110]);
  });

  it('should return empty labels and data for empty input', function () {
    const result = buildPerformanceChartData([]);

    expect(result.labels).toEqual([]);
    expect(result.datasets[0].data).toEqual([]);
  });
});
