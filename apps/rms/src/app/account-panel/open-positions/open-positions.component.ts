import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { selectOpenPositions, selectTrades } from '../store/trades/trade.selectors';
import { RowProxyDelete } from '@smarttools/smart-signals';
import { ButtonModule } from 'primeng/button';

interface OpenPosition {
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
  selector: 'app-open-positions',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule],
  templateUrl: './open-positions.component.html',
  styleUrls: ['./open-positions.component.scss'],
})
export class OpenPositionsComponent {
  positions = selectOpenPositions;
  trash(position: OpenPosition) {
    const trades = selectTrades();
    for (let i = 0; i < trades.length; i++) {
      const trade = trades[i];
      if (trade.id === position.id) {
        (trade as RowProxyDelete).delete!();
      }
    }
  }
}
