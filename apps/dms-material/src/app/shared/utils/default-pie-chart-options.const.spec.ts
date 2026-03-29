import { describe, expect, it } from 'vitest';

import { defaultPieChartOptions } from './default-pie-chart-options.const';

describe('defaultPieChartOptions', function () {
  it('should be responsive', function () {
    expect(defaultPieChartOptions!.responsive).toBe(true);
  });

  it('should maintain aspect ratio', function () {
    expect(defaultPieChartOptions!.maintainAspectRatio).toBe(true);
  });

  it('should position legend at bottom', function () {
    const legend = defaultPieChartOptions!.plugins!.legend!;
    expect(legend.position).toBe('bottom');
    expect(legend.display).toBe(true);
  });

  it('should format tooltip labels with currency and percentage', function () {
    const tooltip = defaultPieChartOptions!.plugins!.tooltip!;
    const labelFn = tooltip.callbacks!.label! as (context: {
      label?: string;
      raw?: unknown;
      dataIndex: number;
      dataset: { data: unknown[] };
    }) => string;

    const result = labelFn({
      label: 'Equities',
      raw: 6000,
      dataIndex: 0,
      dataset: { data: [6000, 3000, 1000] },
    });

    expect(result).toBe('Equities: $6,000 (60%)');
  });

  it('should handle zero total in tooltip', function () {
    const tooltip = defaultPieChartOptions!.plugins!.tooltip!;
    const labelFn = tooltip.callbacks!.label! as (context: {
      label?: string;
      raw?: unknown;
      dataIndex: number;
      dataset: { data: unknown[] };
    }) => string;

    const result = labelFn({
      label: 'Equities',
      raw: 0,
      dataIndex: 0,
      dataset: { data: [0, 0, 0] },
    });

    expect(result).toBe('Equities: $0 (0%)');
  });
});
