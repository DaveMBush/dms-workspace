import { handleSocketNotification } from '@smarttools/smart-signals';

import { FilterConfig } from '../../shared/services/filter-config.interface';
import { SortFilterStateService } from '../../shared/services/sort-filter-state.service';
import { UniverseFilterValues } from './universe-filter-values.interface';

export function saveUniverseFiltersAndNotify(
  sortFilterStateService: SortFilterStateService,
  values: UniverseFilterValues
): void {
  const filters: FilterConfig = {};
  if (values.symbol !== '') {
    filters['symbol'] = values.symbol;
  }
  if (values.riskGroup !== null) {
    filters['risk_group'] = values.riskGroup;
  }
  if (values.expired !== null) {
    filters['expired'] = values.expired;
  }
  if (values.minYield !== null) {
    filters['min_yield'] = values.minYield;
  }
  if (values.accountId !== 'all') {
    filters['account_id'] = values.accountId;
  }
  if (Object.keys(filters).length > 0) {
    sortFilterStateService.saveFilterState('universes', filters);
  } else {
    sortFilterStateService.clearFilterState('universes');
  }
  handleSocketNotification('top', 'update', ['1']);
}
