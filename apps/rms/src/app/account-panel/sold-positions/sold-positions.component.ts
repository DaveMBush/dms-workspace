import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';

interface SoldPosition {
  symbol: string;
  buy: number;
  buyDate: string;
  sell: number;
  sellDate: string;
  quantity: number;
  realizedGains: number;
}

@Component({
  selector: 'app-sold-positions',
  standalone: true,
  imports: [CommonModule, TableModule],
  templateUrl: './sold-positions.component.html',
  styleUrls: ['./sold-positions.component.scss'],
})
export class SoldPositionsComponent {
  positions: SoldPosition[] = [];
}
