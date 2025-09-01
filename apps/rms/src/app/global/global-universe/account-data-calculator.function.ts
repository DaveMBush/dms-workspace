import { selectAccountChildren } from '../../store/trades/selectors/select-account-children.function';
import type { Trade } from '../../store/trades/trade.interface';

/**
 * Calculates total cost and quantity for open trades
 */
export function calculateTradeTotals(
  universeId: string,
  selectedAccount: string
): { totalCost: number; totalQuantity: number } {
  const accountsState = selectAccountChildren();
  const accounts = Object.values(accountsState.entities);

  let totalCost = 0;
  let totalQuantity = 0;

  for (const account of accounts) {
    if (!account?.trades) {
      continue;
    }

    if (selectedAccount !== 'all' && account.id !== selectedAccount) {
      continue;
    }

    const trades = Array.from(account.trades as Trade[]);
    const openTrades = trades.filter(function filterOpenTrades(trade) {
      return trade.universeId === universeId && trade.sell_date === undefined;
    });

    for (const trade of openTrades) {
      totalCost += trade.buy * trade.quantity;
      totalQuantity += trade.quantity;
    }
  }

  return { totalCost, totalQuantity };
}
