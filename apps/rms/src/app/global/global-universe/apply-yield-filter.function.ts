import type { UniverseDisplayData } from './universe-display-data.interface';

/**
 * Applies yield filter
 */
export function applyYieldFilter(
  data: UniverseDisplayData[],
  minYield: number | null
): UniverseDisplayData[] {
  if (minYield !== null && minYield > 0) {
    return data.filter(function filterYield(item: UniverseDisplayData) {
      return Boolean(item.yield_percent) && item.yield_percent >= minYield;
    });
  }
  return data;
}
