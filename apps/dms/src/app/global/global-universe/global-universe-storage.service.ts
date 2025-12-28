import { Injectable } from '@angular/core';

import { getLocalStorageItem } from './get-local-storage-item.function';
import { setLocalStorageItem } from './set-local-storage-item.function';

const STORAGE_KEY = 'global-universe-sort-criteria';
const FILTERS_STORAGE_KEY = 'global-universe-filters';

@Injectable()
export class GlobalUniverseStorageService {
  /**
   * Saves sort criteria to localStorage
   */
  saveSortCriteria(criteria: Array<{ field: string; order: number }>): void {
    setLocalStorageItem(STORAGE_KEY, criteria);
  }

  /**
   * Loads sort criteria from localStorage
   */
  loadSortCriteria(): Array<{ field: string; order: number }> {
    const saved = getLocalStorageItem<Array<{ field: string; order: number }>>(
      STORAGE_KEY,
      []
    );
    // Validate that the parsed data is an array of objects with field and order properties
    if (
      Array.isArray(saved) &&
      saved.every(function itemCheck(item) {
        return (
          typeof item === 'object' &&
          typeof item.field === 'string' &&
          typeof item.order === 'number'
        );
      })
    ) {
      return saved;
    }
    return [];
  }

  /**
   * Saves min yield filter to localStorage
   */
  saveMinYieldFilter(value: number | null): void {
    setLocalStorageItem(`${FILTERS_STORAGE_KEY}-minYield`, value);
  }

  /**
   * Loads min yield filter from localStorage
   */
  loadMinYieldFilter(): number | null {
    const saved = getLocalStorageItem<number | null>(
      `${FILTERS_STORAGE_KEY}-minYield`,
      null
    );
    if (typeof saved === 'number' || saved === null) {
      return saved;
    }
    return null;
  }

  /**
   * Saves risk group filter to localStorage
   */
  saveRiskGroupFilter(value: string | null): void {
    setLocalStorageItem(`${FILTERS_STORAGE_KEY}-riskGroup`, value);
  }

  /**
   * Loads risk group filter from localStorage
   */
  loadRiskGroupFilter(): string | null {
    const saved = getLocalStorageItem<string | null>(
      `${FILTERS_STORAGE_KEY}-riskGroup`,
      null
    );
    if (typeof saved === 'string' || saved === null) {
      return saved;
    }
    return null;
  }

  /**
   * Saves expired filter to localStorage
   */
  saveExpiredFilter(value: boolean | null): void {
    setLocalStorageItem(`${FILTERS_STORAGE_KEY}-expired`, value);
  }

  /**
   * Loads expired filter from localStorage
   * Always returns null to enable expired-with-positions filtering by default
   */
  loadExpiredFilter(): boolean | null {
    // Always return null to activate expired-with-positions filtering by default
    // This ensures consistent default behavior regardless of previously saved settings
    return null;
  }

  /**
   * Saves symbol filter to localStorage
   */
  saveSymbolFilter(value: string): void {
    setLocalStorageItem(`${FILTERS_STORAGE_KEY}-symbol`, value);
  }

  /**
   * Loads symbol filter from localStorage
   */
  loadSymbolFilter(): string {
    const saved = getLocalStorageItem<string>(
      `${FILTERS_STORAGE_KEY}-symbol`,
      ''
    );
    if (typeof saved === 'string') {
      return saved;
    }
    return '';
  }

  /**
   * Saves selected account ID to localStorage
   */
  saveSelectedAccountId(value: string): void {
    setLocalStorageItem(`${FILTERS_STORAGE_KEY}-selectedAccountId`, value);
  }

  /**
   * Loads selected account ID from localStorage
   */
  loadSelectedAccountId(): string {
    const saved = getLocalStorageItem<string>(
      `${FILTERS_STORAGE_KEY}-selectedAccountId`,
      'all'
    );
    if (typeof saved === 'string') {
      return saved;
    }
    return 'all';
  }
}
