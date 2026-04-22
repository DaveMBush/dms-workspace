export interface VolatilityResult {
  symbol: string;
  volatility1yr: 'decreasing' | 'increasing' | 'steady' | 'volatile' | null;
  volatility5yr: 'decreasing' | 'increasing' | 'steady' | 'volatile' | null;
}
