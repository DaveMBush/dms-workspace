import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Sort } from '@angular/material/sort';

import { BaseTableComponent } from '../../shared/components/base-table/base-table.component';
import { ColumnDef } from '../../shared/components/base-table/column-def.interface';
import { SortFilterStateService } from '../../shared/services/sort-filter-state.service';
import { createSymbolFilterManager } from '../../shared/utils/create-symbol-filter-manager.function';
import { handleSortChange } from '../../shared/utils/handle-sort-change.function';
import { initSearchText } from '../../shared/utils/init-search-text.function';
import { initSortColumns } from '../../shared/utils/init-sort-columns.function';
import { SymbolFilterManager } from '../../shared/utils/symbol-filter-manager.interface';
import { ClosedPosition } from '../../store/trades/closed-position.interface';
import { SoldPositionsComponentService } from './sold-positions-component.service';

function isNullOrUndefined(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

function compareFieldValues(aVal: unknown, bVal: unknown): number {
  if (isNullOrUndefined(aVal)) {
    return isNullOrUndefined(bVal) ? 0 : -1;
  }
  if (isNullOrUndefined(bVal)) {
    return 1;
  }
  if (typeof aVal === 'string' && typeof bVal === 'string') {
    return aVal.localeCompare(bVal);
  }
  if (typeof aVal === 'number' && typeof bVal === 'number') {
    return aVal - bVal;
  }
  // eslint-disable-next-line @typescript-eslint/no-base-to-string -- fallback for remaining field types
  return String(aVal).localeCompare(String(bVal));
}

@Component({
  selector: 'dms-sold-positions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BaseTableComponent, MatFormFieldModule, MatInputModule],
  templateUrl: './sold-positions.component.html',
  styleUrl: './sold-positions.component.scss',
  host: { class: 'block h-full w-full' },
})
export class SoldPositionsComponent implements OnDestroy {
  private static readonly tableKey = 'trades-closed';
  private readonly soldPositionsService = inject(SoldPositionsComponentService);
  private readonly sortFilterStateService = inject(SortFilterStateService);

  searchText = initSearchText(
    this.sortFilterStateService,
    SoldPositionsComponent.tableKey
  );

  sortColumns$ = initSortColumns(
    this.sortFilterStateService,
    SoldPositionsComponent.tableKey
  );

  visibleRange = signal<{ start: number; end: number }>({
    start: 0,
    end: 50,
  });

  private readonly symbolFilterManager: SymbolFilterManager =
    createSymbolFilterManager(
      this.searchText,
      this.sortFilterStateService,
      SoldPositionsComponent.tableKey
    );

  ngOnDestroy(): void {
    this.symbolFilterManager.cleanup();
  }

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  readonly displayedPositions = computed(() => {
    const positions = this.soldPositionsService.selectSoldPositions();
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
        const cmp = compareFieldValues(a[field], b[field]);
        if (cmp !== 0) {
          return col.direction === 'asc' ? cmp : -cmp;
        }
      }
      return 0;
    });
  });

  onRangeChange(range: { start: number; end: number }): void {
    this.visibleRange.set(range);
    this.soldPositionsService.visibleRange.set(range);
  }

  onSymbolFilterChange(value: string): void {
    this.symbolFilterManager.onSymbolFilterChange(value);
  }

  onSortChange(sort: Sort): void {
    handleSortChange(
      sort,
      this.sortColumns$,
      this.sortFilterStateService,
      SoldPositionsComponent.tableKey
    );
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
}
