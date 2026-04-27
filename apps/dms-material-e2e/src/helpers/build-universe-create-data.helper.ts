export function buildUniverseCreateData(
  symbol: string,
  riskGroupId: string,
  storedVolatility: string
): Record<string, unknown> {
  return {
    symbol,
    risk_group_id: riskGroupId,
    distribution: 1.0,
    distributions_per_year: 12,
    last_price: 10.0,
    ex_date: null,
    most_recent_sell_date: null,
    most_recent_sell_price: null,
    expired: false,
    is_closed_end_fund: true,
    volatility_long: storedVolatility,
    volatility_short: storedVolatility,
  };
}
