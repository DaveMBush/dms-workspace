import { GraphPoint } from '../../global/services/graph-point.interface';
import { EnrichedPoint } from './enriched-point.interface';

export function buildEnrichedPoints(graphData: GraphPoint[]): EnrichedPoint[] {
  return graphData.map(function buildPoint(p: GraphPoint): EnrichedPoint {
    return {
      month: p.month,
      base: p.deposits,
      capitalGainsLine: p.deposits + p.capitalGains,
      dividendsLine: p.deposits + p.capitalGains + p.dividends
    };
  });
}
