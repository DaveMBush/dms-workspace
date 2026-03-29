import { GraphPoint } from '../../global/services/graph-point.interface';
import { EnrichedPoint } from './enriched-point.interface';

export function buildEnrichedPoints(graphData: GraphPoint[]): EnrichedPoint[] {
  let cumulCapGains = 0;
  let cumulDividends = 0;
  return graphData.map(function buildPoint(p: GraphPoint): EnrichedPoint {
    cumulCapGains += p.capitalGains;
    cumulDividends += p.dividends;
    return {
      month: p.month,
      base: p.deposits,
      capitalGainsLine: p.deposits + cumulCapGains,
      dividendsLine: p.deposits + cumulCapGains + cumulDividends,
    };
  });
}
