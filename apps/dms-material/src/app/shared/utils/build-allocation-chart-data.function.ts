import { ChartData } from 'chart.js';

import { Summary } from '../../global/services/summary.interface';

export function buildAllocationChartData(summary: Summary): ChartData<'pie'> {
  return {
    labels: ['Equities', 'Income', 'Tax Free'],
    datasets: [
      {
        data: [summary.equities, summary.income, summary.tax_free_income],
        backgroundColor: ['#3B82F6', '#10B981', '#F59E0B'],
      },
    ],
  };
}
