import type { UniverseDisplayData } from './universe-display-data.interface';

/**
 * Applies expired-with-positions filter logic
 * For expired symbols: show only if position > 0 for the selected account
 * For non-expired symbols: show regardless of position (maintain existing behavior)
 * When account = "all": show expired symbols if ANY account has open positions
 * Only applies when expiredFilter is null (not explicitly set by advanced users)
 */
export function applyExpiredWithPositionsFilter(
  data: UniverseDisplayData[],
  expiredFilter: boolean | null,
  selectedAccount: string,
  hasPositionsInAnyAccount: (symbol: string) => boolean
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

    // For expired symbols, check if they have positions
    if (selectedAccount === 'all') {
      // Check if ANY account has positions for this symbol
      return hasPositionsInAnyAccount(item.symbol);
    }

    // Check specific account position (position is already calculated for account)
    return item.position > 0;
  });
}
