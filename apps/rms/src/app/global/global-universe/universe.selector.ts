import { computed } from "@angular/core";

import { RiskGroup } from "../../store/risk-group/risk-group.interface";
import { selectRiskGroup } from "../../store/risk-group/risk-group.selectors";
import { selectUniverses } from "../../store/universe/universe.selectors";


export const selectUniverse = computed(function selectUniverseFunction() {
  const universeEntities = selectUniverses();
  const riskGroupArray = selectRiskGroup();
  const riskGroupEntities: Record<string, RiskGroup> = {};
  for (let i = 0; i < riskGroupArray.length; i++) {
    riskGroupEntities[riskGroupArray[i].id] = riskGroupArray[i];
  }
  const result = [];
  for (let i = 0; i < universeEntities.length; i++) {
    const universe = universeEntities[i];
    let riskGroup = null;
    if (universe.risk_group_id) {
      riskGroup = riskGroupEntities[universe.risk_group_id];
    }
    result.push ({
      symbol: universe.symbol,
      riskGroup: riskGroup?.name ?? '',
      distribution: universe.distribution,
      distributions_per_year: universe.distributions_per_year,
      last_price: universe.last_price,
      most_recent_sell_date: universe.most_recent_sell_date,
      most_recent_sell_price: universe.most_recent_sell_price,
      ex_date: universe.ex_date ? new Date(universe.ex_date) : '',
      risk: universe.risk,
      yield_percent: 100 * universe.distributions_per_year * (universe.distribution / universe.last_price),
      expired: universe.expired,
      position: universe.position,
    });
  }
  return result;
});
