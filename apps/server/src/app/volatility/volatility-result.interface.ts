import { VolatilityCategory } from './volatility-category.type';

export interface VolatilityResult {
  symbol: string;
  volatility1yr: VolatilityCategory;
  volatility5yr: VolatilityCategory;
}
