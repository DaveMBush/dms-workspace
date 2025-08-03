import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy,Component, ElementRef, inject, signal,viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RowProxyDelete } from '@smarttools/smart-signals';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';

import { Trade } from '../../store/trades/trade.interface';
import { selectUniverses } from '../../store/universe/selectors/select-universes.function';
import { Universe } from '../../store/universe/universe.interface';
import { SoldPositionsComponentService } from './sold-positions-component.service';

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
  positions$ = this.soldPositionsService.selectClosedPositions;
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
          row.sellDate = (trade.sell_date !== undefined) ? new Date(trade.sell_date).toISOString() : '';
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
          row.buyDate = trade.buy_date ? new Date(trade.buy_date).toISOString() : '';
          return '';
        }
        break;
      default:
        break;
    }
    return tradeField;
  }
}
