import { computed } from "@angular/core";
import { selectRiskGroup } from "../../store/risk-group/risk-group.selectors";
import { selectUniverses } from "../../store/universe/universe.selectors";
import { RiskGroup } from "../../store/risk-group/risk-group.interface";

export const selectUniverse = computed(() => {
  const universeEntities = selectUniverses();
  const riskGroupArray = selectRiskGroup();
  const riskGroupEntities: Record<string, RiskGroup> = {};
  for (var i = 0; i < riskGroupArray.length; i++) {
    riskGroupEntities[riskGroupArray[i].id] = riskGroupArray[i];
  }
  const result = [];
  for (let i = 0; i < universeEntities.length; i++) {
    let universe = universeEntities[i];
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
      ex_date: universe.ex_date ? new Date(universe.ex_date) : '',
      risk: universe.risk,
    });
  }
  return result;
});
