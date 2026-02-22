import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute } from '@angular/router';

import { BaseTableComponent } from '../../shared/components/base-table/base-table.component';
import { ColumnDef } from '../../shared/components/base-table/column-def.interface';
import { EditableCellComponent } from '../../shared/components/editable-cell/editable-cell.component';
import { EditableDateCellComponent } from '../../shared/components/editable-date-cell/editable-date-cell.component';
import { OpenPosition } from '../../store/trades/open-position.interface';
import { Trade } from '../../store/trades/trade.interface';
import { OpenPositionsComponentService } from './open-positions-component.service';
import { isPositive, isValidDate, isValidNumber } from './position-validators';
@Component({
  selector: 'dms-open-positions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    BaseTableComponent,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    EditableCellComponent,
    EditableDateCellComponent,
  ],
  templateUrl: './open-positions.component.html',
  styleUrl: './open-positions.component.scss',
})
export class OpenPositionsComponent {
  readonly openPositionsService = inject(OpenPositionsComponentService);
  // Inject route to get accountId from URL
  private route = inject(ActivatedRoute);
  // Inject MatDialog for add position dialog
  private dialog = inject(MatDialog);

  searchText = signal<string>('');
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  // Writable signal for trades (populated from SmartNgRX or set directly in tests)
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would obscure this
  readonly selectOpenPositions$ = computed(() => {
    const positions = this.openPositionsService.selectOpenPositions();
    const search = this.searchText().trim().toLowerCase();
    if (!search) {
      return positions;
    }
    const filterBySymbol = function filterBySymbol(p: OpenPosition): boolean {
      return p.symbol.toLowerCase().includes(search);
    };
    return positions.filter(filterBySymbol);
  });

  columns: ColumnDef[] = [
    { field: 'symbol', header: 'Symbol', sortable: false, width: '80px' },
    { field: 'exDate', header: 'Ex-Date', type: 'date' },
    { field: 'buy', header: 'Buy', type: 'currency', editable: true },
    {
      field: 'buyDate',
      header: 'Buy Date',
      type: 'date',
      sortable: true,
      editable: true,
      width: '130px',
    },
    { field: 'quantity', header: 'Quantity', type: 'number', editable: true },
    { field: 'expectedYield', header: 'Expected $', type: 'currency' },
    { field: 'lastPrice', header: 'Last $', type: 'currency' },
    {
      field: 'unrealizedGainPercent',
      header: 'Unrlz Gain %',
      type: 'number',
      sortable: true,
    },
    {
      field: 'unrealizedGain',
      header: 'Unrlz Gain$',
      type: 'currency',
      sortable: true,
    },
    { field: 'sell', header: 'Sell', type: 'currency', editable: true },
    {
      field: 'sellDate',
      header: 'Sell Date',
      type: 'date',
      editable: true,
      width: '130px',
    },
    { field: 'daysHeld', header: 'Days Held', type: 'number' },
    { field: 'targetGain', header: 'Target Gain', type: 'number' },
    { field: 'targetSell', header: 'Target Sell', type: 'currency' },
    { field: 'actions', header: '', sortable: false, width: '50px' },
  ];

  /**
   * Edit handlers - use SmartNgRX proxy mutation pattern.
   * Get actual Trade from SmartArray, mutate it directly.
   * SmartNgRX automatically detects mutation and persists to backend.
   */

  onBuyChange(position: OpenPosition, newValue: number): void {
    if (!isValidNumber(newValue) || !isPositive(newValue)) {
      this.errorMessage.set('Buy price must be a valid positive number');
      return;
    }
    const trade = this.findTradeById(position.id);
    if (trade) {
      trade.buy = newValue;
    }
  }

  onBuyDateChange(position: OpenPosition, newDate: Date): void {
    // Use local date components to avoid timezone offset issues
    const year = newDate.getFullYear();
    const month = String(newDate.getMonth() + 1).padStart(2, '0');
    const day = String(newDate.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    if (!isValidDate(dateString)) {
      this.errorMessage.set('Invalid date format');
      return;
    }
    const trade = this.findTradeById(position.id);
    if (trade) {
      trade.buy_date = dateString;
    }
  }

  onQuantityChange(position: OpenPosition, newValue: number): void {
    if (!isValidNumber(newValue) || !isPositive(newValue)) {
      this.errorMessage.set('Quantity must be a valid positive number');
      return;
    }
    const trade = this.findTradeById(position.id);
    if (trade) {
      trade.quantity = newValue;
    }
  }

  onSellChange(position: OpenPosition, newValue: number): void {
    if (!isValidNumber(newValue)) {
      this.errorMessage.set('Sell price must be a valid positive number');
      return;
    }
    const trade = this.findTradeById(position.id);
    if (trade) {
      trade.sell = newValue;
    }
  }

  onSellDateChange(position: OpenPosition, newDate: Date | null): void {
    const trade = this.findTradeById(position.id);
    if (!trade) {
      return;
    }

    if (newDate === null) {
      trade.sell_date = undefined;
      return;
    }
    // Use local date components to avoid timezone offset issues
    const year = newDate.getFullYear();
    const month = String(newDate.getMonth() + 1).padStart(2, '0');
    const day = String(newDate.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    if (!isValidDate(dateString)) {
      this.errorMessage.set('Invalid date format');
      return;
    }
    trade.sell_date = dateString;
  }

  onDeletePosition(position: OpenPosition): void {
    const confirmed = confirm(`Delete position for ${position.symbol}?`);
    if (confirmed) {
      this.openPositionsService.deleteOpenPosition(position);
    }
  }

  /**
   * Find the actual Trade object from SmartArray by position ID.
   */
  private findTradeById(positionId: string): Trade | undefined {
    const trades = this.openPositionsService.trades();
    for (let i = 0; i < trades.length; i++) {
      if (trades[i].id === positionId) {
        return trades[i];
      }
    }
    return undefined;
  }
}
