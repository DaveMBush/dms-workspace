import { handleSocketNotification } from '@smarttools/smart-signals';

import { FilterConfig } from '../../shared/services/filter-config.interface';
import { SortFilterStateService } from '../../shared/services/sort-filter-state.service';
import { selectUniverses } from '../../store/universe/selectors/select-universes.function';
import { UniverseFilterValues } from './universe-filter-values.interface';

function collectUniverseIds(): string[] {
  const universes = selectUniverses();
  if (universes === null || universes === undefined || universes.length === 0) {
    return [];
  }
  const ids: string[] = [];
  for (let i = 0; i < universes.length; i++) {
    ids.push(universes[i].id);
  }
  return ids;
}

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
  // Force universe entities to re-fetch so computed fields
  // (position, avg_purchase_yield_percent, most_recent_sell_date/price)
  // are recalculated with the current account filter.
  const ids = collectUniverseIds();
  if (ids.length > 0) {
    handleSocketNotification('universes', 'update', ids);
  }
}
