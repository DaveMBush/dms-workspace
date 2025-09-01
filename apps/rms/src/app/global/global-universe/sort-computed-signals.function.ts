import { computed, Signal } from '@angular/core';

import { getSortIcon } from './get-sort-icon.function';

/**
 * Creates computed signals for sort icons and orders
 */
export function createSortComputedSignals(
  sortCriteria: Signal<Array<{ field: string; order: number }>>,
  getSortOrder: (field: string) => number | null
): {
  yieldPercentSortIcon$: Signal<string>;
  exDateSortIcon$: Signal<string>;
  mostRecentSellDateSortIcon$: Signal<string>;
  mostRecentSellPriceSortIcon$: Signal<string>;
  yieldPercentSortOrder$: Signal<number | null>;
  exDateSortOrder$: Signal<number | null>;
  mostRecentSellDateSortOrder$: Signal<number | null>;
  mostRecentSellPriceSortOrder$: Signal<number | null>;
} {
  return {
    yieldPercentSortIcon$: computed(function yieldPercentSortIconComputed() {
      return getSortIcon('yield_percent', sortCriteria);
    }),

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

    yieldPercentSortOrder$: computed(function yieldPercentSortOrderComputed() {
      return getSortOrder('yield_percent');
    }),

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
