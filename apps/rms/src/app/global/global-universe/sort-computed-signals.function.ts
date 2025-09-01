import { computed, Signal } from '@angular/core';

import { getSortIcon } from './get-sort-icon.function';
import { SortSignals } from './sort-signals.interface';

function createSortIconSignals(
  sortCriteria: Signal<Array<{ field: string; order: number }>>
): Pick<SortSignals, 'avgPurchaseYieldSortIcon$' | 'exDateSortIcon$' | 'mostRecentSellDateSortIcon$' | 'mostRecentSellPriceSortIcon$' | 'yieldPercentSortIcon$'> {
  return {
    yieldPercentSortIcon$: computed(function yieldPercentSortIconComputed() {
      return getSortIcon('yield_percent', sortCriteria);
    }),

    avgPurchaseYieldSortIcon$: computed(
      function avgPurchaseYieldSortIconComputed() {
        return getSortIcon('avg_purchase_yield_percent', sortCriteria);
      }
    ),

    exDateSortIcon$: computed(function exDateSortIconComputed() {
      return getSortIcon('ex_date', sortCriteria);
    }),

    mostRecentSellDateSortIcon$: computed(
      function mostRecentSellDateSortIconComputed() {
        return getSortIcon('most_recent_sell_date', sortCriteria);
      }
    ),

    mostRecentSellPriceSortIcon$: computed(
      function mostRecentSellPriceSortIconComputed() {
        return getSortIcon('most_recent_sell_price', sortCriteria);
      }
    ),
  };
}

function createSortOrderSignals(
  getSortOrder: (field: string) => number | null
): Pick<SortSignals, 'avgPurchaseYieldSortOrder$' | 'exDateSortOrder$' | 'mostRecentSellDateSortOrder$' | 'mostRecentSellPriceSortOrder$' | 'yieldPercentSortOrder$'> {
  return {
    yieldPercentSortOrder$: computed(function yieldPercentSortOrderComputed() {
      return getSortOrder('yield_percent');
    }),

    avgPurchaseYieldSortOrder$: computed(
      function avgPurchaseYieldSortOrderComputed() {
        return getSortOrder('avg_purchase_yield_percent');
      }
    ),

    exDateSortOrder$: computed(function exDateSortOrderComputed() {
      return getSortOrder('ex_date');
    }),

    mostRecentSellDateSortOrder$: computed(
      function mostRecentSellDateSortOrderComputed() {
        return getSortOrder('most_recent_sell_date');
      }
    ),

    mostRecentSellPriceSortOrder$: computed(
      function mostRecentSellPriceSortOrderComputed() {
        return getSortOrder('most_recent_sell_price');
      }
    ),
  };
}

/**
 * Creates computed signals for sort icons and orders
 */
export function createSortComputedSignals(
  sortCriteria: Signal<Array<{ field: string; order: number }>>,
  getSortOrder: (field: string) => number | null
): SortSignals {
  const iconSignals = createSortIconSignals(sortCriteria);
  const orderSignals = createSortOrderSignals(getSortOrder);
  
  return {
    ...iconSignals,
    ...orderSignals,
  };
}
