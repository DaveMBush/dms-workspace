import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy,Component, ElementRef, inject, signal,viewChild, computed  } from '@angular/core';
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
import { OpenPosition } from './open-position.interface';
import { OpenPositionsComponentService } from './open-positions-component.service';

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
  private readonly FILTERS_STORAGE_KEY = 'open-positions-filters';
  private scrollTopSignal = signal(0);
  private openPositionsService = inject(OpenPositionsComponentService);
  private currentAccountSignalStore = inject(currentAccountSignalStore);
  positions$ = computed(() => {
    const rawPositions = this.openPositionsService.selectOpenPositions();
    const symbolFilter = this.symbolFilter();

    // Apply symbol filter
    if (symbolFilter && symbolFilter.trim() !== '') {
      return rawPositions.filter(function filterSymbol(position) {
        return position.symbol.toLowerCase().includes(symbolFilter.toLowerCase());
      });
    }

    return rawPositions;
  });
  toastMessages = signal<{ severity: string; summary: string; detail: string }[]>([]);
  private messageService = inject(MessageService);
  symbolFilter = signal<string>(this.loadSymbolFilter());
  trash(position: OpenPosition): void {
    this.openPositionsService.deleteOpenPosition(position);
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
          row.sellDate = trade.sell_date !== undefined ? new Date(trade.sell_date).toISOString() : '';
          return '';
        }
        if (universe.most_recent_sell_date !== null || row.sellDate > universe.most_recent_sell_date!) {
          universe.most_recent_sell_date = row.sellDate;
        }
        break;
      case 'buyDate':
        tradeField = 'buy_date';
        if (!this.isDateRangeValid(row.buyDate, row.sellDate, 'buyDate')) {
          this.messageService.add({ severity: 'error', summary: 'Invalid Date', detail: 'Buy date cannot be after sell date.' });
          // revert row.buyDate to previous value
          row.buyDate = trade.buy_date ? new Date(trade.buy_date).toISOString() : '';
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
      localStorage.setItem(`${this.FILTERS_STORAGE_KEY}-${accountId}-symbolFilter`, JSON.stringify(value));
    } catch (error) {
      console.warn('Failed to save symbol filter to localStorage:', error);
    }
  }

  /**
   * Loads symbol filter from localStorage
   */
  private loadSymbolFilter(): string {
    try {
      const currentAccount = selectCurrentAccountSignal(this.currentAccountSignalStore);
      const accountId = currentAccount().id;
      const saved = localStorage.getItem(`${this.FILTERS_STORAGE_KEY}-${accountId}-symbolFilter`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'string') {
          return parsed;
        }
      }
    } catch (error) {
      console.warn('Failed to load symbol filter from localStorage:', error);
    }
    return ''; // Default value if nothing is saved or an error occurs
  }

  /**
   * Handles symbol filter changes and saves to localStorage
   */
  protected onSymbolFilterChange(): void {
    this.saveSymbolFilter(this.symbolFilter());
  }
}
