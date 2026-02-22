import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { BaseTableComponent } from '../../shared/components/base-table/base-table.component';
import { ColumnDef } from '../../shared/components/base-table/column-def.interface';
import { ClosedPosition } from '../../store/trades/closed-position.interface';
import { SoldPositionsComponentService } from './sold-positions-component.service';

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
export class SoldPositionsComponent {
  private readonly soldPositionsService = inject(SoldPositionsComponentService);

  startDate = signal<string | null>(null);
  endDate = signal<string | null>(null);

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  readonly displayedPositions = computed(() =>
    this.soldPositionsService.selectSoldPositions()
  );

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

  onCellEdit(__: ClosedPosition, ___: string, ____: unknown): void {
    // Update via SmartNgRX
  }
}
