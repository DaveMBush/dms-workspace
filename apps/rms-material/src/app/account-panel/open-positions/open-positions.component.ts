import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { of } from 'rxjs';

import { BaseTableComponent } from '../../shared/components/base-table/base-table.component';
import { ColumnDef } from '../../shared/components/base-table/column-def.interface';
import { Trade } from '../../store/trades/trade.interface';

@Component({
  selector: 'rms-open-positions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BaseTableComponent, FormsModule, MatFormFieldModule, MatInputModule],
  templateUrl: './open-positions.component.html',
  styleUrl: './open-positions.component.scss',
})
export class OpenPositionsComponent implements AfterViewInit {
  @ViewChild(BaseTableComponent) table!: BaseTableComponent<Trade>;

  searchText = '';

  columns: ColumnDef[] = [
    { field: 'universeId', header: 'Symbol', sortable: false, width: '120px' },
    { field: 'exDate', header: 'Ex-Date', type: 'date' },
    { field: 'buy', header: 'Buy', type: 'currency', editable: true },
    { field: 'buy_date', header: 'Buy Date', type: 'date', sortable: true, editable: true },
    { field: 'quantity', header: 'Quantity', type: 'number', editable: true },
    { field: 'expectedValue', header: 'Expected $', type: 'currency' },
    { field: 'lastValue', header: 'Last $', type: 'currency' },
    { field: 'unrealizedGainPercent', header: 'Unrlz Gain %', type: 'number', sortable: true },
    { field: 'unrealizedGain', header: 'Unrlz Gain$', type: 'currency', sortable: true },
    { field: 'sell', header: 'Sell', type: 'currency', editable: true },
    { field: 'sell_date', header: 'Sell Date', type: 'date', editable: true },
    { field: 'daysHeld', header: 'Days Held', type: 'number' },
    { field: 'targetGain', header: 'Target Gain', type: 'number' },
    { field: 'targetSell', header: 'Target Sell', type: 'currency' },
  ];

  ngAfterViewInit(): void {
    this.table.initDataSource(function loadTradesData() {
      // FUTURE: Wire up SmartNgRX trades signal
      // const data = selectTrades();
      const data: Trade[] = [];
      return of({ data, total: data.length });
    });
  }

  onAddPosition(): void {
    // Open new position dialog
  }

  onSellPosition(_: Trade): void {
    // Open sell dialog
  }

  onCellEdit(__: Trade, ___: string, ____: unknown): void {
    // Update via SmartNgRX
  }
}
