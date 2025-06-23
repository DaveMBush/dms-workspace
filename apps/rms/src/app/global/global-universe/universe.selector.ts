import { computed } from "@angular/core";
import { selectRiskGroupEntity } from "../../store/risk-group/risk-group.selectors";
import { selectUniverses } from "../../store/universe/universe.selectors";

export const selectUniverse = computed(() => {
  const universeEntities = selectUniverses();
  const riskGroupEntities = selectRiskGroupEntity();
  const result = [];
  for (let i = 0; i < universeEntities.length; i++) {
    let universe = universeEntities[i];
    let riskGroup = riskGroupEntities.entities[universe.risk_group_id];
    result.push ({
      ...universe,
      riskGroup: riskGroup?.name ?? '',
    });
  }
  return result;
});
