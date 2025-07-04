import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { selectClosedPositions, selectTrades } from '../store/trades/trade.selectors';
import { RowProxyDelete } from '@smarttools/smart-signals';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { FormsModule } from '@angular/forms';
import { Trade } from '../store/trades/trade.interface';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { signal } from '@angular/core';
import { selectUniverses } from '../../store/universe/universe.selectors';

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
  positions = selectClosedPositions;
  toastMessages = signal<{ severity: string; summary: string; detail: string }[]>([]);
  constructor(private messageService: MessageService) {}
  trash(position: SoldPosition) {
    const trades = selectTrades();
    for (let i = 0; i < trades.length; i++) {
      const trade = trades[i];
      if (trade.id === position.id) {
        (trade as RowProxyDelete).delete!();
      }
    }
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

  onEditCommit(row: SoldPosition, field: string) {
    const trades = selectTrades();
    for (let i = 0; i < trades.length; i++) {
      if (trades[i].id === row.id) {
        let tradeField = field;
        if (field === 'sellDate') {
          tradeField = 'sell_date';
          if (!this.isDateRangeValid(row.buyDate, row.sellDate, 'sellDate')) {
            this.messageService.add({ severity: 'error', summary: 'Invalid Date', detail: 'Sell date cannot be before buy date.' });
            row.sellDate = trades[i].sell_date ? new Date(trades[i].sell_date as string).toISOString() : '';
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
            row.buyDate = trades[i].buy_date ? new Date(trades[i].buy_date as string).toISOString() : '';
            return;
          }
        }
        const trade = trades[i];
        (trade as Record<keyof Trade, unknown>)[tradeField as keyof Trade] = row[field as keyof SoldPosition];
        break;
      }
    }
  }

  stopArrowKeyPropagation(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.stopPropagation();
    }
  }
}
