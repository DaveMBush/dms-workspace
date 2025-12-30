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
  selector: 'dms-sold-positions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BaseTableComponent,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './sold-positions.component.html',
  styleUrl: './sold-positions.component.scss',
})
export class SoldPositionsComponent implements AfterViewInit {
  @ViewChild(BaseTableComponent) table!: BaseTableComponent<Trade>;

  searchText = '';

  columns: ColumnDef[] = [
    { field: 'symbol', header: 'Symbol', sortable: false, width: '120px' },
    { field: 'buy', header: 'Buy', type: 'currency', editable: true },
    {
      field: 'buy_date',
      header: 'Buy Date',
      type: 'date',
      sortable: false,
      editable: true,
    },
    { field: 'quantity', header: 'Quantity', type: 'number', editable: true },
    { field: 'sell', header: 'Sell', type: 'currency', editable: true },
    {
      field: 'sell_date',
      header: 'Sell Date',
      type: 'date',
      sortable: true,
      editable: true,
    },
    { field: 'daysHeld', header: 'Days Held', type: 'number' },
    { field: 'capitalGain', header: 'Cap Gains$', type: 'currency' },
    { field: 'capitalGainPercentage', header: 'Cap Gains%', type: 'number' },
  ];

  ngAfterViewInit(): void {
    this.table.initDataSource(function loadSoldTradesData() {
      // FUTURE: Wire up SmartNgRX trades signal (sold filter)
      // const data = selectTrades().filter(t => t.sellDate !== null);
      const data: Trade[] = [];
      return of({ data, total: data.length });
    });
  }

  onCellEdit(__: Trade, ___: string, ____: unknown): void {
    // Update via SmartNgRX
  }
}
