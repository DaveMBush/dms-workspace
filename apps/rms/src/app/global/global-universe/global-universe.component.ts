import { DatePipe, DecimalPipe , NgClass } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy,Component, computed, inject, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';

import { selectAccounts } from '../../store/accounts/selectors/select-accounts.function';
import { selectAccountChildren } from '../../store/trades/selectors/select-account-children.function';
import { Trade } from '../../store/trades/trade.interface';
import { selectUniverses } from '../../store/universe/selectors/select-universes.function';
import { Universe } from '../../store/universe/universe.interface';
import { UniverseSettingsService } from '../../universe-settings/universe-settings.service';
import { compareForSort } from './compare-for-sort.function';
import { getSortIcon } from './get-sort-icon.function';
import { isRowDimmed } from './is-row-dimmed.function';
import { selectUniverse } from './universe.selector';

const STORAGE_KEY = 'global-universe-sort-criteria';
const FILTERS_STORAGE_KEY = 'global-universe-filters';


@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'rms-global-universe',
  standalone: true,
  imports: [TagModule, InputNumberModule, SelectModule, DatePipe, DecimalPipe, ToolbarModule, TableModule, DatePickerModule, FormsModule, ButtonModule, TooltipModule, NgClass],
  templateUrl: './global-universe.component.html',
  styleUrls: ['./global-universe.component.scss'],
})
export class GlobalUniverseComponent {
  readonly today = new Date();
  sortCriteria = signal<Array<{field: string, order: number}>>(this.loadSortCriteria());
  minYieldFilter = signal<number | null>(this.loadMinYieldFilter());
  selectedAccountId = signal<string>(this.loadSelectedAccountId());
  riskGroupFilter = signal<string | null>(this.loadRiskGroupFilter());
  expiredFilter = signal<boolean | null>(this.loadExpiredFilter());
  symbolFilter = signal<string>(this.loadSymbolFilter());
  riskGroups = [
    { label: 'Equities', value: 'Equities' },
    { label: 'Income', value: 'Income' },
    { label: 'Tax Free', value: 'Tax Free Income' }
  ];

  expiredOptions = [
    { label: 'Yes', value: true },
    { label: 'No', value: false }
  ];

  searchSymbol = '';
  protected readonly settingsService = inject(UniverseSettingsService);

  // Account options for the dropdown
  accountOptions$ = computed(function accountOptionsComputed() {
    const accounts = selectAccounts();
    const options = [
      { label: 'All Accounts', value: 'all' }
    ];

    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      options.push({
        label: account.name,
        value: account.id
      });
    }

    return options;
  });

  // Computed signal that automatically applies sorting when data changes
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- function would hide this
  readonly universe$ = computed(() => {
    const rawData = selectUniverse();
    const currentSortCriteria = this.sortCriteria();
    const minYield = this.minYieldFilter();
    const selectedAccount = this.selectedAccountId();
    const symbolFilter = this.symbolFilter();
    const self = this;

    // Apply filters
    let filteredData = rawData;

    // Apply symbol filter
    if (symbolFilter && symbolFilter.trim() !== '') {
      filteredData = filteredData.filter(function filterSymbol(item) {
        return item.symbol.toLowerCase().includes(symbolFilter.toLowerCase());
      });
    }

    // Apply yield filter
    if (minYield !== null && minYield > 0) {
      filteredData = filteredData.filter(function filterYield(item) {
        return (item.yield_percent || 0) >= minYield;
      });
    }

    // Apply account-specific filtering for position and sell data
    if (selectedAccount !== 'all') {
      filteredData = filteredData.map(function mapAccountSpecificData(item) {
        // Get account-specific data for this symbol
        const accountSpecificData = self.getAccountSpecificData(item.symbol, selectedAccount);
        return {
          ...item,
          position: accountSpecificData.position,
          most_recent_sell_date: accountSpecificData.most_recent_sell_date,
          most_recent_sell_price: accountSpecificData.most_recent_sell_price
        };
      });
    }

    if (currentSortCriteria.length === 0) {
      return filteredData;
    }

    // Create a copy to avoid mutating the original data
    const sortedData = [...filteredData];

    sortedData.sort(function sortData(a, b) {
      for (const criteria of currentSortCriteria) {
        const aValue = self.getFieldValueFromDisplayData(a, criteria.field);
        const bValue = self.getFieldValueFromDisplayData(b, criteria.field);

        const comparison = compareForSort(aValue, bValue);
        if (comparison !== 0) {
          return criteria.order * comparison;
        }
      }
      return 0;
    });

    return sortedData;
  });

  onEditDistributionComplete(row: Universe): void {
    const universes = selectUniverses();
    for (let i = 0; i < universes.length; i++) {
      if (universes[i].symbol === row.symbol) {
        universes[i].distribution = row.distribution;
        break;
      }
    }
  }

  onEditDistributionsPerYearComplete(row: Universe): void {
    const universes = selectUniverses();
    for (let i = 0; i < universes.length; i++) {
      if (universes[i].symbol === row.symbol) {
        universes[i].distributions_per_year = row.distributions_per_year;
        break;
      }
    }
  }

  onEditDateComplete(row: Universe): void {
    const universes = selectUniverses();
    for (let i = 0; i < universes.length; i++) {
      if (universes[i].symbol === row.symbol) {
        universes[i].ex_date = (typeof row.ex_date === 'object' && row.ex_date !== null && (row.ex_date as unknown) instanceof Date)
          ? (row.ex_date as Date).toISOString()
          : row.ex_date;
        break;
      }
    }
  }

  onEditComplete(event: {data: Record<string, unknown>, field: string}): void {
    // event.data: the row object
    // event.field: the field name (e.g., 'distribution')
    // event.originalEvent: the DOM event
    const universes = selectUniverses();
    for (let i = 0; i < universes.length; i++) {
      if (universes[i].symbol === event.data['symbol']) {
        // Update the field that was edited
        (universes[i] as unknown as Record<string, unknown>)[event.field] = event.data[event.field];
        break;
      }
    }
  }

  protected trackById(index: number, row: Universe): string {
    return row.id;
  }

  protected onEditCommit(row: Record<string, unknown>, field: string): void {
    const universes = selectUniverses();
    for (let i = 0; i < universes.length; i++) {
      if (universes[i].symbol === row['symbol']) {
        (universes[i] as unknown as Record<string, unknown>)[field] = row[field];
        break;
      }
    }
  }

  protected stopArrowKeyPropagation(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.stopPropagation();
    }
  }

    /**
   * Handles column sorting with multi-column support
   * Cycles through: ascending → descending → no sort (removed)
   */
  protected onSort(field: string): void {
    const currentCriteria = this.sortCriteria();
    const existingIndex = currentCriteria.findIndex(
      function findCriteria(criteria) { return criteria.field === field });

    if (existingIndex >= 0) {
      // Field exists in sort criteria - cycle through states
      const updatedCriteria = [...currentCriteria];
      const currentOrder = updatedCriteria[existingIndex].order;

      if (currentOrder === 1) {
        // Currently ascending, change to descending
        updatedCriteria[existingIndex].order = -1;
        this.sortCriteria.set(updatedCriteria);
        this.saveSortCriteria(updatedCriteria);
      } else {
        // Currently descending, remove from sort criteria
        updatedCriteria.splice(existingIndex, 1);
        this.sortCriteria.set(updatedCriteria);
        this.saveSortCriteria(updatedCriteria);
      }
    } else {
      // Field not in sort criteria, add as ascending
      const newCriteria = [...currentCriteria, { field, order: 1 }];
      this.sortCriteria.set(newCriteria);
      this.saveSortCriteria(newCriteria);
    }
    // The computed signal will automatically re-evaluate and apply sorting
  }

    /**
   * Gets the sort order (1, 2, 3, etc.) for a field in multi-column sort
   */
  protected getSortOrder(field: string): number | null {
    const currentCriteria = this.sortCriteria();
    const index = currentCriteria.findIndex(
      function findCriteria(criteria) { return criteria.field === field });

    return index >= 0 ? index + 1 : null;
  }

    /**
   * Handles min yield filter changes and saves to localStorage
   */
  protected onMinYieldFilterChange(): void {
    this.saveMinYieldFilter(this.minYieldFilter());
  }

  /**
   * Handles risk group filter changes and saves to localStorage
   */
  protected onRiskGroupFilterChange(): void {
    this.saveRiskGroupFilter(this.riskGroupFilter());
  }

    /**
   * Handles risk group filter changes from PrimeNG filter
   */
  protected onRiskGroupFilterChangeFromPrimeNG(value: string | null): void {
    this.riskGroupFilter.set(value);
    this.saveRiskGroupFilter(value);
  }

    /**
   * Handles expired filter changes and saves to localStorage
   */
  protected onExpiredFilterChange(): void {
    this.saveExpiredFilter(this.expiredFilter());
  }

    /**
   * Handles expired filter changes from PrimeNG filter
   */
  protected onExpiredFilterChangeFromPrimeNG(value: boolean | null): void {
    this.expiredFilter.set(value);
    this.saveExpiredFilter(value);
  }

    /**
   * Handles symbol filter changes and saves to localStorage
   */
  protected onSymbolFilterChange(): void {
    this.saveSymbolFilter(this.symbolFilter());
    // The filtering is handled by the computed signal universe$
  }

  /**
   * Saves sort criteria to localStorage
   */
  private saveSortCriteria(criteria: Array<{field: string, order: number}>): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(criteria));
    } catch {
      // Silently fail if localStorage is not available
    }
  }

  /**
   * Loads sort criteria from localStorage
   */
  private loadSortCriteria(): Array<{field: string, order: number}> {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === null) {
        return [];
      }
      const parsed = JSON.parse(saved) as Array<{field: string, order: number}> | null;
      // Validate that the parsed data is an array of objects with field and order properties
      if (Array.isArray(parsed) && parsed.every(function itemCheck(item) {
        return typeof item === 'object' &&
          typeof item.field === 'string' &&
          typeof item.order === 'number';
      })) {
        return parsed;
      }
    } catch {
      // Silently fail if localStorage is not available or data is invalid
    }
    return [];
  }

  /**
   * Saves min yield filter to localStorage
   */
  private saveMinYieldFilter(value: number | null): void {
    try {
      localStorage.setItem(`${FILTERS_STORAGE_KEY}-minYield`, JSON.stringify(value));
    } catch {
      // Silently fail if localStorage is not available
    }
  }

  /**
   * Loads min yield filter from localStorage
   */
  private loadMinYieldFilter(): number | null {
    try {
      const saved = localStorage.getItem(`${FILTERS_STORAGE_KEY}-minYield`);
      if (saved === null) {
        return null;
      }
      const parsed = JSON.parse(saved) as number | null;
      if (typeof parsed === 'number' || parsed === null) {
        return parsed;
      }
    } catch {
      // Silently fail if localStorage is not available
    }
    return null;
  }

  /**
   * Saves risk group filter to localStorage
   */
  private saveRiskGroupFilter(value: string | null): void {
    try {
      localStorage.setItem(`${FILTERS_STORAGE_KEY}-riskGroup`, JSON.stringify(value));
    } catch {
      // Silently fail if localStorage is not available
    }
  }

  /**
   * Loads risk group filter from localStorage
   */
  private loadRiskGroupFilter(): string | null {
    try {
      const saved = localStorage.getItem(`${FILTERS_STORAGE_KEY}-riskGroup`);
      if (saved === null) {
        return null;
      }
      const parsed = JSON.parse(saved) as string | null;
      if (typeof parsed === 'string' || parsed === null) {
        return parsed;
      }
    } catch {
      // Silently fail if localStorage is not available
    }
    return null;
  }

  /**
   * Saves expired filter to localStorage
   */
  private saveExpiredFilter(value: boolean | null): void {
    try {
      localStorage.setItem(`${FILTERS_STORAGE_KEY}-expired`, JSON.stringify(value));
    } catch {
      // Silently fail if localStorage is not available
    }
  }

  /**
   * Loads expired filter from localStorage
   */
  private loadExpiredFilter(): boolean | null {
    try {
      const saved = localStorage.getItem(`${FILTERS_STORAGE_KEY}-expired`);
      if (saved === null) {
        return null;
      }
      const parsed = JSON.parse(saved) as boolean | null;
      if (typeof parsed === 'boolean' || parsed === null) {
        return parsed;
      }
    } catch {
      // Silently fail if localStorage is not available
    }
    return null;
  }

  /**
   * Saves symbol filter to localStorage
   */
  private saveSymbolFilter(value: string): void {
    try {
      localStorage.setItem(`${FILTERS_STORAGE_KEY}-symbol`, JSON.stringify(value));
    } catch {
      // Silently fail if localStorage is not available
    }
  }

  /**
   * Loads symbol filter from localStorage
   */
  private loadSymbolFilter(): string {
    try {
      const saved = localStorage.getItem(`${FILTERS_STORAGE_KEY}-symbol`);
      if (saved === null) {
        return '';
      }
      const parsed = JSON.parse(saved) as string;
      if (typeof parsed === 'string') {
        return parsed;
      }
    } catch {
      // Silently fail if localStorage is not available
    }
    return '';
  }

  /**
   * Saves selected account ID to localStorage
   */
  private saveSelectedAccountId(value: string): void {
    try {
      localStorage.setItem(`${FILTERS_STORAGE_KEY}-selectedAccountId`, JSON.stringify(value));
    } catch (error) {
      console.warn('Failed to save selected account ID to localStorage:', error);
    }
  }

  /**
   * Loads selected account ID from localStorage
   */
  private loadSelectedAccountId(): string {
    try {
      const saved = localStorage.getItem(`${FILTERS_STORAGE_KEY}-selectedAccountId`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'string') {
          return parsed;
        }
      }
    } catch (error) {
      console.warn('Failed to load selected account ID from localStorage:', error);
    }
    return 'all';
  }

  /**
   * Handles selected account ID changes and saves to localStorage
   */
  protected onSelectedAccountIdChange(): void {
    this.saveSelectedAccountId(this.selectedAccountId());
  }

  /**
   * Initializes filters with saved values
   */
  protected initializeFilters(): void {
    // This method will be called after view init to apply saved filters
    const symbolValue = this.symbolFilter();
    const riskGroupValue = this.riskGroupFilter();
    const expiredValue = this.expiredFilter();

    // We'll need to trigger the filter application here
    // This will be called from the template after the view is initialized
  }

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  yieldPercentSortIcon$ = computed(() => {
    return getSortIcon('yield_percent', this.sortCriteria);
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  exDateSortIcon$ = computed(() => {
    return getSortIcon('ex_date', this.sortCriteria);
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  mostRecentSellDateSortIcon$ = computed(() => {
    return getSortIcon('most_recent_sell_date', this.sortCriteria);
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  mostRecentSellPriceSortIcon$ = computed(() => {
    return getSortIcon('most_recent_sell_price', this.sortCriteria);
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  yieldPercentSortOrder$ = computed(() => {
    return this.getSortOrder('yield_percent');
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  exDateSortOrder$ = computed(() => {
    return this.getSortOrder('ex_date');
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  mostRecentSellDateSortOrder$ = computed(() => {
    return this.getSortOrder('most_recent_sell_date');
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  mostRecentSellPriceSortOrder$ = computed(() => {
    return this.getSortOrder('most_recent_sell_price');
  });

  /**
   * Gets the value of a field from the display data object
   */
  private getFieldValueFromDisplayData(data: unknown, field: string): unknown {
    switch (field) {
      case 'yield_percent':
        // eslint-disable-next-line @typescript-eslint/naming-convention -- matching source
        return (data as {yield_percent: number}).yield_percent ?? 0;
      case 'ex_date':
        // eslint-disable-next-line @typescript-eslint/naming-convention -- matching destination
        return this.getSortableExDate(data as { ex_date: unknown, distributions_per_year: number });
      case 'most_recent_sell_date':
        // eslint-disable-next-line @typescript-eslint/naming-convention -- matching source
        return (data as { most_recent_sell_date: string }).most_recent_sell_date ? new Date((data as { most_recent_sell_date: string }).most_recent_sell_date) : new Date(0);
      case 'most_recent_sell_price':
        // eslint-disable-next-line @typescript-eslint/naming-convention -- matching source
        return (data as { most_recent_sell_price: number }).most_recent_sell_price ?? 0;
      default:
        return (data as Record<string, unknown>)[field];
    }
  }

  /**
   * Gets the sortable ex-date value, which may be a calculated next ex-date
   * if the current ex-date has passed
   */
  // eslint-disable-next-line @typescript-eslint/naming-convention -- matching source
  private getSortableExDate(data: { ex_date?: unknown, distributions_per_year: number }): Date {
    if (!(data.ex_date instanceof Date)) {
      return new Date(0);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day

    const exDate = new Date(data.ex_date);
    exDate.setHours(0, 0, 0, 0); // Normalize to start of day

    // If ex-date is today or in the past, calculate the next expected ex-date
    if (exDate <= today) {
      // eslint-disable-next-line @typescript-eslint/naming-convention -- matching source
      const distributionsPerYear = (data as { distributions_per_year: number }).distributions_per_year ?? 0;
      const nextExDate = new Date(exDate);

      if (distributionsPerYear === 12) {
        // Monthly distributions - add 1 month
        nextExDate.setMonth(nextExDate.getMonth() + 1);
      } else if (distributionsPerYear === 4) {
        // Quarterly distributions - add 3 months
        nextExDate.setMonth(nextExDate.getMonth() + 3);
      } else {
        // For other frequencies, use the original date
        return exDate;
      }

      return nextExDate;
    }

    // If ex-date is in the future, use the original date
    return exDate;
  }

  /**
   * Gets account-specific data for a symbol
   */
  private getAccountSpecificData(symbol: string, accountId: string): {
    position: number;
    // eslint-disable-next-line @typescript-eslint/naming-convention -- matching source
    most_recent_sell_date: string | null;
    // eslint-disable-next-line @typescript-eslint/naming-convention -- matching source
    most_recent_sell_price: number | null;
  } {
    const universes = selectUniverses();
    let universeId: string | undefined;
    for (let i = 0; i < universes.length; i++) {
      if (universes[i].symbol === symbol) {
        universeId = universes[i].id;
        break;
      }
    }

    const accountsState = selectAccountChildren();
    const account = accountsState.entities[accountId];

    if (!account) {
      return {
        position: 0,
        most_recent_sell_date: null,
        most_recent_sell_price: null
      };
    }

    // Find trades for this symbol in this account
    const trades = account.trades as Trade[];
    const symbolTrades = [] as Trade[];
    for (let i = 0; i < trades.length; i++) {
      if (trades[i].universeId === universeId) {
        symbolTrades.push(trades[i]);
      }
    }

    // Calculate position (sum of buy * quantity for open positions)
    const position = symbolTrades
      .filter(function symbolTradesPositionFilter(trade) {
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions -- this is the only thing that works reliably without triggering another lint error
        return !trade.sell_date;
      }) // Only open positions
      .reduce(function symbolTradesPositionReduce(sum, trade) {
        return sum + (trade.buy * trade.quantity);
      }, 0);

    // Find most recent sell date and price
    const soldTrades = symbolTrades
      .filter(function filterSellDates(trade) {
        return Boolean(trade.sell_date);
      })
      .sort(function sortTrades(a, b) {
        return new Date(b.sell_date!).getTime() - new Date(a.sell_date!).getTime()
      });

    const mostRecentSell = soldTrades[0];

    return {
      position,
      most_recent_sell_date: mostRecentSell?.sell_date ?? null,
      most_recent_sell_price: mostRecentSell?.sell ?? null
    };
  }

  /**
   * Computed signal that returns universe data with dimmed state included
   */
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  readonly universeWithDimmedState$ = computed(() => {
    const universes = this.universe$() as unknown as Universe[];
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
    return universes.map(universe => ({
      ...universe,
      isDimmed: isRowDimmed(universe)
    }));
  });


}
