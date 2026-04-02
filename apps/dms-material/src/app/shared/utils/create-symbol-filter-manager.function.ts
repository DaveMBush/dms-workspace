import { WritableSignal } from '@angular/core';

import { SortFilterStateService } from '../services/sort-filter-state.service';
import { saveSymbolFilter } from './save-symbol-filter.function';
import { SymbolFilterManager } from './symbol-filter-manager.interface';

/**
 * Creates a debounced symbol filter manager that handles input changes
 * with a 300ms debounce, persists filter state, and cleans up timers.
 */
export function createSymbolFilterManager(
  searchText: WritableSignal<string>,
  sortFilterStateService: SortFilterStateService,
  tableKey: string
): SymbolFilterManager {
  let symbolFilterTimer: ReturnType<typeof setTimeout> | null = null;

  function onSymbolFilterChange(value: string): void {
    searchText.set(value);
    if (symbolFilterTimer !== null) {
      clearTimeout(symbolFilterTimer);
    }
    symbolFilterTimer = setTimeout(function saveFilter() {
      saveSymbolFilter(searchText, sortFilterStateService, tableKey);
    }, 300);
  }

  function cleanup(): void {
    if (symbolFilterTimer !== null) {
      clearTimeout(symbolFilterTimer);
      symbolFilterTimer = null;
    }
  }

  return { onSymbolFilterChange, cleanup };
}
