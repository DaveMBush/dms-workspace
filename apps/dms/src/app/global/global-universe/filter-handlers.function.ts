import { WritableSignal } from '@angular/core';

import { GlobalUniverseStorageService } from './global-universe-storage.service';

/**
 * Creates filter change handlers for the Global Universe component
 */
export function createFilterHandlers(
  storageService: GlobalUniverseStorageService,
  signals: {
    minYieldFilter: WritableSignal<number | null>;
    riskGroupFilter: WritableSignal<string | null>;
    expiredFilter: WritableSignal<boolean | null>;
    symbolFilter: WritableSignal<string>;
    selectedAccountId: WritableSignal<string>;
  }
): {
  onMinYieldFilterChange(): void;
  onRiskGroupFilterChange(): void;
  onRiskGroupFilterChangeFromPrimeNG(value: string | null): void;
  onExpiredFilterChange(): void;
  onExpiredFilterChangeFromPrimeNG(value: boolean | null): void;
  onSymbolFilterChange(): void;
  onSelectedAccountIdChange(): void;
} {
  return {
    /**
     * Handles min yield filter changes and saves to localStorage
     */
    onMinYieldFilterChange: function onMinYieldFilterChange(): void {
      storageService.saveMinYieldFilter(signals.minYieldFilter());
    },

    /**
     * Handles risk group filter changes and saves to localStorage
     */
    onRiskGroupFilterChange: function onRiskGroupFilterChange(): void {
      storageService.saveRiskGroupFilter(signals.riskGroupFilter());
    },

    /**
     * Handles risk group filter changes from PrimeNG filter
     */
    onRiskGroupFilterChangeFromPrimeNG:
      function onRiskGroupFilterChangeFromPrimeNG(value: string | null): void {
        signals.riskGroupFilter.set(value);
        storageService.saveRiskGroupFilter(value);
      },

    /**
     * Handles expired filter changes and saves to localStorage
     */
    onExpiredFilterChange: function onExpiredFilterChange(): void {
      storageService.saveExpiredFilter(signals.expiredFilter());
    },

    /**
     * Handles expired filter changes from PrimeNG filter
     */
    onExpiredFilterChangeFromPrimeNG: function onExpiredFilterChangeFromPrimeNG(
      value: boolean | null
    ): void {
      signals.expiredFilter.set(value);
      storageService.saveExpiredFilter(value);
    },

    /**
     * Handles symbol filter changes and saves to localStorage
     */
    onSymbolFilterChange: function onSymbolFilterChange(): void {
      storageService.saveSymbolFilter(signals.symbolFilter());
      // The filtering is handled by the computed signal universe$
    },

    /**
     * Handles selected account ID changes and saves to localStorage
     */
    onSelectedAccountIdChange: function onSelectedAccountIdChange(): void {
      storageService.saveSelectedAccountId(signals.selectedAccountId());
    },
  };
}
