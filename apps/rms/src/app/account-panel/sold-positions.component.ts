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
  template: `
    <p-table
      [value]="positions"
      class="min-w-full border border-gray-200 rounded-lg shadow-sm"
      [responsiveLayout]="'scroll'"
    >
      <ng-template pTemplate="header">
        <tr class="bg-gray-100">
          <th class="px-2 py-2">Symbol</th>
          <th class="px-2 py-2">Buy</th>
          <th class="px-2 py-2">Buy Date</th>
          <th class="px-2 py-2">Sell</th>
          <th class="px-2 py-2">Sell Date</th>
          <th class="px-2 py-2">Quantity</th>
          <th class="px-2 py-2">Realized Gains</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-row>
        <tr>
          <td class="px-2 py-1">{{ row.symbol }}</td>
          <td class="px-2 py-1">{{ row.buy }}</td>
          <td class="px-2 py-1">{{ row.buyDate }}</td>
          <td class="px-2 py-1">{{ row.sell }}</td>
          <td class="px-2 py-1">{{ row.sellDate }}</td>
          <td class="px-2 py-1">{{ row.quantity }}</td>
          <td class="px-2 py-1">{{ row.realizedGains | currency }}</td>
        </tr>
      </ng-template>
    </p-table>
  `,
})
export class SoldPositionsComponent {
  positions: SoldPosition[] = [];
}
