import { computed } from "@angular/core";
import { selectRiskGroupEntity } from "../../store/risk-group/risk-group.selectors";
import { selectUniverses } from "../../store/universe/universe.selectors";

export const selectUniverse = computed(() => {
  const universeEntities = selectUniverses();
  const riskGroupEntities = selectRiskGroupEntity();
  const result = [];
  for (let i = 0; i < universeEntities.length; i++) {
    let universe = universeEntities[i];
    console.log('universe', universe);
    let riskGroup = riskGroupEntities.entities[universe.risk_group_id];
    result.push ({
      symbol: universe.symbol,
      riskGroup: riskGroup?.name ?? '',
      distribution: universe.distribution,
      distributions_per_year: universe.distributions_per_year,
      last_price: universe.last_price,
      most_recent_sell_date: universe.most_recent_sell_date,
      ex_date: new Date(universe.ex_date).toLocaleDateString(),
      risk: universe.risk,
    });
  }
  return result;
});
