import { inject } from '@angular/core';

import { currentAccountSignalStore } from '../../store/current-account/current-account.signal-store';
import { selectCurrentAccountSignal } from '../../store/current-account/select-current-account.signal';

const FILTERS_STORAGE_KEY = 'open-positions-filters';
const SORT_STORAGE_KEY = 'open-positions-sort';

export class OpenPositionsStorageService {
  private currentAccountSignalStore = inject(currentAccountSignalStore);

  /**
   * Saves symbol filter to localStorage
   */
  saveSymbolFilter(value: string): void {
    try {
      const currentAccount = selectCurrentAccountSignal(this.currentAccountSignalStore);
      const accountId = currentAccount().id;
      localStorage.setItem(`${FILTERS_STORAGE_KEY}-${accountId}-symbolFilter`, JSON.stringify(value));
    } catch {
      // fail silently
    }
  }

  /**
   * Loads symbol filter from localStorage
   */
  loadSymbolFilter(): string {
    try {
      const currentAccount = selectCurrentAccountSignal(this.currentAccountSignalStore);
      const accountId = currentAccount().id;
      const saved = localStorage.getItem(`${FILTERS_STORAGE_KEY}-${accountId}-symbolFilter`);
      if (saved !== null) {
        return JSON.parse(saved) as string;
      }
    } catch {
      // fail silently
    }
    return ''; // Default value if nothing is saved or an error occurs
  }

  /**
   * Loads sort field from localStorage
   */
  loadSortField(): string {
    try {
      const currentAccount = selectCurrentAccountSignal(this.currentAccountSignalStore);
      const accountId = currentAccount().id;
      const saved = localStorage.getItem(`${SORT_STORAGE_KEY}-${accountId}-field`);
      if (saved !== null) {
        return JSON.parse(saved) as string;
      }
    } catch {
      // fail silently
    }
    return ''; // Default value if nothing is saved or an error occurs
  }

  /**
   * Loads sort order from localStorage
   */
  loadSortOrder(): number {
    try {
      const currentAccount = selectCurrentAccountSignal(this.currentAccountSignalStore);
      const accountId = currentAccount().id;
      const saved = localStorage.getItem(`${SORT_STORAGE_KEY}-${accountId}-order`);
      if (saved !== null) {
        return JSON.parse(saved) as number;
      }
    } catch {
      // fail silently
    }
    return 1; // Default value if nothing is saved or an error occurs
  }

  /**
   * Saves sort state to localStorage
   */
  saveSortState(sortField: string, sortOrder: number): void {
    try {
      const currentAccount = selectCurrentAccountSignal(this.currentAccountSignalStore);
      const accountId = currentAccount().id;
      localStorage.setItem(`${SORT_STORAGE_KEY}-${accountId}-field`, JSON.stringify(sortField));
      localStorage.setItem(`${SORT_STORAGE_KEY}-${accountId}-order`, JSON.stringify(sortOrder));
    } catch {
      // fail silently
    }
  }

  /**
   * Converts a possible date value to a Date object
   */
  possibleDateToDate(date: unknown): Date | undefined {
    if (date instanceof Date) {
      return date;
    }
    if (typeof date === 'string') {
      return new Date(date);
    }
    return undefined;
  }

  /**
   * Validates if a date range is valid
   */
  isDateRangeValid(buyDate: unknown, sellDate: unknown, editing: 'buyDate' | 'sellDate'): boolean {
    const buy = this.possibleDateToDate(buyDate);
    const sell = this.possibleDateToDate(sellDate);
    if (editing === 'buyDate' && buy && sell) {
      return buy <= sell;
    }
    if (editing === 'sellDate' && buy && sell) {
      return sell >= buy;
    }
    return true;
  }
}
