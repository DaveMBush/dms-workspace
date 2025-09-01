import type { UniverseDisplayData } from './universe-display-data.interface';

/**
 * Applies risk group filter
 */
export function applyRiskGroupFilter(
  data: UniverseDisplayData[],
  riskGroupFilter: string | null
): UniverseDisplayData[] {
  if (riskGroupFilter !== null && riskGroupFilter.trim() !== '') {
    return data.filter(function filterRiskGroup(item: UniverseDisplayData) {
      return item.riskGroup === riskGroupFilter;
    });
  }
  return data;
}
