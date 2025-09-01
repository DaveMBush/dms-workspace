import type { UniverseDisplayData } from './universe-display-data.interface';

type CalculateAveragePurchaseYieldFn = (
  symbol: string,
  accountId: string
) => number;

/**
 * Applies filtering for all accounts
 */
export function applyAllAccountsFilter(
  data: UniverseDisplayData[],
  calculateAveragePurchaseYield: CalculateAveragePurchaseYieldFn
): UniverseDisplayData[] {
  return data.map(function mapAllAccountsData(item: UniverseDisplayData) {
    const avgPurchaseYieldPercent = calculateAveragePurchaseYield(
      item.symbol,
      'all'
    );
    return {
      ...item,
      avg_purchase_yield_percent: avgPurchaseYieldPercent,
    };
  });
}
