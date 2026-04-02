import { signal, WritableSignal } from '@angular/core';

import { SortFilterStateService } from '../services/sort-filter-state.service';

/**
 * Initializes a searchText signal from persisted filter state.
 */
export function initSearchText(
  sortFilterStateService: SortFilterStateService,
  tableKey: string
): WritableSignal<string> {
  const restoredFilter = sortFilterStateService.loadFilterState(tableKey);
  return signal<string>((restoredFilter?.['symbol'] as string) ?? '');
}
