export interface VolatilityResult {
  symbol: string;
  volatility1yr:
    | 'decreasing'
    | 'down-then-up'
    | 'flat'
    | 'increasing'
    | 'insufficient-history'
    | 'steady'
    | 'up-then-down'
    | 'volatile'
    | null;
  volatility5yr:
    | 'decreasing'
    | 'down-then-up'
    | 'flat'
    | 'increasing'
    | 'insufficient-history'
    | 'steady'
    | 'up-then-down'
    | 'volatile'
    | null;
}
