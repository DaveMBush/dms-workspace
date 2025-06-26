import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { selectOpenPositions } from '../store/trades/trade.selectors';

interface OpenPosition {
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
  imports: [CommonModule, TableModule],
  templateUrl: './open-positions.component.html',
  styleUrls: ['./open-positions.component.scss'],
})
export class OpenPositionsComponent {
  positions = selectOpenPositions;
}
