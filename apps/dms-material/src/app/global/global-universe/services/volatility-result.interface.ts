export interface VolatilityResult {
  symbol: string;
  volatility1yr:
    | 'decreasing'
    | 'increasing'
    | 'insufficient-history'
    | 'steady'
    | 'volatile'
    | null;
  volatility5yr:
    | 'decreasing'
    | 'increasing'
    | 'insufficient-history'
    | 'steady'
    | 'volatile'
    | null;
}
