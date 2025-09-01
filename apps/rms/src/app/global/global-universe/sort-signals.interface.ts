import { Signal } from '@angular/core';

export interface SortSignals {
  yieldPercentSortIcon$: Signal<string>;
  avgPurchaseYieldSortIcon$: Signal<string>;
  exDateSortIcon$: Signal<string>;
  mostRecentSellDateSortIcon$: Signal<string>;
  mostRecentSellPriceSortIcon$: Signal<string>;
  yieldPercentSortOrder$: Signal<number | null>;
  avgPurchaseYieldSortOrder$: Signal<number | null>;
  exDateSortOrder$: Signal<number | null>;
  mostRecentSellDateSortOrder$: Signal<number | null>;
  mostRecentSellPriceSortOrder$: Signal<number | null>;
}
