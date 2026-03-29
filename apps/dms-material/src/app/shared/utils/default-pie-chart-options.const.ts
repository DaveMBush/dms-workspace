import { ChartConfiguration } from 'chart.js';

function formatTooltipLabel(context: {
  label?: string;
  raw?: unknown;
  dataIndex: number;
  dataset: { data: unknown[] };
}): string {
  const label = context.label ?? '';
  const value = (context.raw as number) ?? 0;
  const total = (context.dataset.data as number[]).reduce(function sum(
    a: number,
    b: number
  ): number {
    return a + b;
  },
  0);
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  const formatted = value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `${label}: ${formatted} (${String(percentage)}%)`;
}

export const defaultPieChartOptions: ChartConfiguration['options'] = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      display: true,
      position: 'bottom' as const,
    },
    tooltip: {
      callbacks: {
        label: formatTooltipLabel,
      },
    },
  },
};
