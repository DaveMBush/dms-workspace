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
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { debounceTime } from 'rxjs';

import { SortColumn } from '../../services/sort-column.interface';
import { ColumnDef } from './column-def.interface';

/**
 * SCROLLING REGRESSION HISTORY — DO NOT SIMPLIFY THIS CODE:
 * Epic 29: rowHeight mismatch → CDK scroll height calculated incorrectly
 * Epic 31: contain:strict on sticky header → jump on CDK viewport recalculation
 * Epic 44: CSS transitions + extra CD cycles → CDK recalculated mid-animation
 * Epic 60: isLoading=true rows filtered → array shrinks → CDK shrinks total height → scroll jumps
 * Epic 64: Edge case follow-up to Epic 60 (excludeLoadingRows re-introduced the bug)
 * Epic 87: Same root cause as Epic 60/64 but on account-panel screens (Open Positions,
 *   Sold Positions, Dividend Deposits). Those screens used symbol: '' (empty string) as
 *   the SmartNgRX placeholder, while Universe already used symbol: '\u2026'. A rapid
 *   scroll triggered lazy-load in-flight windows where placeholder rows with blank symbols
 *   were visible. Fix (Story 87.2): change placeholder symbol from '' to '\u2026' in all
 *   three account-panel component services, matching the Universe screen pattern.
 * Epic 101: contain:paint on .virtual-scroll-viewport (base-table.component.scss) caused
 *   slow-scroll sticky header drift on all five CDK virtual-scroll hosts (Universe, Open
 *   Positions, Sold Positions, Dividend Deposits, Screener). CSS Containment Level 2
 *   (Chrome 114+, Firefox 109+) changed contain:paint to imply contain:layout, creating
 *   an independent formatting context. Combined with CDK's transform:translateY() on
 *   .cdk-virtual-scroll-content-wrapper, the browser's sticky resolver computed anchor
 *   offsets in the transformed coordinate space during 4px/step slow scroll, producing
 *   header-scrolls-with-content and header-under-header artifacts. Fix (Story 101.2):
 *   removed contain:paint from .virtual-scroll-viewport; overflow:auto/hidden already
 *   provides the equivalent paint boundary without the layout-containment side-effect.
 * Epic 105: Story 105.1 added a slow-scroll regression spec
 *   (scrolling-regression-105.spec.ts) to capture "header-under-header" artifacts
 *   (sticky header sliding above the viewport top) on context-change. Live-DOM
 *   diagnostic (Story 105.2) confirmed that th.mat-mdc-header-cell (position:sticky;
 *   top:0) remained correctly anchored at viewportTop in both baseline and after
 *   account/filter changes. The 6/16 test failures were caused by the spec measuring
 *   tr.mat-mdc-header-row (position:static, natural-flow y = viewportTop - scrollTop)
 *   instead of the actual sticky element; at any scrollTop > PIXEL_TOLERANCE the check
 *   viewportTop - tr.y = scrollTop > 2 produced a false violation.
 *   Fix (Story 105.2): changed HEADER_ROW_SELECTOR from 'tr.mat-mdc-header-row' to
 *   'th.mat-mdc-header-cell' so the spec correctly measures the sticky-positioned cell.
 *   Additionally added contextId = input<string|null>() to BaseTableComponent: screen
 *   components bind a key that changes on every account- or filter-change, and an effect
 *   calls scrollToIndex(0) on key change — resetting viewport scroll position to the top
 *   for clean UX after a context switch. See SCROLLING REGRESSION HISTORY in
 *   base-table.component.scss for the CSS-side constraints.
 *
 * Structural constraints:
 *   1. CDK virtual scroll requires a STABLE array length. SmartNgRX marks rows
 *      isLoading=true during in-flight requests; filtering those rows out shrinks the
 *      array and causes CDK to recalculate total height, jumping the viewport. Always
 *      keep placeholder/loading rows in the array. Placeholder rows must use a non-empty
 *      symbol (e.g. '\u2026') so blank-cell regression guards do not false-positive.
 *   2. .virtual-scroll-viewport MUST be a scroll container (overflow-y:auto) but MUST
 *      NOT apply layout containment (contain:layout or any shorthand that implies it).
 *      CDK positions visible rows via transform:translateY on the content-wrapper;
 *      position:sticky on <th> elements must anchor to the scrollport, not the
 *      transformed subtree. Any layout containment on the viewport breaks this.
 */

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

  // Inputs
  data = input.required<T[]>(); // Signal-based data input
  columns = input.required<ColumnDef[]>();
  tableLabel = input<string>('Data table');
  rowHeight = input<number>(57);
  bufferSize = input<number>(10);
  selectable = input<boolean>(false);
  multiSelect = input<boolean>(false);
  loading = input<boolean>(false);
  sortColumns = input<SortColumn[]>([]);
  // See SCROLLING REGRESSION HISTORY — Epic 105: bind a key that changes on every
  // account- or filter-change to force a scroll reset before Angular Material
  // re-measures sticky row heights on the new dataset.
  contextId = input<string | null>(null);

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
  private prevCtxId: string | null = null;

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Required for computed signal
  readonly activeSortColumn = computed(
    () => this.sortColumns()[0]?.column ?? ''
  );

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

    // See SCROLLING REGRESSION HISTORY — Epic 105.
    // Reset the CDK viewport to scrollTop=0 whenever the contextId changes to a
    // non-null value. This forces a clean layout state before Angular Material
    // re-measures sticky header row heights on the new dataset, preventing
    // header-scrolls-with-content and header-under-header artifacts.
    //
    // We track the previous value so we can skip the initial binding — firing
    // scrollToTop() on the very first (non-null) value would interfere with
    // tests that navigate to a pre-scrolled position immediately after mount.
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
    // Triggering _stateChanges here (after all child ngOnInit have run)
    // ensures sort headers re-evaluate and render the correct aria-sort value.
    if (this.sortColumns().length > 0) {
      this.notifySortHeadersOfRestoredState();
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

  // Returns an ngClass-compatible map from the row's gainLossType to avoid
  // triple evaluation of gainLossType$ per change-detection cycle.
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- needed for proper typing
  gainLossClassMap$ = (row: T): Record<string, boolean> => {
    const t = this.gainLossType$(row);
    return { gain: t === 'gain', loss: t === 'loss', neutral: t === 'neutral' };
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
        // Rows flagged as loading (placeholders) always sort to the end so that
        // real data is visible at the correct sorted positions.  This prevents
        // the sort+lazy-load mismatch where placeholder rows with empty fields
        // move to the top/bottom of the sorted list and the user sees only
        // empty rows when scrolling.
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
    try {
      this.viewport()?.scrollToIndex(0);
    } catch {
      /* no-op – scrollTo absent in JSDOM */
    }
  }

  // Fail-soft wrapper around the undocumented MatSort._stateChanges subject.
  // Isolating access here means a future Angular Material upgrade that renames
  // or removes _stateChanges only needs a single-point fix.
  private notifySortHeadersOfRestoredState(): void {
    // Use Reflect.get with a string key to access the semi-private _stateChanges
    // subject without triggering no-underscore-dangle lint rules, and to fail
    // soft (returns undefined) if Angular Material ever removes this property.
    const subject = Reflect.get(this.matSort() ?? {}, '_stateChanges') as
      | { next?(): void }
      | undefined;
    subject?.next?.();
  }
}
