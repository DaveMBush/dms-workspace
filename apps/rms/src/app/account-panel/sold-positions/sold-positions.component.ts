import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy,Component, computed, ElementRef, inject, signal,viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RowProxyDelete } from '@smarttools/smart-signals';
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
import { SoldPositionsComponentService } from './sold-positions-component.service';

const SORT_STORAGE_KEY = 'sold-positions-sort';
const FILTERS_STORAGE_KEY = 'sold-positions-filters';

interface SoldPosition {
  id: string;
  symbol: string;
  exDate: string;
  buy: number;
  buyDate: string;
  quantity: number;
  expectedYield: number;
  sell: number;
  sellDate: string;
  daysHeld: number;
  targetGain: number;
  targetSell: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'rms-sold-positions',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, InputNumberModule, DatePickerModule, FormsModule, ToastModule],
  templateUrl: './sold-positions.component.html',
  styleUrls: ['./sold-positions.component.scss'],
})
export class SoldPositionsComponent {
  private soldPositionsService = inject(SoldPositionsComponentService);
  private currentAccountSignalStore = inject(currentAccountSignalStore);

  // Sort state signals
  private sortField = signal<string>(this.loadSortField());
  private sortOrder = signal<number>(this.loadSortOrder());

  // Filter signals
  symbolFilter = signal<string>(this.loadSymbolFilter());

  // Sort signals for UI
  readonly sortSignals = {
    sellDateSortIcon$: computed(() => {
      const field = this.sortField();
      const order = this.sortOrder();
      if (field === 'sellDate') {
        return order === 1 ? 'pi pi-sort-up' : 'pi pi-sort-down';
      }
      return 'pi pi-sort';
    }),
    sellDateSortOrder$: computed(() => {
      const field = this.sortField();
      const order = this.sortOrder();
      if (field === 'sellDate') {
        return order === 1 ? '1' : '2';
      }
      return '';
    })
  };

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  positions$ = computed(() => {
    const rawPositions = this.soldPositionsService.selectClosedPositions();
    const sortField = this.sortField();
    const sortOrder = this.sortOrder();
    const symbolFilter = this.symbolFilter();

    // Convert ClosedPosition to SoldPosition
    const soldPositions = rawPositions.map(function convertToSoldPosition(pos) {
      return {
        id: pos.id,
        symbol: pos.symbol,
        exDate: '', // Not available in ClosedPosition
        buy: pos.buy,
        buyDate: pos.buyDate.toISOString(),
        quantity: pos.quantity,
        expectedYield: 0, // Not available in ClosedPosition
        sell: pos.sell,
        sellDate: pos.sellDate?.toISOString() ?? '',
        daysHeld: pos.daysHeld,
        targetGain: 0, // Not available in ClosedPosition
        targetSell: 0 // Not available in ClosedPosition
      } as SoldPosition;
    });

    // Apply symbol filter
    let filteredPositions = soldPositions;
    if (symbolFilter && symbolFilter.trim() !== '') {
      filteredPositions = soldPositions.filter(function filterSymbol(position) {
        return position.symbol.toLowerCase().includes(symbolFilter.toLowerCase());
      });
    }

    // Apply sorting
    if (sortField && sortOrder !== 0) {
      return filteredPositions.sort((a, b) => this.comparePositions(a, b, sortField, sortOrder));
    }

    return filteredPositions;
  });

  toastMessages = signal<{ severity: string; summary: string; detail: string }[]>([]);
  tableRef = viewChild('tableRef', { read: ElementRef });
  private scrollTopSignal = signal(0);
  messageService = inject(MessageService);

  trash(position: SoldPosition): void {
    const trades = this.soldPositionsService.trades();
    for (let i = 0; i < trades.length; i++) {
      const trade = trades[i];
      if (trade.id === position.id) {
        (trade as RowProxyDelete).delete!();
      }
    }
  }

  trackById(index: number, row: SoldPosition): string {
    return row.id;
  }

  stopArrowKeyPropagation(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.stopPropagation();
    }
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
   * Handles symbol filter changes and saves to localStorage
   */
  protected onSymbolFilterChange(): void {
    this.saveSymbolFilter(this.symbolFilter());
  }

  /**
   * Compares two positions for sorting
   */
  private comparePositions(a: SoldPosition, b: SoldPosition, sortField: string, sortOrder: number): number {
    let aValue: unknown;
    let bValue: unknown;

    switch (sortField) {
      case 'sellDate':
        aValue = a.sellDate;
        bValue = b.sellDate;
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

  onEditCommit(row: SoldPosition, field: string): void {
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
    (trade as Record<keyof Trade, unknown>)[tradeField as keyof Trade] = row[field as keyof SoldPosition];
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

  private getScrollContainer(): HTMLElement | null {
    const tableEl = this.tableRef()?.nativeElement as HTMLElement;
    return tableEl?.querySelector('.p-datatable-table-container');
  }

  private setCurrentScrollPosition(): void {
    const scrollContainer = this.getScrollContainer();
    if (scrollContainer) {
      this.scrollTopSignal.set(scrollContainer.scrollTop);
    }
    const self = this;
    setTimeout(function resetScrollPosition() {
      if (self.getScrollContainer()) {
        self.getScrollContainer()!.scrollTop = self.scrollTopSignal();
      }
    }, 200);
  }

  private findTradeForRow(row: SoldPosition): Trade | undefined {
    const trades = this.soldPositionsService.trades();
    for (let i = 0; i < trades.length; i++) {
      if (trades[i].id === row.id) {
        return trades[i];
      }
    }
    return undefined;
  }

  private findUniverseForSymbol(symbol: string): Universe | undefined {
    const universe = selectUniverses();
    for (let i = 0; i < universe.length; i++) {
      if (universe[i].symbol === symbol) {
        return universe[i];
      }
    }
    return undefined;
  }

  private validateTradeField(field: string, row: SoldPosition, trade: Trade, universe: Universe): string {
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
          row.sellDate = trade.sell_date ?? '';
          return '';
        }
        break;
      case 'buyDate':
        tradeField = 'buy_date';
        if (!this.isDateRangeValid(row.buyDate, row.sellDate, 'buyDate')) {
          this.messageService.add({ severity: 'error', summary: 'Invalid Date', detail: 'Buy date cannot be after sell date.' });
          // revert row.buyDate to previous value
          row.buyDate = trade.buy_date ?? '';
          return '';
        }
        break;
      default:
        break;
    }
    return tradeField;
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
}
