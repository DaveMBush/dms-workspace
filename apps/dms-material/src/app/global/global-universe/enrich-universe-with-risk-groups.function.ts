import { RiskGroup } from '../../store/risk-group/risk-group.interface';
import { Universe } from '../../store/universe/universe.interface';
import { EnrichedUniverse } from './enriched-universe.interface';

export function enrichUniverseWithRiskGroups(
  universes: Universe[],
  riskGroups: RiskGroup[]
): EnrichedUniverse[] {
  // Create a map of risk group ID to name for fast lookup
  const riskGroupMap = new Map<string, string>();
  if (
    riskGroups !== null &&
    riskGroups !== undefined &&
    riskGroups.length > 0
  ) {
    for (let i = 0; i < riskGroups.length; i++) {
      riskGroupMap.set(riskGroups[i].id, riskGroups[i].name);
    }
  }

  // Enrich universe data with risk group name
  // Must explicitly copy properties from Proxy to create plain objects
  return universes.map(function enrichWithRiskGroup(universe) {
    return {
      id: universe.id,
      symbol: universe.symbol,
      distribution: universe.distribution,
      distributions_per_year: universe.distributions_per_year,
      last_price: universe.last_price,
      most_recent_sell_date: universe.most_recent_sell_date,
      most_recent_sell_price: universe.most_recent_sell_price,
      ex_date: universe.ex_date,
      risk_group_id: universe.risk_group_id,
      risk_group:
        riskGroupMap.get(universe.risk_group_id) ?? universe.risk_group_id,
      expired: universe.expired,
      is_closed_end_fund: universe.is_closed_end_fund,
      name: universe.name,
      position: universe.position,
    };
  });
}
