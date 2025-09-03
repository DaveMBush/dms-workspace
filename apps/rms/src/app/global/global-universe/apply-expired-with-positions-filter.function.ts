import type { UniverseDisplayData } from './universe-display-data.interface';

/**
 * Applies expired-with-positions filter logic - SIMPLE APPROACH
 * After all other filters and position calculations are done:
 * - Show all non-expired symbols regardless of position
 * - Show expired symbols ONLY if they have position > 0
 * Only applies when expiredFilter is null (not explicitly set by advanced users)
 */
export function applyExpiredWithPositionsFilter(
  data: UniverseDisplayData[],
  expiredFilter: boolean | null
): UniverseDisplayData[] {
  // Only apply if no explicit expired filter is set
  if (expiredFilter !== null) {
    return data;
  }

  return data.filter(function filterExpiredWithPositions(
    item: UniverseDisplayData
  ) {
    // Show all non-expired symbols (maintain existing behavior)
    if (!item.expired) {
      return true;
    }

    // For expired symbols, simple check: show only if position > 0
    // Position field should already be set correctly by account-specific filtering
    return item.position > 0;
  });
}
