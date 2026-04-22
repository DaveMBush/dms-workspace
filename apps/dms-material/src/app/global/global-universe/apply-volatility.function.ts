import type { VolatilityResult } from './services/volatility-result.interface';
import type { Universe } from '../../store/universe/universe.interface';

export function applyVolatility(
  rows: Universe[],
  volMap: Map<string, VolatilityResult>
): void {
  for (const row of rows) {
    const vol = volMap.get(row.symbol);
    if (vol !== undefined) {
      row.volatility1yr = vol.volatility1yr;
      row.volatility5yr = vol.volatility5yr;
    }
  }
}
