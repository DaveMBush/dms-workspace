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
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Sort } from '@angular/material/sort';
import { MatTooltipModule } from '@angular/material/tooltip';
import { debounceTime } from 'rxjs';

import { SortColumn } from '../../services/sort-column.interface';
import { bindHeaderInteractions } from './base-table-scroll.utils';
import { compareValues } from './base-table-sort.utils';
import { ColumnDef } from './column-def.interface';

/**
 * Scrolling guardrails:
 * - Keep placeholder rows in array; shrinking length breaks CDK height math.
 * - Placeholder symbols must stay non-empty (`\u2026`) so blank-row guards stay valid.
 * - `.dms-table-body` delegates vertical scroll detection to `.dms-outer-scroller`.
 * - Never add layout containment to viewport path; CDK uses translated content wrappers.
 * - `contextId` resets scroll position after account/filter swaps.
 * - Header stays above viewport in document flow while body scrollLeft is mirrored into it.
 */

@Component({
  selector: 'dms-base-table',
  imports: [
    CommonModule,
    ScrollingModule,
    MatProgressBarModule,
    MatCheckboxModule,
    MatTooltipModule,
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

  // Default column width in pixels when a column definition omits width.
  // eslint-disable-next-line @typescript-eslint/naming-convention -- UPPER_SNAKE_CASE intentional for class-level constant
  readonly DEFAULT_COLUMN_WIDTH = 100;

  // Width in pixels for the selection checkbox column.
  // eslint-disable-next-line @typescript-eslint/naming-convention -- UPPER_SNAKE_CASE intentional for class-level constant
  readonly SELECT_COLUMN_WIDTH = 48;

  // Inputs
  data = input.required<T[]>();
  columns = input.required<ColumnDef[]>();
  tableLabel = input<string>('Data table');
  rowHeight = input<number>(57);
  bufferSize = input<number>(10);
  selectable = input<boolean>(false);
  multiSelect = input<boolean>(false);
  loading = input<boolean>(false);
  sortColumns = input<SortColumn[]>([]);
  contextId = input<string | null>(null);

  // Outputs
  readonly sortChange = output<Sort>();
  readonly rowClick = output<T>();
  readonly selectionChange = output<T[]>();
  readonly renderedRangeChange = output<ListRange>();

  // ViewChild for virtual scroll viewport
  viewport = viewChild<CdkVirtualScrollViewport>('viewport');

  headerScrollViewport = viewChild<ElementRef<HTMLElement>>(
    'headerScrollViewport'
  );

  outerScroller = viewChild<ElementRef<HTMLElement>>('outerScroller');

  // Internal state
  selection = new SelectionModel<T>(true, []);
  private sortState = signal<Sort | null>(null);
  private destroyRef = inject(DestroyRef);
  private lastShiftKey = false;
  private prevCtxId: string | null = null;

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

    effect(
      // eslint-disable-next-line @smarttools/no-anonymous-functions -- Required for effect
      () => {
        this.dataSource();
      }
    );

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

    effect(
      // eslint-disable-next-line @smarttools/no-anonymous-functions -- Required for effect
      () => {
        const key = this.contextId();
        const prev = this.prevCtxId;
        this.prevCtxId = key;
        if (prev !== null && key !== null) {
          untracked(this.scrollToTop.bind(this));
        }
      }
    );
  }

  ngAfterViewInit(): void {
    const viewportValue = this.viewport();
    const headerScrollViewportValue =
      this.headerScrollViewport()?.nativeElement;
    const bodyHorizontalScrollerValue =
      viewportValue?.elementRef?.nativeElement;
    const outerScrollerValue = this.outerScroller()?.nativeElement;

    if (viewportValue) {
      viewportValue.renderedRangeStream
        .pipe(debounceTime(100), takeUntilDestroyed(this.destroyRef))
        .subscribe(
          function emitRange(this: BaseTableComponent<T>, range: ListRange) {
            this.renderedRangeChange.emit(range);
          }.bind(this)
        );
    }

    if (headerScrollViewportValue && bodyHorizontalScrollerValue) {
      bindHeaderInteractions(
        this.destroyRef,
        headerScrollViewportValue,
        bodyHorizontalScrollerValue,
        outerScrollerValue
      );
    }
  }

  // Helper to check if row has expired property
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- needed for proper typing
  isExpired$ = (row: T): boolean =>
    'expired' in row && (row as T & { expired?: boolean }).expired === true;

  // Helper to add data-is-cef attribute for closed-end fund rows
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- needed for proper typing
  getIsCef$ = (row: T): true | null => {
    // eslint-disable-next-line @typescript-eslint/naming-convention -- DB column name must match database schema
    const r = row as T & { is_closed_end_fund?: boolean };
    return r.is_closed_end_fund === true ? true : null;
  };

  // Helper to add data-has-position attribute for rows with a position > 0
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- needed for proper typing
  getHasPosition$ = (row: T): true | null => {
    const r = row as T & { position?: number };
    return typeof r.position === 'number' && r.position > 0 ? true : null;
  };

  // Helper to read gainLossType from a row when present
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- needed for proper typing
  gainLossType$ = (row: T): 'gain' | 'loss' | 'neutral' | undefined =>
    'gainLossType' in row
      ? (row as T & { gainLossType?: 'gain' | 'loss' | 'neutral' }).gainLossType
      : undefined;

  // Returns an ngClass-compatible map from the row's gainLossType to avoid triple evaluation.
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- needed for proper typing
  gainLossClassMap$ = (row: T): Record<string, boolean> => {
    const t = this.gainLossType$(row);
    return { gain: t === 'gain', loss: t === 'loss', neutral: t === 'neutral' };
  };

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
        const aLoading = a['isLoading'] === true;
        const bLoading = b['isLoading'] === true;
        if (aLoading !== bLoading) {
          return aLoading ? 1 : -1;
        }
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
      const cols = this.columns().map(function getField(c) {
        return c.field;
      });
      if (this.selectable()) {
        return ['select', ...cols];
      }
      return cols;
    }
  );

  filterColumns = computed(
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Required for computed signal
    () => {
      const cols = this.columns().map(function getFilterField(c) {
        return c.field + 'Filter';
      });
      if (this.selectable()) {
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

  onHeaderClick(column: ColumnDef): void {
    if (column.sortable !== true) {
      return;
    }
    const primarySort = this.sortColumns()[0];
    if (primarySort?.column === column.field) {
      if (primarySort.direction === 'asc') {
        this.onSort({ active: column.field, direction: 'desc' });
      } else {
        this.onSort({ active: '', direction: '' });
      }
    } else {
      this.onSort({ active: column.field, direction: 'asc' });
    }
  }

  getAriaSort(column: ColumnDef): string | null {
    const primarySort = this.sortColumns()[0];
    if (primarySort?.column === column.field) {
      return primarySort.direction === 'asc' ? 'ascending' : 'descending';
    }
    return null;
  }

  onRowClick(row: T): void {
    this.rowClick.emit(row);
  }

  toggleSelection(row: T): void {
    this.selection.toggle(row);
    this.selectionChange.emit(this.selection.selected);
  }

  isAllSelected(): boolean {
    const numRows = this.dataSource().length;
    return this.selection.selected.length === numRows && numRows > 0;
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
    try {
      this.viewport()?.scrollToIndex(0);
    } catch {
      /* no-op – scrollTo absent in JSDOM */
    }
  }
}
