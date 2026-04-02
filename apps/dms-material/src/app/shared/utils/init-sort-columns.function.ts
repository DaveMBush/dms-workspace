import { signal, WritableSignal } from '@angular/core';

import { SortColumn } from '../services/sort-column.interface';
import { SortFilterStateService } from '../services/sort-filter-state.service';

/**
 * Initializes a sortColumns signal from persisted sort state.
 */
export function initSortColumns(
  sortFilterStateService: SortFilterStateService,
  tableKey: string
): WritableSignal<SortColumn[]> {
  const restoredSort = sortFilterStateService.loadSortState(tableKey);
  return signal<SortColumn[]>(
    restoredSort !== null
      ? [{ column: restoredSort.field, direction: restoredSort.order }]
      : []
  );
}
