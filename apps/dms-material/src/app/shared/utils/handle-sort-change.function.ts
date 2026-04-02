import { WritableSignal } from '@angular/core';
import { Sort } from '@angular/material/sort';
import { handleSocketNotification } from '@smarttools/smart-signals';

import { getAccountIds } from '../../store/accounts/selectors/get-account-ids.function';
import { SortColumn } from '../services/sort-column.interface';
import { SortFilterStateService } from '../services/sort-filter-state.service';

/**
 * Handles a sort change event: updates the sort signal, persists state,
 * and notifies the server.
 */
export function handleSortChange(
  sort: Sort,
  sortColumns$: WritableSignal<SortColumn[]>,
  sortFilterStateService: SortFilterStateService,
  tableKey: string
): void {
  if (sort.direction === '') {
    sortColumns$.set([]);
    sortFilterStateService.clearSortState(tableKey);
  } else {
    const direction = sort.direction;
    sortColumns$.set([{ column: sort.active, direction }]);
    sortFilterStateService.saveSortState(tableKey, {
      field: sort.active,
      order: direction,
    });
  }
  handleSocketNotification('accounts', 'update', getAccountIds());
}
