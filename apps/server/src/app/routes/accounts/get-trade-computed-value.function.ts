interface TradeWithComputed {
  id: string;
  buy: number;
  quantity: number;
  universe: { last_price: number };
}

function computeUnrealizedGain(trade: TradeWithComputed): number {
  return (trade.universe.last_price - trade.buy) * trade.quantity;
}

function computeUnrealizedGainPercent(trade: TradeWithComputed): number {
  if (trade.buy <= 0) {
    return 0;
  }
  return ((trade.universe.last_price - trade.buy) / trade.buy) * 100;
}

export function getTradeComputedValue(
  field: string,
  trade: TradeWithComputed
): number {
  if (field === 'unrealizedGain') {
    return computeUnrealizedGain(trade);
  }
  return computeUnrealizedGainPercent(trade);
}
