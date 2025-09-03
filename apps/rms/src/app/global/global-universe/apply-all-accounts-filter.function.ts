import { calculateTradeTotals } from './account-data-calculator.function';
import { findUniverseIdBySymbol } from './find-universe-id-by-symbol.function';
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

    // Calculate total position across all accounts
    const universeId = findUniverseIdBySymbol(item.symbol);
    const { totalCost } = calculateTradeTotals(universeId ?? '', 'all');

    return {
      ...item,
      avg_purchase_yield_percent: avgPurchaseYieldPercent,
      position: totalCost, // Total cost across all accounts represents total position value
    };
  });
}
