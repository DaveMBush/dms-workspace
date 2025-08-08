interface AccountWithTradesAndDeposits {
  divDeposits: Array<{
    universeId: string | null;
    amount: number;
  }>;
  trades: Array<{
    sell: number;
    buy: number;
    quantity: number;
  }>;
}

interface AccountWithData {
  divDeposits: Array<{
    universeId: string | null;
    amount: number;
  }>;
  trades: Array<{
    sell: number;
    buy: number;
    quantity: number;
  }>;
}

interface AggregatedData {
  deposits: number;
  dividends: number;
  capitalGains: number;
}

function calculateDeposits(divDeposits: Array<{ universeId: string | null; amount: number }>): number {
  return divDeposits.filter(function filterDeposits(dd) {
    return dd.universeId === null;
  }).reduce(function sumDeposits(acc, deposit) {
    return acc + deposit.amount;
  }, 0);
}

function calculateDividends(divDeposits: Array<{ universeId: string | null; amount: number }>): number {
  return divDeposits.filter(function filterDividends(dd) {
    return dd.universeId !== null;
  }).reduce(function sumDividends(acc, deposit) {
    return acc + deposit.amount;
  }, 0);
}

function calculateCapitalGains(trades: Array<{ sell: number; buy: number; quantity: number }>): number {
  return trades.reduce(function sumCapitalGains(acc, trade) {
    return acc + (trade.sell - trade.buy) * trade.quantity;
  }, 0);
}

/**
 * Aggregates data across multiple accounts
 */
export function aggregateAccountData(accounts: AccountWithData[] | AccountWithTradesAndDeposits[]): AggregatedData {
  const deposits = accounts.reduce(function aggregateDeposits(acc, account) {
    return acc + calculateDeposits(account.divDeposits);
  }, 0);

  const dividends = accounts.reduce(function aggregateDividends(acc, account) {
    return acc + calculateDividends(account.divDeposits);
  }, 0);

  const capitalGains = accounts.reduce(function aggregateCapitalGains(acc, account) {
    return acc + calculateCapitalGains(account.trades);
  }, 0);

  return { deposits, dividends, capitalGains };
}
