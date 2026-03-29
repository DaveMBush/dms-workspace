import { ChartData } from 'chart.js';

import { GraphPoint } from '../../global/services/graph-point.interface';
import { buildEnrichedPoints } from './build-enriched-points.function';
import { EnrichedPoint } from './enriched-point.interface';

export function buildPerformanceChartData(
  graphData: GraphPoint[]
): ChartData<'line'> {
  const enriched = buildEnrichedPoints(graphData);
  return {
    labels: enriched.map(function getMonth(p: EnrichedPoint): string {
      return p.month;
    }),
    datasets: [
      {
        label: 'Base',
        data: enriched.map(function getBase(p: EnrichedPoint): number {
          return p.base;
        }),
        borderColor: '#3B82F6',
        tension: 0.2,
      },
      {
        label: 'Capital Gains',
        data: enriched.map(function getCapGainsLine(p: EnrichedPoint): number {
          return p.capitalGainsLine;
        }),
        borderColor: '#10B981',
        tension: 0.2,
      },
      {
        label: 'Dividends',
        data: enriched.map(function getDividendsLine(p: EnrichedPoint): number {
          return p.dividendsLine;
        }),
        borderColor: '#F59E0B',
        tension: 0.2,
      },
    ],
  };
}
