import { Component, inject, computed, signal } from '@angular/core';
import { ToolbarModule } from 'primeng/toolbar';
import { TableModule } from 'primeng/table';
import { selectUniverse } from './universe.selector';
import { DatePickerModule } from 'primeng/datepicker';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { Universe } from '../../store/universe/universe.interface';
import { selectUniverses } from '../../store/universe/universe.selectors';
import { InputNumberModule } from 'primeng/inputnumber';
import { UniverseSettingsService } from '../../universe-settings/universe-settings.service';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { NgClass } from '@angular/common';
import { selectAccounts, selectAccountsEntity, selectTopAccounts } from '../../store/accounts/account.selectors';
import { Account } from '../../store/accounts/account.interface';
import { Trade } from '../../store/trades/trade.interface';
import { selectAccountChildren } from '../../store/trades/trade.selectors';

@Component({
  selector: 'app-global-universe',
  standalone: true,
  imports: [TagModule, InputNumberModule, SelectModule, DatePipe, DecimalPipe, ToolbarModule, TableModule, DatePickerModule, FormsModule, ButtonModule, TooltipModule, NgClass],
  templateUrl: './global-universe.component.html',
  styleUrls: ['./global-universe.component.scss'],
})
export class GlobalUniverseComponent {
  public readonly today = new Date();
  public sortCriteria = signal<Array<{field: string, order: number}>>([]);
  public minYieldFilter = signal<number | null>(null);
  public selectedAccountId = signal<string>('all');
  public riskGroups = [
    { label: 'Equities', value: 'Equities' },
    { label: 'Income', value: 'Income' },
    { label: 'Tax Free', value: 'Tax Free Income' }
  ];
  public expiredOptions = [
    { label: 'Yes', value: true },
    { label: 'No', value: false }
  ];
  public searchSymbol = '';
  protected readonly settingsService = inject(UniverseSettingsService);

  // Account options for the dropdown
  public accountOptions = computed(() => {
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
  public readonly universe$ = computed(() => {
    const rawData = selectUniverse();
    const currentSortCriteria = this.sortCriteria();
    const minYield = this.minYieldFilter();
    const selectedAccount = this.selectedAccountId();

    // Apply yield filter first
    let filteredData = rawData;
    if (minYield !== null && minYield > 0) {
      filteredData = rawData.filter(item => (item.yield_percent || 0) >= minYield);
    }

    // Apply account-specific filtering for position and sell data
    if (selectedAccount !== 'all') {
      filteredData = filteredData.map(item => {
        // Get account-specific data for this symbol
        const accountSpecificData = this.getAccountSpecificData(item.symbol, selectedAccount);
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

    sortedData.sort((a, b) => {
      for (const criteria of currentSortCriteria) {
        const aValue = this.getFieldValueFromDisplayData(a, criteria.field);
        const bValue = this.getFieldValueFromDisplayData(b, criteria.field);

        const comparison = this.compareValues(aValue, bValue);
        if (comparison !== 0) {
          return criteria.order * comparison;
        }
      }
      return 0;
    });

    return sortedData;
  });

  public onEditDistributionComplete(row: Universe) {
    const universes = selectUniverses();
    for (let i = 0; i < universes.length; i++) {
      if (universes[i].symbol === row.symbol) {
        universes[i].distribution = row.distribution;
        break;
      }
    }
  }

  public onEditDistributionsPerYearComplete(row: Universe) {
    const universes = selectUniverses();
    for (let i = 0; i < universes.length; i++) {
      if (universes[i].symbol === row.symbol) {
        console.log('onEditDistributionsPerYearComplete', universes[i].distributions_per_year, row.distributions_per_year);
        universes[i].distributions_per_year = row.distributions_per_year;
        break;
      }
    }
  }

  public onEditDateComplete(row: Universe) {
    const universes = selectUniverses();
    for (let i = 0; i < universes.length; i++) {
      if (universes[i].symbol === row.symbol) {
        universes[i].ex_date = (typeof row.ex_date === 'object' && row.ex_date !== null && (row.ex_date as any) instanceof Date)
          ? (row.ex_date as any).toISOString()
          : row.ex_date;
        break;
      }
    }
  }

  public onEditComplete(event: any) {
    // event.data: the row object
    // event.field: the field name (e.g., 'distribution')
    // event.originalEvent: the DOM event
    const universes = selectUniverses();
    for (let i = 0; i < universes.length; i++) {
      if (universes[i].symbol === event.data.symbol) {
        // Update the field that was edited
        (universes[i] as any)[event.field] = event.data[event.field];
        break;
      }
    }
  }

  public trackById(index: number, row: Universe) {
    return row.id;
  }

  public onEditCommit(row: Universe, field: string) {
    const universes = selectUniverses();
    for (let i = 0; i < universes.length; i++) {
      if (universes[i].symbol === row.symbol) {
        (universes[i] as any)[field] = (row as any)[field];
        break;
      }
    }
  }

  stopArrowKeyPropagation(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.stopPropagation();
    }
  }

      /**
   * Handles column sorting with multi-column support
   */
  public onSort(field: string): void {
    const currentCriteria = this.sortCriteria();
    const existingIndex = currentCriteria.findIndex(criteria => criteria.field === field);

    if (existingIndex >= 0) {
      // Toggle order for existing field
      const updatedCriteria = [...currentCriteria];
      updatedCriteria[existingIndex].order = updatedCriteria[existingIndex].order === 1 ? -1 : 1;
      this.sortCriteria.set(updatedCriteria);
    } else {
      // Add new field to sort criteria
      this.sortCriteria.set([...currentCriteria, { field, order: 1 }]);
    }
    // The computed signal will automatically re-evaluate and apply sorting
  }

  /**
   * Returns the appropriate sort icon class for a field
   */
  public getSortIcon(field: string): string {
    const currentCriteria = this.sortCriteria();
    const criteria = currentCriteria.find(c => c.field === field);
    if (!criteria) return 'pi pi-sort';
    return criteria.order === 1 ? 'pi pi-sort-up' : 'pi pi-sort-down';
  }

  /**
   * Handles yield filter changes
   */
  public onYieldFilterChange(): void {
    // The computed signal will automatically re-evaluate when minYieldFilter changes
  }

  /**
   * Gets the value of a field from the display data object
   */
  private getFieldValueFromDisplayData(data: any, field: string): any {
    switch (field) {
      case 'yield_percent':
        return data.yield_percent || 0;
      case 'ex_date':
        return this.getSortableExDate(data);
      case 'most_recent_sell_date':
        return data.most_recent_sell_date ? new Date(data.most_recent_sell_date) : new Date(0);
      case 'most_recent_sell_price':
        return data.most_recent_sell_price || 0;
      default:
        return data[field];
    }
  }

  /**
   * Gets the sortable ex-date value, which may be a calculated next ex-date
   * if the current ex-date has passed
   */
  private getSortableExDate(data: any): Date {
    if (!data.ex_date || !(data.ex_date instanceof Date)) {
      return new Date(0);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day

    const exDate = new Date(data.ex_date);
    exDate.setHours(0, 0, 0, 0); // Normalize to start of day

    // If ex-date is today or in the past, calculate the next expected ex-date
    if (exDate <= today) {
      const distributionsPerYear = data.distributions_per_year || 0;
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
    most_recent_sell_date: string | null;
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
      .filter(trade => !trade.sell_date) // Only open positions
      .reduce((sum, trade) => sum + (trade.buy * trade.quantity), 0);

    // Find most recent sell date and price
    const soldTrades = symbolTrades
      .filter(trade => trade.sell_date)
      .sort((a, b) => new Date(b.sell_date as string).getTime() - new Date(a.sell_date as string).getTime());

    const mostRecentSell = soldTrades[0];

    return {
      position,
      most_recent_sell_date: mostRecentSell?.sell_date || null,
      most_recent_sell_price: mostRecentSell?.sell || null
    };
  }

  /**
   * Gets the value of a field from a universe object
   */
  private getFieldValue(universe: Universe, field: string): any {
    switch (field) {
      case 'yield_percent':
        return 100 * universe.distributions_per_year * (universe.distribution / universe.last_price);
      case 'ex_date':
        return universe.ex_date ? new Date(universe.ex_date) : new Date(0);
      case 'most_recent_sell_date':
        return universe.most_recent_sell_date ? new Date(universe.most_recent_sell_date) : new Date(0);
      case 'most_recent_sell_price':
        return universe.most_recent_sell_price || 0;
      default:
        return (universe as any)[field];
    }
  }

  /**
   * Compares two values for sorting
   */
  private compareValues(a: any, b: any): number {
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() - b.getTime();
    }
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }
    if (typeof a === 'string' && typeof b === 'string') {
      return a.localeCompare(b);
    }
    return 0;
  }

  /**
   * Returns true if the row should be dimmed: expired or most_recent_sell_date is today or previous trading day.
   */
  public isDimmed(row: Universe): boolean {
    if (row.expired) return true;
    if (!row.most_recent_sell_date) return false;
    const today = new Date();
    const mostRecent = new Date(row.most_recent_sell_date);
    // Normalize to yyyy-mm-dd
    const toYMD = (d: Date) => d.toISOString().slice(0, 10);
    if (toYMD(mostRecent) === toYMD(today)) return true;
    // Previous trading day logic
    let prev = new Date(today);
    prev.setDate(today.getDate() - 1);
    // If today is Monday, previous trading day is Friday
    if (today.getDay() === 1) {
      prev.setDate(today.getDate() - 3);
    }
    if (toYMD(mostRecent) === toYMD(prev)) return true;
    return false;
  }
}
