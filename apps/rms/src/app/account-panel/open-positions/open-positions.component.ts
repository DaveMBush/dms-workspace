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
import { OpenPosition } from '../../store/trades/open-position.interface';
import { Trade } from '../../store/trades/trade.interface';
import { selectUniverses } from '../../store/universe/selectors/select-universes.function';
import { Universe } from '../../store/universe/universe.interface';
import { OpenPositionsComponentService } from './open-positions-component.service';
import { OpenPositionsStorageService } from './open-positions-storage.service';


@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'rms-open-positions',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, InputNumberModule, DatePickerModule, FormsModule, ToastModule],
  templateUrl: './open-positions.component.html',
  styleUrls: ['./open-positions.component.scss'],
  viewProviders: [OpenPositionsComponentService, OpenPositionsStorageService],
})
export class OpenPositionsComponent {
  private scrollTopSignal = signal(0);
  private openPositionsService = inject(OpenPositionsComponentService);
  private currentAccountSignalStore = inject(currentAccountSignalStore);
  private storageService = inject(OpenPositionsStorageService);
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
      // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
      filteredPositions = [...filteredPositions].sort((a, b) => this.comparePositions(a, b, sortField, sortOrder));
    }

    return filteredPositions;
  });

  toastMessages = signal<{ severity: string; summary: string; detail: string }[]>([]);
  private messageService = inject(MessageService);
  symbolFilter = signal<string>(this.storageService.loadSymbolFilter());

  // Sort state signals
  private sortField = signal<string>(this.storageService.loadSortField());
  private sortOrder = signal<number>(this.storageService.loadSortOrder());

  // Sort signals for UI
  readonly sortSignals = {
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
    buyDateSortIcon$: computed(() => this.getSortIcon('buyDate')),
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
    buyDateSortOrder$: computed(() => this.getSortOrder('buyDate')),
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
    unrealizedGainPercentSortIcon$: computed(() => this.getSortIcon('unrealizedGainPercent')),
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
    unrealizedGainPercentSortOrder$: computed(() => this.getSortOrder('unrealizedGainPercent')),
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
    unrealizedGainSortIcon$: computed(() => this.getSortIcon('unrealizedGain')),
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
    unrealizedGainSortOrder$: computed(() => this.getSortOrder('unrealizedGain'))
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
    this.storageService.saveSymbolFilter(this.symbolFilter());
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

    this.storageService.saveSortState(this.sortField(), this.sortOrder());
  }

  /**
   * Gets the sort icon for a given field
   */
  private getSortIcon(field: string): string {
    const currentField = this.sortField();
    const order = this.sortOrder();
    if (currentField === field) {
      return order === 1 ? 'pi pi-sort-up' : 'pi pi-sort-down';
    }
    return 'pi pi-sort';
  }

  /**
   * Gets the sort order display for a given field
   */
  private getSortOrder(field: string): string {
    const currentField = this.sortField();
    const order = this.sortOrder();
    if (currentField === field) {
      return order === 1 ? '1' : '2';
    }
    return '';
  }

    /**
   * Compares two positions for sorting
   */
  private comparePositions(a: OpenPosition, b: OpenPosition, sortField: string, sortOrder: number): number {
    const values = this.getSortValues(a, b, sortField);
    if (values === null) {
      return 0;
    }

    const { aValue, bValue } = values;
    return this.compareValues(aValue, bValue, sortOrder);
  }

  /**
   * Gets the values to compare for a given sort field
   */
  private getSortValues(a: OpenPosition, b: OpenPosition, sortField: string): { aValue: unknown; bValue: unknown } | null {
    switch (sortField) {
      case 'buyDate':
        return { aValue: a.buyDate, bValue: b.buyDate };
      case 'unrealizedGainPercent':
        return { aValue: a.unrealizedGainPercent, bValue: b.unrealizedGainPercent };
      case 'unrealizedGain':
        return { aValue: a.unrealizedGain, bValue: b.unrealizedGain };
      default:
        return null;
    }
  }

  /**
   * Compares two values and returns the appropriate sort result
   */
  private compareValues(aValue: unknown, bValue: unknown, sortOrder: number): number {
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
    switch (field) {
      case 'sell':
        return this.validateSellField(row, universe);
      case 'sellDate':
        return this.validateSellDateField(row, trade, universe);
      case 'buyDate':
        return this.validateBuyDateField(row, trade);
      default:
        return field;
    }
  }

  private validateSellField(row: OpenPosition, universe: Universe): string {
    universe.most_recent_sell_price = row.sell;
    return 'sell';
  }

  private validateSellDateField(row: OpenPosition, trade: Trade, universe: Universe): string {
    if (!this.storageService.isDateRangeValid(row.buyDate, row.sellDate, 'sellDate')) {
      this.messageService.add({ severity: 'error', summary: 'Invalid Date', detail: 'Sell date cannot be before buy date.' });
      this.revertSellDate(row, trade);
      return '';
    }

    this.updateUniverseSellDate(row, universe);
    return 'sell_date';
  }

  private validateBuyDateField(row: OpenPosition, trade: Trade): string {
    if (!this.storageService.isDateRangeValid(row.buyDate, row.sellDate, 'buyDate')) {
      this.messageService.add({ severity: 'error', summary: 'Invalid Date', detail: 'Buy date cannot be after sell date.' });
      this.revertBuyDate(row, trade);
      return '';
    }
    return 'buy_date';
  }

  private revertSellDate(row: OpenPosition, trade: Trade): void {
    row.sellDate = (trade.sell_date !== undefined) ? new Date(trade.sell_date) : undefined;
  }

  private revertBuyDate(row: OpenPosition, trade: Trade): void {
    row.buyDate = trade.buy_date ? new Date(trade.buy_date) : new Date();
  }

  private updateUniverseSellDate(row: OpenPosition, universe: Universe): void {
    if (universe.most_recent_sell_date !== null && universe.most_recent_sell_date !== undefined) {
      if (row.sellDate && row.sellDate > new Date(universe.most_recent_sell_date)) {
        universe.most_recent_sell_date = row.sellDate?.toISOString() ?? null;
      }
    } else {
      universe.most_recent_sell_date = row.sellDate?.toISOString() ?? null;
    }
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

  tableRef = viewChild('tableRef', { read: ElementRef });

  private getScrollContainer(): HTMLElement | null {
    const tableEl = this.tableRef()?.nativeElement as HTMLElement;
    return tableEl?.querySelector('.p-datatable-table-container');
  }

}
