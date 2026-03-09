interface TradeRow {
  buy: number;
  quantity: number;
  sell: number;
  sell_date: Date | null;
}

function getOpenTrades(trades: TradeRow[]): TradeRow[] {
  return trades.filter(function isOpen(t: TradeRow): boolean {
    return t.sell_date === null;
  });
}

function getMostRecentSell(
  trades: TradeRow[]
): { sell: number; sell_date: Date } | null {
  let mostRecent: { sell: number; sell_date: Date } | null = null;
  for (let i = 0; i < trades.length; i++) {
    const t = trades[i];
    if (
      t.sell_date !== null &&
      (mostRecent === null ||
        t.sell_date.getTime() > mostRecent.sell_date.getTime())
    ) {
      mostRecent = { sell_date: t.sell_date, sell: t.sell };
    }
  }
  return mostRecent;
}

function calculateAvgPurchaseYieldPercent(
  openTrades: TradeRow[],
  distribution: number,
  distributionsPerYear: number
): number {
  const totalQuantity = openTrades.reduce(function sumQty(
    acc: number,
    t: TradeRow
  ): number {
    return acc + t.quantity;
  },
  0);
  if (totalQuantity === 0) {
    return 0;
  }
  const totalCost = openTrades.reduce(function sumCost(
    acc: number,
    t: TradeRow
  ): number {
    return acc + t.buy * t.quantity;
  },
  0);
  const avgBuy = totalCost / totalQuantity;
  if (!Number.isFinite(avgBuy) || avgBuy <= 0) {
    return 0;
  }
  return (distribution * distributionsPerYear * 100) / avgBuy;
}

function calculatePosition(openTrades: TradeRow[]): number {
  return openTrades.reduce(function sumPosition(
    acc: number,
    trade: TradeRow
  ): number {
    return acc + trade.buy * trade.quantity;
  },
  0);
}

export default {
  calculateAvgPurchaseYieldPercent,
  calculatePosition,
  getMostRecentSell,
  getOpenTrades,
};
