import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import {
  MatDatepickerInputEvent,
  MatDatepickerModule,
} from '@angular/material/datepicker';
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
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
  ],
  templateUrl: './sold-positions.component.html',
  styleUrl: './sold-positions.component.scss',
})
export class SoldPositionsComponent {
  private readonly soldPositionsService = inject(SoldPositionsComponentService);

  startDate = signal<string | null>(null);
  endDate = signal<string | null>(null);

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  readonly startDateAsDate = computed(() => {
    const dateStr = this.startDate();
    if (dateStr === null) {
      return null;
    }
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  readonly endDateAsDate = computed(() => {
    const dateStr = this.endDate();
    if (dateStr === null) {
      return null;
    }
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  readonly displayedPositions = computed(() => {
    const positions = this.soldPositionsService.selectSoldPositions();
    const start = this.startDate();
    const end = this.endDate();
    if (start === null && end === null) {
      return positions;
    }
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
    return positions.filter((position: ClosedPosition) => {
      if (position.sell_date === undefined) {
        return false;
      }
      const sellDateStr = position.sell_date.split('T')[0];
      if (start !== null && sellDateStr < start) {
        return false;
      }
      if (end !== null && sellDateStr > end) {
        return false;
      }
      return true;
    });
  });

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

  onStartDateChange(event: MatDatepickerInputEvent<Date>): void {
    const date = event.value;
    if (date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      this.startDate.set(`${year}-${month}-${day}`);
    } else {
      this.startDate.set(null);
    }
  }

  onEndDateChange(event: MatDatepickerInputEvent<Date>): void {
    const date = event.value;
    if (date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      this.endDate.set(`${year}-${month}-${day}`);
    } else {
      this.endDate.set(null);
    }
  }

  clearFilters(): void {
    this.startDate.set(null);
    this.endDate.set(null);
  }
}
