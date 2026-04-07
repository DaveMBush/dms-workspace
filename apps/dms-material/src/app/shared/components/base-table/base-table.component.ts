import { ListRange, SelectionModel } from '@angular/cdk/collections';
import {
  CdkVirtualScrollViewport,
  ScrollingModule,
} from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ContentChild,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { debounceTime } from 'rxjs';

import { SortColumn } from '../../services/sort-column.interface';
import { ColumnDef } from './column-def.interface';

function compareNonNullValues(aVal: unknown, bVal: unknown): number {
  if (typeof aVal === 'string' && typeof bVal === 'string') {
    return aVal.localeCompare(bVal);
  }
  const a = aVal as number;
  const b = bVal as number;
  if (a < b) {
    return -1;
  }
  return a > b ? 1 : 0;
}

function compareValues(aVal: unknown, bVal: unknown): number {
  const aNull = aVal === null || aVal === undefined;
  const bNull = bVal === null || bVal === undefined;
  if (aNull) {
    return bNull ? 0 : -1;
  }
  if (bNull) {
    return 1;
  }
  return compareNonNullValues(aVal, bVal);
}

@Component({
  selector: 'dms-base-table',
  imports: [
    CommonModule,
    ScrollingModule,
    MatTableModule,
    MatSortModule,
    MatProgressBarModule,
    MatCheckboxModule,
  ],
  templateUrl: './base-table.component.html',
  styleUrl: './base-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BaseTableComponent<T extends { id: string }>
  implements AfterViewInit
{
  private static readonly superscripts = [
    '',
    '\u00B9',
    '\u00B2',
    '\u00B3',
    '\u2074',
    '\u2075',
    '\u2076',
    '\u2077',
    '\u2078',
    '\u2079',
  ];

  // Inputs
  data = input.required<T[]>(); // Signal-based data input
  columns = input.required<ColumnDef[]>();
  tableLabel = input<string>('Data table');
  rowHeight = input<number>(52);
  bufferSize = input<number>(10);
  selectable = input<boolean>(false);
  multiSelect = input<boolean>(false);
  loading = input<boolean>(false);
  sortColumns = input<SortColumn[]>([]);

  // Outputs
  readonly sortChange = output<Sort>();
  readonly rowClick = output<T>();
  readonly selectionChange = output<T[]>();
  readonly renderedRangeChange = output<ListRange>();

  // ViewChild for virtual scroll viewport
  viewport = viewChild<CdkVirtualScrollViewport>('viewport');
  private readonly matSort = viewChild(MatSort);

  // Internal state
  selection = new SelectionModel<T>(true, []);
  private sortState = signal<Sort | null>(null);
  private destroyRef = inject(DestroyRef);
  private lastShiftKey = false;

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Required for computed signal
  readonly activeSortColumn = computed(() => {
    const columns = this.sortColumns();
    return columns.length > 0 ? columns[0].column : '';
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Required for computed signal
  readonly activeSortDirection = computed(() => {
    const columns = this.sortColumns();
    return columns.length > 0 ? columns[0].direction : '';
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Required for computed signal
  readonly sortRankMap = computed(() => {
    const columns = this.sortColumns();
    const map: Record<string, string> = {};
    for (let i = 0; i < columns.length; i++) {
      const rank = i + 1;
      const sup =
        rank < BaseTableComponent.superscripts.length
          ? BaseTableComponent.superscripts[rank]
          : String(rank);
      const arrow = columns[i].direction === 'asc' ? '\u2191' : '\u2193';
      map[columns[i].column] = sup + arrow;
    }
    return map;
  });

  constructor() {
    const el = inject(ElementRef).nativeElement as HTMLElement;
    const self = this;

    function captureShiftKey(event: MouseEvent): void {
      self.lastShiftKey = event.shiftKey;
    }

    el.addEventListener('click', captureShiftKey, true);
    this.destroyRef.onDestroy(function removeShiftListener() {
      el.removeEventListener('click', captureShiftKey, true);
    });

    // Track dataSource changes so the effect is reactive to data/sort updates
    effect(
      // eslint-disable-next-line @smarttools/no-anonymous-functions -- Required for effect
      () => {
        const context = this;
        // Read the signal to track it — Angular 21 zoneless signals schedule
        // view updates automatically; markForCheck() is not needed here and
        // would add a redundant CD cycle on every scroll-triggered recompute
        context.dataSource();
      }
    );

    // Initialize sortState from sortColumns input for restored state
    effect(
      // eslint-disable-next-line @smarttools/no-anonymous-functions -- Required for effect
      () => {
        const columns = this.sortColumns();
        if (columns.length > 0) {
          this.sortState.set({
            active: columns[0].column,
            direction: columns[0].direction,
          });
        } else {
          this.sortState.set(null);
        }
      }
    );
  }

  ngAfterViewInit(): void {
    const viewportValue = this.viewport();
    if (viewportValue) {
      viewportValue.renderedRangeStream
        .pipe(debounceTime(100), takeUntilDestroyed(this.destroyRef))
        .subscribe(
          function emitRange(this: BaseTableComponent<T>, range: ListRange) {
            this.renderedRangeChange.emit(range);
          }.bind(this)
        );
    }
    // In zoneless Angular, MatSort.ngOnChanges() fires _stateChanges.next()
    // when [matSortActive]/[matSortDirection] bindings are set. However,
    // MatSortHeader.ngOnInit() subscribes to _stateChanges AFTER that event
    // fires (parent inputs bind before child ngOnInit), so headers miss the
    // notification and never update their aria-sort attribute.
    // Triggering _stateChanges.next() here (after all child ngOnInit have run)
    // ensures sort headers re-evaluate and render the correct aria-sort value.
    const matSortRef = this.matSort();
    if (matSortRef !== undefined && this.sortColumns().length > 0) {
      // eslint-disable-next-line no-underscore-dangle -- Intentional: notifies MatSortHeaders after ngOnInit subscribes
      matSortRef._stateChanges.next();
    }
  }

  // Helper to check if row has expired property
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- needed for proper typing
  isExpired$ = (row: T): boolean => {
    return (
      'expired' in row && (row as T & { expired?: boolean }).expired === true
    );
  };

  // Helper to read gainLossType from a row when present
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- needed for proper typing
  gainLossType$ = (row: T): 'gain' | 'loss' | 'neutral' | undefined => {
    if ('gainLossType' in row) {
      return (row as T & { gainLossType?: 'gain' | 'loss' | 'neutral' })
        .gainLossType;
    }
    return undefined;
  };

  // Returns an ngClass-compatible map from the row's gainLossType to avoid
  // triple evaluation of gainLossType$ per change-detection cycle.
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- needed for proper typing
  gainLossClassMap$ = (row: T): Record<string, boolean> => {
    const type = this.gainLossType$(row);
    return {
      gain: type === 'gain',
      loss: type === 'loss',
      neutral: type === 'neutral',
    };
  };

  // Data source - reactive to data() and sortColumns() changes
  dataSource = computed(
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Required for computed signal
    () => {
      const rows = [...this.data()];
      const columns = this.sortColumns();
      if (columns.length === 0) {
        return rows;
      }
      return rows.sort(function compareBySortColumns(
        a: Record<string, unknown>,
        b: Record<string, unknown>
      ): number {
        for (let i = 0; i < columns.length; i++) {
          const col = columns[i];
          const cmp = compareValues(a[col.column], b[col.column]);
          if (cmp !== 0) {
            return col.direction === 'desc' ? -cmp : cmp;
          }
        }
        return 0;
      } as (a: T, b: T) => number);
    }
  );

  displayedColumns = computed(
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Required for computed signal
    () => {
      const context = this;
      const columnsValue = context.columns();
      const cols = columnsValue.map(function getField(c) {
        return c.field;
      });
      const selectableValue = context.selectable();
      if (selectableValue) {
        return ['select', ...cols];
      }
      return cols;
    }
  );

  filterColumns = computed(
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Required for computed signal
    () => {
      const context = this;
      const columnsValue = context.columns();
      const cols = columnsValue.map(function getFilterField(c) {
        return c.field + 'Filter';
      });
      const selectableValue = context.selectable();
      if (selectableValue) {
        return ['selectFilter', ...cols];
      }
      return cols;
    }
  );

  @ContentChild('cellTemplate') cellTemplate?: TemplateRef<unknown>;
  @ContentChild('filterRowTemplate') filterRowTemplate?: TemplateRef<unknown>;

  getLastShiftKey(): boolean {
    const value = this.lastShiftKey;
    this.lastShiftKey = false;
    return value;
  }

  onSort(sort: Sort): void {
    this.sortState.set(sort);
    this.sortChange.emit(sort);
  }

  onRowClick(row: T): void {
    this.rowClick.emit(row);
  }

  toggleSelection(row: T): void {
    this.selection.toggle(row);
    this.selectionChange.emit(this.selection.selected);
  }

  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource().length;
    return numSelected === numRows && numRows > 0;
  }

  toggleAllRows(): void {
    const allSelected = this.isAllSelected();
    if (allSelected) {
      this.selection.clear();
    } else {
      this.selection.select(...this.dataSource());
    }
    this.selectionChange.emit(this.selection.selected);
  }

  trackByFn(index: number, item: T): string {
    return item?.id ?? `__empty_${String(index)}`;
  }

  scrollToTop(): void {
    const viewportValue = this.viewport();
    if (viewportValue) {
      viewportValue.scrollToIndex(0);
    }
  }
}
