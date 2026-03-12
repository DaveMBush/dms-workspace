import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import {
  MatDatepickerInputEvent,
  MatDatepickerModule,
} from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Sort } from '@angular/material/sort';
import { handleSocketNotification } from '@smarttools/smart-signals';

import { BaseTableComponent } from '../../shared/components/base-table/base-table.component';
import { ColumnDef } from '../../shared/components/base-table/column-def.interface';
import { FilterConfig } from '../../shared/services/filter-config.interface';
import { SortFilterStateService } from '../../shared/services/sort-filter-state.service';
import { getAccountIds } from '../../store/accounts/selectors/get-account-ids.function';
import { ClosedPosition } from '../../store/trades/closed-position.interface';
import { SoldPositionsComponentService } from './sold-positions-component.service';

@Component({
  selector: 'dms-sold-positions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BaseTableComponent,
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
  private static readonly tableKey = 'trades-closed';
  private readonly soldPositionsService = inject(SoldPositionsComponentService);
  private readonly sortFilterStateService = inject(SortFilterStateService);

  startDate = signal<string | null>(null);
  endDate = signal<string | null>(null);
  searchText = signal<string>('');
  private symbolFilterTimer: ReturnType<typeof setTimeout> | null = null;

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

  // Server handles filtering, so no client-side filter is applied
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  readonly displayedPositions = computed(() => {
    return this.soldPositionsService.selectSoldPositions();
  });

  onSymbolFilterChange(value: string): void {
    this.searchText.set(value);
    if (this.symbolFilterTimer !== null) {
      clearTimeout(this.symbolFilterTimer);
    }
    this.symbolFilterTimer = setTimeout(
      this.saveSymbolFilterAndNotify.bind(this),
      300
    );
  }

  onSortChange(sort: Sort): void {
    if (sort.direction === '') {
      this.sortFilterStateService.clearSortState(
        SoldPositionsComponent.tableKey
      );
    } else {
      this.sortFilterStateService.saveSortState(
        SoldPositionsComponent.tableKey,
        {
          field: sort.active,
          order: sort.direction,
        }
      );
    }
    handleSocketNotification('accounts', 'update', getAccountIds());
  }

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
    this.saveDateFiltersAndNotify();
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
    this.saveDateFiltersAndNotify();
  }

  clearFilters(): void {
    this.startDate.set(null);
    this.endDate.set(null);
    const symbol = this.searchText();
    if (symbol !== '') {
      this.sortFilterStateService.saveFilterState(
        SoldPositionsComponent.tableKey,
        { symbol }
      );
    } else {
      this.sortFilterStateService.clearFilterState(
        SoldPositionsComponent.tableKey
      );
    }
    handleSocketNotification('accounts', 'update', getAccountIds());
  }

  private buildCurrentFilters(): FilterConfig {
    const filters: FilterConfig = {};
    const start = this.startDate();
    if (start !== null) {
      filters['startDate'] = start;
    }
    const end = this.endDate();
    if (end !== null) {
      filters['endDate'] = end;
    }
    return filters;
  }

  private saveSymbolFilterAndNotify(): void {
    const symbol = this.searchText();
    const filters = this.buildCurrentFilters();
    if (symbol !== '') {
      filters['symbol'] = symbol;
    }
    if (Object.keys(filters).length > 0) {
      this.sortFilterStateService.saveFilterState(
        SoldPositionsComponent.tableKey,
        filters
      );
    } else {
      this.sortFilterStateService.clearFilterState(
        SoldPositionsComponent.tableKey
      );
    }
    handleSocketNotification('accounts', 'update', getAccountIds());
  }

  private saveDateFiltersAndNotify(): void {
    const filters = this.buildCurrentFilters();
    const symbol = this.searchText();
    if (symbol !== '') {
      filters['symbol'] = symbol;
    }
    if (Object.keys(filters).length > 0) {
      this.sortFilterStateService.saveFilterState(
        SoldPositionsComponent.tableKey,
        filters
      );
    } else {
      this.sortFilterStateService.clearFilterState(
        SoldPositionsComponent.tableKey
      );
    }
    handleSocketNotification('accounts', 'update', getAccountIds());
  }
}
