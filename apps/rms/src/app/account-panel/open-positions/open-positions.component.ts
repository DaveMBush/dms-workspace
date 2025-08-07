import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy,Component, computed,ElementRef, inject, signal,viewChild  } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';

import { currentAccountSignalStore } from '../../store/current-account/current-account.signal-store';
import { selectCurrentAccountSignal } from '../../store/current-account/select-current-account.signal';
import { Trade } from '../../store/trades/trade.interface';
import { selectUniverses } from '../../store/universe/selectors/select-universes.function';
import { Universe } from '../../store/universe/universe.interface';
import { OpenPosition } from '../../store/trades/open-position.interface';
import { OpenPositionsComponentService } from './open-positions-component.service';

const FILTERS_STORAGE_KEY = 'open-positions-filters';
const SORT_STORAGE_KEY = 'open-positions-sort';


@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'rms-open-positions',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, InputNumberModule, DatePickerModule, FormsModule, ToastModule],
  templateUrl: './open-positions.component.html',
  styleUrls: ['./open-positions.component.scss'],
  viewProviders: [OpenPositionsComponentService],
})
export class OpenPositionsComponent {
  private scrollTopSignal = signal(0);
  private openPositionsService = inject(OpenPositionsComponentService);
  private currentAccountSignalStore = inject(currentAccountSignalStore);
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  positions$ = computed(() => {
    const rawPositions = this.openPositionsService.selectOpenPositions();
    const symbolFilter = this.symbolFilter();
    const sortField = this.sortField();
    const sortOrder = this.sortOrder();

    // Apply symbol filter
    let filteredPositions = rawPositions;
    if (symbolFilter && symbolFilter.trim() !== '') {
      filteredPositions = rawPositions.filter(function filterSymbol(position) {
        return position.symbol.toLowerCase().includes(symbolFilter.toLowerCase());
      });
    }

    // Apply sorting
    if (sortField && sortOrder !== 0) {
      filteredPositions = [...filteredPositions].sort((a, b) => this.comparePositions(a, b, sortField, sortOrder));
    }

    return filteredPositions;
  });

  toastMessages = signal<{ severity: string; summary: string; detail: string }[]>([]);
  private messageService = inject(MessageService);
  symbolFilter = signal<string>(this.loadSymbolFilter());

  // Sort state signals
  private sortField = signal<string>(this.loadSortField());
  private sortOrder = signal<number>(this.loadSortOrder());

  // Sort signals for UI
  readonly sortSignals = {
    buyDateSortIcon$: computed(() => {
      const field = this.sortField();
      const order = this.sortOrder();
      if (field === 'buyDate') {
        return order === 1 ? 'pi pi-sort-up' : 'pi pi-sort-down';
      }
      return 'pi pi-sort';
    }),
    buyDateSortOrder$: computed(() => {
      const field = this.sortField();
      const order = this.sortOrder();
      if (field === 'buyDate') {
        return order === 1 ? '1' : '2';
      }
      return '';
    }),
    unrealizedGainPercentSortIcon$: computed(() => {
      const field = this.sortField();
      const order = this.sortOrder();
      if (field === 'unrealizedGainPercent') {
        return order === 1 ? 'pi pi-sort-up' : 'pi pi-sort-down';
      }
      return 'pi pi-sort';
    }),
    unrealizedGainPercentSortOrder$: computed(() => {
      const field = this.sortField();
      const order = this.sortOrder();
      if (field === 'unrealizedGainPercent') {
        return order === 1 ? '1' : '2';
      }
      return '';
    }),
    unrealizedGainSortIcon$: computed(() => {
      const field = this.sortField();
      const order = this.sortOrder();
      if (field === 'unrealizedGain') {
        return order === 1 ? 'pi pi-sort-up' : 'pi pi-sort-down';
      }
      return 'pi pi-sort';
    }),
    unrealizedGainSortOrder$: computed(() => {
      const field = this.sortField();
      const order = this.sortOrder();
      if (field === 'unrealizedGain') {
        return order === 1 ? '1' : '2';
      }
      return '';
    })
  };
  trash(position: OpenPosition): void {
    // Convert store OpenPosition to component OpenPosition for deletion
    const positionForDeletion = {
      id: position.id,
      symbol: position.symbol,
      exDate: position.exDate,
      buy: position.buy,
      buyDate: position.buyDate.toISOString(),
      quantity: position.quantity,
      expectedYield: position.expectedYield,
      sell: position.sell,
      sellDate: position.sellDate?.toISOString() ?? '',
      daysHeld: position.daysHeld,
      targetGain: position.targetGain,
      targetSell: position.targetSell
    };
    this.openPositionsService.deleteOpenPosition(positionForDeletion);
  }

  trackById(index: number, row: OpenPosition): string {
    return row.id;
  }

  stopArrowKeyPropagation(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.stopPropagation();
    }
  }

  onEditCommit(row: OpenPosition, field: string): void {
    this.setCurrentScrollPosition();
    const trade = this.findTradeForRow(row);
    const universe = this.findUniverseForSymbol(row.symbol);
    if (trade === undefined && universe === undefined) {
      return;
    }
    const tradeField = this.validateTradeField(field, row, trade!, universe!);
    if (tradeField === '') {
      return;
    }
    (trade as Record<keyof Trade, unknown>)[tradeField as keyof Trade] = row[field as keyof OpenPosition];
  }

  /**
   * Handles symbol filter changes and saves to localStorage
   */
  protected onSymbolFilterChange(): void {
    this.saveSymbolFilter(this.symbolFilter());
  }

  /**
   * Handles sort changes and saves to localStorage
   */
  protected onSort(field: string): void {
    const currentField = this.sortField();
    const currentOrder = this.sortOrder();

    if (currentField === field) {
      // Toggle order if same field
      this.sortOrder.set(currentOrder === 1 ? -1 : 1);
    } else {
      // Set new field with ascending order
      this.sortField.set(field);
      this.sortOrder.set(1);
    }

    this.saveSortState();
  }

    /**
   * Compares two positions for sorting
   */
  private comparePositions(a: OpenPosition, b: OpenPosition, sortField: string, sortOrder: number): number {
    let aValue: unknown;
    let bValue: unknown;

    switch (sortField) {
      case 'buyDate':
        aValue = a.buyDate;
        bValue = b.buyDate;
        break;
      case 'unrealizedGainPercent':
        aValue = a.unrealizedGainPercent;
        bValue = b.unrealizedGainPercent;
        break;
      case 'unrealizedGain':
        aValue = a.unrealizedGain;
        bValue = b.unrealizedGain;
        break;
      default:
        return 0;
    }

    if (aValue === bValue) {
      return 0;
    }
    if (aValue === null || aValue === undefined) {
      return sortOrder;
    }
    if (bValue === null || bValue === undefined) {
      return -sortOrder;
    }

    let comparison: number;
    if (aValue < bValue) {
      comparison = -1;
    } else if (aValue > bValue) {
      comparison = 1;
    } else {
      comparison = 0;
    }

    return comparison * sortOrder;
  }

  private validateTradeField(field: string, row: OpenPosition, trade: Trade, universe: Universe): string {
    let tradeField = field;
    switch (field) {
      case 'sell':
        universe.most_recent_sell_price = row.sell;
        break;
      case 'sellDate':
        tradeField = 'sell_date';
        if (!this.isDateRangeValid(row.buyDate, row.sellDate, 'sellDate')) {
          this.messageService.add({ severity: 'error', summary: 'Invalid Date', detail: 'Sell date cannot be before buy date.' });
          // revert row.sellDate to previous value
          row.sellDate = trade.sell_date ? new Date(trade.sell_date) : undefined;
          return '';
        }
        if (universe.most_recent_sell_date !== null || (row.sellDate && row.sellDate > new Date(universe.most_recent_sell_date!))) {
          universe.most_recent_sell_date = row.sellDate?.toISOString() ?? null;
        }
        break;
      case 'buyDate':
        tradeField = 'buy_date';
        if (!this.isDateRangeValid(row.buyDate, row.sellDate, 'buyDate')) {
          this.messageService.add({ severity: 'error', summary: 'Invalid Date', detail: 'Buy date cannot be after sell date.' });
          // revert row.buyDate to previous value
          row.buyDate = trade.buy_date ? new Date(trade.buy_date) : new Date();
          return '';
        }
        break;
      default:
        break;
    }
    return tradeField;
  }

  private findTradeForRow(row: OpenPosition): Trade | undefined {
    const trades = this.openPositionsService.trades();
    for (let i = 0; i < trades.length; i++) {
      if (trades[i].id === row.id) {
        return trades[i];
      }
    }
    return undefined;
  }

  private findUniverseForSymbol(symbol: string): Universe | undefined {
    const universes = selectUniverses();
    for (let i = 0; i < universes.length; i++) {
      if (universes[i].symbol === symbol) {
        return universes[i];
      }
    }
    return undefined;
  }

  private setCurrentScrollPosition(): void {
    let scrollContainer = this.getScrollContainer();
    if (scrollContainer) {
      scrollContainer.scrollTop = this.scrollTopSignal();
    }
    const self = this;
    setTimeout(function resetScrollPosition() {
      scrollContainer = self.getScrollContainer();
      if (scrollContainer) {
        scrollContainer.scrollTop = self.scrollTopSignal();
      }
    }, 200);
  }

  private possibleDateToDate(date: unknown): Date | undefined {
    if (date instanceof Date) {
      return date;
    }
    if (typeof date === 'string') {
      return new Date(date);
    }
    return undefined;
  }

  private isDateRangeValid(buyDate: unknown, sellDate: unknown, editing: 'buyDate' | 'sellDate'): boolean {
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

  tableRef = viewChild('tableRef', { read: ElementRef });

  private getScrollContainer(): HTMLElement | null {
    const tableEl = this.tableRef()?.nativeElement as HTMLElement;
    return tableEl?.querySelector('.p-datatable-table-container');
  }

  /**
   * Saves symbol filter to localStorage
   */
  private saveSymbolFilter(value: string): void {
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
  private loadSymbolFilter(): string {
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
  private loadSortField(): string {
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
  private loadSortOrder(): number {
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
  private saveSortState(): void {
    try {
      const currentAccount = selectCurrentAccountSignal(this.currentAccountSignalStore);
      const accountId = currentAccount().id;
      localStorage.setItem(`${SORT_STORAGE_KEY}-${accountId}-field`, JSON.stringify(this.sortField()));
      localStorage.setItem(`${SORT_STORAGE_KEY}-${accountId}-order`, JSON.stringify(this.sortOrder()));
    } catch {
      // fail silently
    }
  }

}
