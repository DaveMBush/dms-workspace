import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Sort } from '@angular/material/sort';
import { ActivatedRoute } from '@angular/router';

import { BaseTableComponent } from '../../shared/components/base-table/base-table.component';
import { ColumnDef } from '../../shared/components/base-table/column-def.interface';
import { EditableCellComponent } from '../../shared/components/editable-cell/editable-cell.component';
import { EditableDateCellComponent } from '../../shared/components/editable-date-cell/editable-date-cell.component';
import { SortFilterStateService } from '../../shared/services/sort-filter-state.service';
import { createSymbolFilterManager } from '../../shared/utils/create-symbol-filter-manager.function';
import { handleSortChange } from '../../shared/utils/handle-sort-change.function';
import { initSearchText } from '../../shared/utils/init-search-text.function';
import { initSortColumns } from '../../shared/utils/init-sort-columns.function';
import { SymbolFilterManager } from '../../shared/utils/symbol-filter-manager.interface';
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
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    EditableCellComponent,
    EditableDateCellComponent,
  ],
  templateUrl: './open-positions.component.html',
  styleUrl: './open-positions.component.scss',
  host: { class: 'block h-full w-full' },
})
export class OpenPositionsComponent implements OnDestroy {
  private static readonly tableKey = 'trades-open';
  readonly openPositionsService = inject(OpenPositionsComponentService);
  private readonly sortFilterStateService = inject(SortFilterStateService);
  // Inject route to get accountId from URL
  private route = inject(ActivatedRoute);
  // Inject MatDialog for add position dialog
  private dialog = inject(MatDialog);

  searchText = initSearchText(
    this.sortFilterStateService,
    OpenPositionsComponent.tableKey
  );

  sortColumns$ = initSortColumns(
    this.sortFilterStateService,
    OpenPositionsComponent.tableKey
  );

  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  visibleRange = signal<{ start: number; end: number }>({
    start: 0,
    end: 50,
  });

  private readonly symbolFilterManager: SymbolFilterManager =
    createSymbolFilterManager(
      this.searchText,
      this.sortFilterStateService,
      OpenPositionsComponent.tableKey
    );

  ngOnDestroy(): void {
    this.symbolFilterManager.cleanup();
  }

  onSymbolFilterChange(value: string): void {
    this.symbolFilterManager.onSymbolFilterChange(value);
  }

  onRangeChange(range: { start: number; end: number }): void {
    this.visibleRange.set(range);
    this.openPositionsService.visibleRange.set(range);
  }

  onSortChange(sort: Sort): void {
    handleSortChange(
      sort,
      this.sortColumns$,
      this.sortFilterStateService,
      OpenPositionsComponent.tableKey
    );
  }

  // Writable signal for trades (populated from SmartNgRX or set directly in tests)
  // Apply client-side symbol filter and sort
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would obscure this
  readonly selectOpenPositions$ = computed(() => {
    const positions = this.openPositionsService.selectOpenPositions();
    const search = this.searchText().toLowerCase().trim();
    const sortCols = this.sortColumns$();

    const filtered = search
      ? positions.filter(function filterBySymbol(p) {
          return p.symbol.toLowerCase().includes(search);
        })
      : positions;

    if (sortCols.length === 0) {
      return filtered;
    }

    return [...filtered].sort(function sortPositions(a, b) {
      for (const col of sortCols) {
        const field = col.column as keyof typeof a;
        const aVal = a[field];
        const bVal = b[field];
        let cmp = 0;
        if (aVal === null || aVal === undefined) {
          cmp = bVal === null || bVal === undefined ? 0 : -1;
        } else if (bVal === null || bVal === undefined) {
          cmp = 1;
        } else if (aVal instanceof Date && bVal instanceof Date) {
          cmp = aVal.getTime() - bVal.getTime();
        } else if (typeof aVal === 'number' && typeof bVal === 'number') {
          cmp = aVal - bVal;
        } else {
          cmp = String(aVal).localeCompare(String(bVal));
        }
        if (cmp !== 0) {
          return col.direction === 'asc' ? cmp : -cmp;
        }
      }
      return 0;
    });
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

  onBuyDateChange(position: OpenPosition, newDate: Date | null): void {
    if (newDate === null) {
      // Buy date cannot be cleared; ignore the event
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
