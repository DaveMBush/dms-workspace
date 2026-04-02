import { WritableSignal } from '@angular/core';
import { handleSocketNotification } from '@smarttools/smart-signals';

import { getAccountIds } from '../../store/accounts/selectors/get-account-ids.function';
import { FilterConfig } from '../services/filter-config.interface';
import { SortFilterStateService } from '../services/sort-filter-state.service';

/**
 * Saves the current symbol filter to persisted state and notifies the server.
 */
export function saveSymbolFilter(
  searchText: WritableSignal<string>,
  sortFilterStateService: SortFilterStateService,
  tableKey: string
): void {
  const symbol = searchText();
  if (symbol !== '') {
    const filters: FilterConfig = { symbol };
    sortFilterStateService.saveFilterState(tableKey, filters);
  } else {
    sortFilterStateService.clearFilterState(tableKey);
  }
  handleSocketNotification('accounts', 'update', getAccountIds());
}
