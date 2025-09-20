import { computed } from '@angular/core';

import type { RiskGroup } from '../../store/risk-group/risk-group.interface';
import { selectRiskGroup } from '../../store/risk-group/selectors/select-risk-group.function';
import { selectUniverses } from '../../store/universe/selectors/select-universes.function';

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

    // Average purchase yield is now calculated in the data service
    // based on the selected account filter
    const avgPurchaseYieldPercent = 0;

    result.push({
      symbol: universe.symbol,
      riskGroup: riskGroup?.name ?? '',
      distribution: universe.distribution,
      distributions_per_year: universe.distributions_per_year,
      last_price: universe.last_price,
      most_recent_sell_date: universe.most_recent_sell_date,
      most_recent_sell_price: universe.most_recent_sell_price,
      ex_date: universe.ex_date ? new Date(universe.ex_date) : '',
      yield_percent:
        100 *
        universe.distributions_per_year *
        (universe.distribution / universe.last_price),
      avg_purchase_yield_percent: avgPurchaseYieldPercent,
      expired: universe.expired,
      is_closed_end_fund: universe.is_closed_end_fund,
      position: universe.position,
    });
  }
  return result;
});
