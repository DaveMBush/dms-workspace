import type { UniverseDisplayData } from './universe-display-data.interface';

/**
 * Applies symbol filter
 */
export function applySymbolFilter(
  data: UniverseDisplayData[],
  symbolFilter: string
): UniverseDisplayData[] {
  if (symbolFilter && symbolFilter.trim() !== '') {
    return data.filter(function filterSymbol(item: UniverseDisplayData) {
      return item.symbol.toLowerCase().includes(symbolFilter.toLowerCase());
    });
  }
  return data;
}
