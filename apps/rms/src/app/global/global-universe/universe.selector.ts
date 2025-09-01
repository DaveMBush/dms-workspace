import { computed } from '@angular/core';

import type { RiskGroup } from '../../store/risk-group/risk-group.interface';
import { selectRiskGroup } from '../../store/risk-group/selectors/select-risk-group.function';
import { selectAccountChildren } from '../../store/trades/selectors/select-account-children.function';
import type { Trade } from '../../store/trades/trade.interface';
import { selectUniverses } from '../../store/universe/selectors/select-universes.function';

function calculateAveragePurchaseData(universeId: string): {
  avgPurchasePrice: number;
  totalQuantity: number;
} {
  const accountsState = selectAccountChildren();
  const accounts = Object.values(accountsState.entities);

  let totalCost = 0;
  let totalQuantity = 0;

  for (const account of accounts) {
    if (!account?.trades) {
      continue;
    }

    // Handle Proxy arrays - convert to regular array if needed
    const trades = Array.from(account.trades as Trade[]);
    const openTrades = trades.filter(function filterOpenTrades(trade) {
      return trade.universeId === universeId && trade.sell_date === undefined;
    });

    for (const trade of openTrades) {
      totalCost += trade.buy * trade.quantity;
      totalQuantity += trade.quantity;
    }
  }

  const avgPurchasePrice = totalQuantity > 0 ? totalCost / totalQuantity : 0;

  return {
    avgPurchasePrice,
    totalQuantity,
  };
}

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

    const { avgPurchasePrice } = calculateAveragePurchaseData(universe.id);
    const avgPurchaseYieldPercent =
      avgPurchasePrice > 0 && universe.distribution > 0
        ? 100 *
          universe.distributions_per_year *
          (universe.distribution / avgPurchasePrice)
        : 0;

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
      position: universe.position,
    });
  }
  return result;
});
