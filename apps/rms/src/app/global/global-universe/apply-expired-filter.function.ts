import type { UniverseDisplayData } from './universe-display-data.interface';

/**
 * Applies expired filter
 */
export function applyExpiredFilter(
  data: UniverseDisplayData[],
  expiredFilter: boolean | null
): UniverseDisplayData[] {
  if (expiredFilter !== null) {
    return data.filter(function filterExpired(item: UniverseDisplayData) {
      return item.expired === expiredFilter;
    });
  }
  return data;
}
