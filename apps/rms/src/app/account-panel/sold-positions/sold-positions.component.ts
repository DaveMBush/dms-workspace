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
import { Trade } from '../../store/trades/trade.interface';
import { selectUniverses } from '../../store/universe/selectors/select-universes.function';
import { Universe } from '../../store/universe/universe.interface';
import { SoldPositionsComponentService } from './sold-positions-component.service';
import { SoldPositionsStorageService } from './sold-positions-storage.service';

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
  viewProviders: [SoldPositionsStorageService],
})
export class SoldPositionsComponent {
  private soldPositionsService = inject(SoldPositionsComponentService);
  private currentAccountSignalStore = inject(currentAccountSignalStore);
  private storageService = inject(SoldPositionsStorageService);

  // Sort state signals
  private sortField = signal<string>(this.storageService.loadSortField());
  private sortOrder = signal<number>(this.storageService.loadSortOrder());

  // Filter signals
  symbolFilter = signal<string>(this.storageService.loadSymbolFilter());

  // Sort signals for UI
  readonly sortSignals = {
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
    sellDateSortIcon$: computed(() => {
      const field = this.sortField();
      const order = this.sortOrder();
      if (field === 'sellDate') {
        return order === 1 ? 'pi pi-sort-up' : 'pi pi-sort-down';
      }
      return 'pi pi-sort';
    }),
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
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
      // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
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

    this.storageService.saveSortState(this.sortField(), this.sortOrder());
  }

  /**
   * Handles symbol filter changes and saves to localStorage
   */
  protected onSymbolFilterChange(): void {
    this.storageService.saveSymbolFilter(this.symbolFilter());
  }

  protected onEditCommit(row: SoldPosition, field: string): void {
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
    switch (field) {
      case 'sell':
        universe.most_recent_sell_price = row.sell;
        return 'sell';
      case 'sellDate':
        if (!this.storageService.isDateRangeValid(row.buyDate, row.sellDate, 'sellDate')) {
          this.messageService.add({ severity: 'error', summary: 'Invalid Date', detail: 'Sell date cannot be before buy date.' });
          row.sellDate = trade.sell_date ?? '';
          return '';
        }
        return 'sell_date';
      case 'buyDate':
        if (!this.storageService.isDateRangeValid(row.buyDate, row.sellDate, 'buyDate')) {
          this.messageService.add({ severity: 'error', summary: 'Invalid Date', detail: 'Buy date cannot be after sell date.' });
          row.buyDate = trade.buy_date ?? '';
          return '';
        }
        return 'buy_date';
      default:
        return field;
    }
  }


}
