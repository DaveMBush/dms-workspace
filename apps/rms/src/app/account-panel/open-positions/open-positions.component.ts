import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';

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
  positions: OpenPosition[] = [
    {
      symbol: 'AAPL',
      exDate: '2024-06-01',
      buy: 150.25,
      buyDate: '2024-05-15',
      quantity: 100,
      expectedYield: 250.5,
      sell: 0,
      sellDate: '',
      daysHeld: 10,
      targetGain: 0.1,
      targetSell: 165.0,
    },
  ];
}
