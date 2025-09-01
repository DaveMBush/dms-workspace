import { inject } from '@angular/core';

import { currentAccountSignalStore } from '../store/current-account/current-account.signal-store';
import { selectCurrentAccountSignal } from '../store/current-account/select-current-account.signal';

export abstract class BasePositionsStorageService {
  private currentAccountSignalStore = inject(currentAccountSignalStore);

  protected abstract getFiltersStorageKey(): string;
  protected abstract getSortStorageKey(): string;

  /**
   * Saves symbol filter to localStorage
   */
  saveSymbolFilter(value: string): void {
    try {
      const currentAccount = selectCurrentAccountSignal(
        this.currentAccountSignalStore
      );
      const accountId = currentAccount().id;
      localStorage.setItem(
        `${this.getFiltersStorageKey()}-${accountId}-symbolFilter`,
        JSON.stringify(value)
      );
    } catch {
      // fail silently
    }
  }

  /**
   * Gets symbol filter from localStorage
   */
  getSymbolFilter(): string {
    try {
      const currentAccount = selectCurrentAccountSignal(
        this.currentAccountSignalStore
      );
      const accountId = currentAccount().id;
      const value = localStorage.getItem(
        `${this.getFiltersStorageKey()}-${accountId}-symbolFilter`
      );
      return value !== null ? (JSON.parse(value) as string) : '';
    } catch {
      return '';
    }
  }

  /**
   * Saves risk group filter to localStorage
   */
  saveRiskGroupFilter(value: string | null): void {
    try {
      const currentAccount = selectCurrentAccountSignal(
        this.currentAccountSignalStore
      );
      const accountId = currentAccount().id;
      localStorage.setItem(
        `${this.getFiltersStorageKey()}-${accountId}-riskGroupFilter`,
        JSON.stringify(value)
      );
    } catch {
      // fail silently
    }
  }

  /**
   * Gets risk group filter from localStorage
   */
  getRiskGroupFilter(): string | null {
    try {
      const currentAccount = selectCurrentAccountSignal(
        this.currentAccountSignalStore
      );
      const accountId = currentAccount().id;
      const value = localStorage.getItem(
        `${this.getFiltersStorageKey()}-${accountId}-riskGroupFilter`
      );
      return value !== null ? (JSON.parse(value) as string | null) : null;
    } catch {
      return null;
    }
  }

  /**
   * Saves sort configuration to localStorage
   */
  saveSortConfiguration(value: Array<{ field: string; order: number }>): void {
    try {
      const currentAccount = selectCurrentAccountSignal(
        this.currentAccountSignalStore
      );
      const accountId = currentAccount().id;
      localStorage.setItem(
        `${this.getSortStorageKey()}-${accountId}`,
        JSON.stringify(value)
      );
    } catch {
      // fail silently
    }
  }

  /**
   * Gets sort configuration from localStorage
   */
  getSortConfiguration(): Array<{ field: string; order: number }> {
    try {
      const currentAccount = selectCurrentAccountSignal(
        this.currentAccountSignalStore
      );
      const accountId = currentAccount().id;
      const value = localStorage.getItem(
        `${this.getSortStorageKey()}-${accountId}`
      );
      return value !== null
        ? (JSON.parse(value) as Array<{ field: string; order: number }>)
        : [];
    } catch {
      return [];
    }
  }

  /**
   * Saves yield filter to localStorage
   */
  saveYieldFilter(value: number | null): void {
    try {
      const currentAccount = selectCurrentAccountSignal(
        this.currentAccountSignalStore
      );
      const accountId = currentAccount().id;
      localStorage.setItem(
        `${this.getFiltersStorageKey()}-${accountId}-yieldFilter`,
        JSON.stringify(value)
      );
    } catch {
      // fail silently
    }
  }

  /**
   * Gets yield filter from localStorage
   */
  getYieldFilter(): number | null {
    try {
      const currentAccount = selectCurrentAccountSignal(
        this.currentAccountSignalStore
      );
      const accountId = currentAccount().id;
      const value = localStorage.getItem(
        `${this.getFiltersStorageKey()}-${accountId}-yieldFilter`
      );
      return value !== null ? (JSON.parse(value) as number | null) : null;
    } catch {
      return null;
    }
  }

  /**
   * Saves expired filter to localStorage
   */
  saveExpiredFilter(value: boolean | null): void {
    try {
      const currentAccount = selectCurrentAccountSignal(
        this.currentAccountSignalStore
      );
      const accountId = currentAccount().id;
      localStorage.setItem(
        `${this.getFiltersStorageKey()}-${accountId}-expiredFilter`,
        JSON.stringify(value)
      );
    } catch {
      // fail silently
    }
  }

  /**
   * Gets expired filter from localStorage
   */
  getExpiredFilter(): boolean | null {
    try {
      const currentAccount = selectCurrentAccountSignal(
        this.currentAccountSignalStore
      );
      const accountId = currentAccount().id;
      const value = localStorage.getItem(
        `${this.getFiltersStorageKey()}-${accountId}-expiredFilter`
      );
      return value !== null ? (JSON.parse(value) as boolean | null) : null;
    } catch {
      return null;
    }
  }

  /**
   * Loads symbol filter from localStorage
   */
  loadSymbolFilter(): string {
    return this.getSymbolFilter();
  }

  /**
   * Loads sort field from localStorage
   */
  loadSortField(): string {
    try {
      const config = this.getSortConfiguration();
      return config.length > 0 ? config[0].field : '';
    } catch {
      return '';
    }
  }

  /**
   * Loads sort order from localStorage
   */
  loadSortOrder(): number {
    try {
      const config = this.getSortConfiguration();
      return config.length > 0 ? config[0].order : 1;
    } catch {
      return 1;
    }
  }

  /**
   * Saves sort state to localStorage
   */
  saveSortState(sortField: string, sortOrder: number): void {
    this.saveSortConfiguration([{ field: sortField, order: sortOrder }]);
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
  isDateRangeValid(
    buyDate: unknown,
    sellDate: unknown,
    editing: 'buyDate' | 'sellDate'
  ): boolean {
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
