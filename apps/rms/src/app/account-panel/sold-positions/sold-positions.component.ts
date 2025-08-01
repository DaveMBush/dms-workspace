import { CommonModule } from '@angular/common';
import { Component, ElementRef, inject, signal,viewChild } from '@angular/core';
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

type EditableTradeField = 'buy' | 'buyDate' | 'quantity' | 'sell' | 'sellDate';

@Component({
  selector: 'app-sold-positions',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, InputNumberModule, DatePickerModule, FormsModule, ToastModule],
  templateUrl: './sold-positions.component.html',
  styleUrls: ['./sold-positions.component.scss'],
})
export class SoldPositionsComponent {
  private soldPositionsService = inject(SoldPositionsComponentService);
  positions = this.soldPositionsService.selectClosedPositions;
  toastMessages = signal<{ severity: string; summary: string; detail: string }[]>([]);
  tableRef = viewChild('tableRef', { read: ElementRef });
  private scrollTopSignal = signal(0);
  constructor(private messageService: MessageService) {}
  trash(position: SoldPosition) {
    const trades = this.soldPositionsService.trades();
    for (let i = 0; i < trades.length; i++) {
      const trade = trades[i];
      if (trade.id === position.id) {
        (trade as RowProxyDelete).delete!();
      }
    }
  }

  trackById(index: number, row: SoldPosition) {
    return row.id;
  }

  private isDateRangeValid(buyDate: unknown, sellDate: unknown, editing: 'buyDate' | 'sellDate'): boolean {
    const buy = buyDate instanceof Date ? buyDate : buyDate ? new Date(buyDate as string) : undefined;
    const sell = sellDate instanceof Date ? sellDate : sellDate ? new Date(sellDate as string) : undefined;
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


  onEditCommit(row: SoldPosition, field: string) {
    const scrollContainer = this.getScrollContainer();
    if (scrollContainer) {
      this.scrollTopSignal.set(scrollContainer.scrollTop);
    }
    const trades = this.soldPositionsService.trades();
    for (let i = 0; i < trades.length; i++) {
      if (trades[i].id === row.id) {
        let tradeField = field;
        if (field === 'sell') {
          const universe = selectUniverses();
          for (let j = 0; j < universe.length; j++) {
            if (universe[j].symbol === row.symbol) {
              universe[j].most_recent_sell_price = row.sell;
              break;
            }
          }
        }
        if (field === 'sellDate') {
          tradeField = 'sell_date';
          if (!this.isDateRangeValid(row.buyDate, row.sellDate, 'sellDate')) {
            this.messageService.add({ severity: 'error', summary: 'Invalid Date', detail: 'Sell date cannot be before buy date.' });
            row.sellDate = trades[i].sell_date ? new Date(trades[i].sell_date!).toISOString() : '';
            return;
          }
          const universe = selectUniverses();
          for (let j = 0; j < universe.length; j++) {
            if (universe[j].symbol === row.symbol) {
              console.log('symbol found');
              if (universe[j].most_recent_sell_date !== null || row.sellDate > universe[j].most_recent_sell_date!) {
                console.log('updating most recent sell date', row.sellDate);
                universe[j].most_recent_sell_date = row.sellDate;
              }
              break;
            }
          }
        }
        if (field === 'buyDate') {
          tradeField = 'buy_date';
          if (!this.isDateRangeValid(row.buyDate, row.sellDate, 'buyDate')) {
            this.messageService.add({ severity: 'error', summary: 'Invalid Date', detail: 'Buy date cannot be after sell date.' });
            row.buyDate = trades[i].buy_date ? new Date(trades[i].buy_date).toISOString() : '';
            return;
          }
        }
        const trade = trades[i];
        (trade as Record<keyof Trade, unknown>)[tradeField as keyof Trade] = row[field as keyof SoldPosition];
        break;
      }
    }
    setTimeout(() => {
      const scrollContainer = this.getScrollContainer();
      if (scrollContainer) {
        scrollContainer.scrollTop = this.scrollTopSignal();
      }
    }, 200);
  }

  stopArrowKeyPropagation(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.stopPropagation();
    }
  }
}
