/* eslint-disable vitest/no-disabled-tests, sonarjs/no-skipped-tests -- TDD RED phase:
   the mat-table markup assertions below are intentionally skipped until Story 1.2
   rewrites the template; they must pass unmodified once that lands (see
   check-no-skipped-tests.sh). */
import { ListRange } from '@angular/cdk/collections';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import {
  ComponentFixture,
  discardPeriodicTasks,
  fakeAsync,
  flushMicrotasks,
  TestBed,
} from '@angular/core/testing';
import { Subject } from 'rxjs';
import { BaseTableComponent } from './base-table.component';
import { ColumnDef } from './column-def.interface';

describe('BaseTableComponent', () => {
  let component: BaseTableComponent<{ id: string; name: string }>;
  let fixture: ComponentFixture<
    BaseTableComponent<{ id: string; name: string }>
  >;

  const columns: ColumnDef[] = [
    { field: 'name', header: 'Name', sortable: true },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BaseTableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BaseTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('columns', columns);
  });

  it('should compute displayed columns', () => {
    expect(component.displayedColumns()).toContain('name');
  });

  it('should include select column when selectable', () => {
    fixture.componentRef.setInput('selectable', true);
    expect(component.displayedColumns()).toContain('select');
  });

  it('should emit sortChange on sort', () => {
    const spy = vi.spyOn(component.sortChange, 'emit');
    component.onSort({ active: 'name', direction: 'asc' });
    expect(spy).toHaveBeenCalled();
  });

  it('should emit rowClick on row click', () => {
    const spy = vi.spyOn(component.rowClick, 'emit');
    component.onRowClick({ id: '1', name: 'Test' });
    expect(spy).toHaveBeenCalledWith({ id: '1', name: 'Test' });
  });

  it('should toggle selection', () => {
    const row = { id: '1', name: 'Test' };
    component.toggleSelection(row);
    expect(component.selection.isSelected(row)).toBe(true);
  });

  it('should track by id', () => {
    expect(component.trackByFn(0, { id: '123', name: 'Test' })).toBe('123');
  });

  it('should render header cells with dms-header-cell class and columnheader role for column header styling (regression: AS.9 Bug #1)', () => {
    // Regression: .dms-header-cell[role="columnheader"] must have background-color: var(--dms-surface)
    // so that cell backgrounds remain opaque and do not "ghost" (become transparent) during scroll.
    // The fix is purely CSS — verified here by confirming the table header renders correctly
    // so that the CSS selectors will apply in a real browser context.
    fixture.componentRef.setInput('data', []);
    fixture.detectChanges();
    const headerCells = fixture.nativeElement.querySelectorAll(
      '.dms-header-cell[role="columnheader"]',
    );
    expect(headerCells.length).toBeGreaterThan(0);
  });

  // Story 112.2 — Layout regression fixes (R1/R2: scrollbar pinning; R3: column fill)

  it('should render a dms-outer-scroller wrapper element for viewport-width vertical scrollbar (R1/R2 fix)', () => {
    // R1/R2: vertical scrollbar must be on a full-width outer wrapper (not on the CDK viewport)
    // so it stays pinned to the right edge of the screen instead of scrolling with content.
    fixture.componentRef.setInput('data', []);
    fixture.detectChanges();
    const outerScroller = fixture.nativeElement.querySelector(
      '.dms-outer-scroller',
    );
    expect(outerScroller).not.toBeNull();
  });

  it('should nest cdk-virtual-scroll-viewport inside dms-outer-scroller (R1/R2 fix)', () => {
    // R1/R2: CDK viewport must be a descendant of the outer scroller so CDK
    // delegates scroll events to the outer element via cdkVirtualScrollingElement.
    fixture.componentRef.setInput('data', []);
    fixture.detectChanges();
    const outerScroller = fixture.nativeElement.querySelector(
      '.dms-outer-scroller',
    );
    const cdkViewport = fixture.nativeElement.querySelector(
      'cdk-virtual-scroll-viewport',
    );
    expect(outerScroller).not.toBeNull();
    expect(cdkViewport).not.toBeNull();
    expect(outerScroller.contains(cdkViewport)).toBe(true);
  });

  it('should include a flex spacer at end of column header row so it fills full available width (R3 fix)', () => {
    // R3: a .dms-col-spacer (flex:1) at the end of each row absorbs spare horizontal space
    // so the row always spans the full container width regardless of defined column widths.
    // Column cells keep exact [style.width.px] bindings so header/body parity is maintained;
    // the spacer provides the background fill without altering column widths.
    fixture.componentRef.setInput('data', []);
    fixture.detectChanges();
    const columnHeaderRow = fixture.nativeElement.querySelector(
      '.dms-column-header-row',
    );
    expect(columnHeaderRow).not.toBeNull();
    const spacer = columnHeaderRow.querySelector('.dms-col-spacer');
    expect(spacer).not.toBeNull();
  });

  it('should include a flex spacer at end of each body row so it fills full available width (R3 fix)', fakeAsync(() => {
    // R3: a .dms-col-spacer (flex:1) at the end of each body row absorbs spare horizontal
    // space so every row spans the full container width and the beyond-table area has a
    // consistent background (together with AC4 background-color on .dms-body-row).
    fixture.componentRef.setInput('data', [{ id: '1', name: 'Test Row' }]);
    fixture.detectChanges();
    // CdkVirtualScrollViewport.ngOnInit defers all setup (scroll-strategy attach +
    // rendered-range calculation) to a Promise microtask running outside NgZone.
    // Flushing microtasks lets CDK complete initialization: attach scroll strategy →
    // setRenderedRange({start:0,end:1}) → markForCheck on the OnPush viewport.
    // The subsequent detectChanges triggers CdkVirtualForOf.ngDoCheck which calls
    // applyChanges() → createEmbeddedView() to insert the body-row template into the DOM.
    flushMicrotasks();
    fixture.detectChanges();
    const bodyRows = fixture.nativeElement.querySelectorAll(
      '.dms-body-row[role="row"]',
    );
    expect(bodyRows.length).toBeGreaterThan(0);
    bodyRows.forEach((row: HTMLElement) => {
      const spacer = row.querySelector('.dms-col-spacer');
      expect(spacer).not.toBeNull();
    });
    discardPeriodicTasks();
  }));
});

// TDD RED Phase: Tests for Story AX.1 - renderedRangeChange output
// These tests define expected behavior for viewport range tracking.
// Story AX.2 implements the functionality and re-enables these tests.
describe('BaseTableComponent - Rendered Range Tracking', () => {
  let component: BaseTableComponent<{ id: string; name: string }>;
  let fixture: ComponentFixture<
    BaseTableComponent<{ id: string; name: string }>
  >;
  let rangeSubject: Subject<ListRange>;

  const columns: ColumnDef[] = [
    { field: 'name', header: 'Name', sortable: true },
  ];

  beforeEach(async () => {
    rangeSubject = new Subject<ListRange>();

    await TestBed.configureTestingModule({
      imports: [BaseTableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BaseTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('columns', columns);
    fixture.componentRef.setInput('data', [
      { id: '1', name: 'Row 1' },
      { id: '2', name: 'Row 2' },
    ]);

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function mockViewport(): void {
    const mockViewportRef = {
      renderedRangeStream: rangeSubject.asObservable(),
    } as unknown as CdkVirtualScrollViewport;

    Object.defineProperty(component, 'viewport', {
      value: function viewportSignal() {
        return mockViewportRef;
      },
    });
  }

  it('should subscribe to viewport renderedRangeStream in ngAfterViewInit', () => {
    mockViewport();
    fixture.detectChanges();

    const spy = vi.spyOn(component.renderedRangeChange, 'emit');
    rangeSubject.next({ start: 0, end: 10 });
    vi.advanceTimersByTime(100);

    expect(spy).toHaveBeenCalled();
  });

  it('should emit renderedRangeChange when viewport range changes', () => {
    mockViewport();
    fixture.detectChanges();

    const emitted: ListRange[] = [];
    component.renderedRangeChange.subscribe(function captureRange(
      range: ListRange,
    ) {
      emitted.push(range);
    });

    rangeSubject.next({ start: 0, end: 10 });
    vi.advanceTimersByTime(100);

    expect(emitted).toEqual([{ start: 0, end: 10 }]);
  });

  it('should debounce range emissions by 100ms', () => {
    mockViewport();
    fixture.detectChanges();

    const emitted: ListRange[] = [];
    component.renderedRangeChange.subscribe(function captureRange(
      range: ListRange,
    ) {
      emitted.push(range);
    });

    rangeSubject.next({ start: 0, end: 10 });
    vi.advanceTimersByTime(50);
    rangeSubject.next({ start: 5, end: 15 });
    vi.advanceTimersByTime(50);
    rangeSubject.next({ start: 10, end: 20 });
    vi.advanceTimersByTime(100);

    // Only the last emission within the debounce window should come through
    expect(emitted).toEqual([{ start: 10, end: 20 }]);
  });

  it('should cleanup subscription on destroy', () => {
    mockViewport();
    fixture.detectChanges();

    const spy = vi.spyOn(component.renderedRangeChange, 'emit');

    fixture.destroy();

    rangeSubject.next({ start: 0, end: 10 });
    vi.advanceTimersByTime(100);

    expect(spy).not.toHaveBeenCalled();
  });

  it('should handle undefined viewport gracefully', () => {
    // Do not mock viewport — leave it as undefined
    fixture.detectChanges();

    const spy = vi.spyOn(component.renderedRangeChange, 'emit');
    vi.advanceTimersByTime(100);

    expect(spy).not.toHaveBeenCalled();
  });

  // AX.14: Single data item edge case
  it('should emit range for single data item', () => {
    fixture.componentRef.setInput('data', [{ id: '1', name: 'Only Row' }]);
    mockViewport();
    fixture.detectChanges();

    const emitted: ListRange[] = [];
    component.renderedRangeChange.subscribe(function captureRange(
      range: ListRange,
    ) {
      emitted.push(range);
    });

    rangeSubject.next({ start: 0, end: 1 });
    vi.advanceTimersByTime(100);

    expect(emitted).toEqual([{ start: 0, end: 1 }]);
  });

  // AX.14: Scroll to end of dataset
  it('should emit range at end of dataset', () => {
    const data = Array.from({ length: 100 }, function createRow(_, i) {
      return { id: String(i), name: `Row ${i}` };
    });
    fixture.componentRef.setInput('data', data);
    mockViewport();
    fixture.detectChanges();

    const emitted: ListRange[] = [];
    component.renderedRangeChange.subscribe(function captureRange(
      range: ListRange,
    ) {
      emitted.push(range);
    });

    rangeSubject.next({ start: 90, end: 100 });
    vi.advanceTimersByTime(100);

    expect(emitted).toEqual([{ start: 90, end: 100 }]);
  });

  // AX.14: Scroll to end then back to beginning
  it('should emit correct ranges when scrolling to end then back to beginning', () => {
    const data = Array.from({ length: 100 }, function createRow(_, i) {
      return { id: String(i), name: `Row ${i}` };
    });
    fixture.componentRef.setInput('data', data);
    mockViewport();
    fixture.detectChanges();

    const emitted: ListRange[] = [];
    component.renderedRangeChange.subscribe(function captureRange(
      range: ListRange,
    ) {
      emitted.push(range);
    });

    // Scroll to end
    rangeSubject.next({ start: 90, end: 100 });
    vi.advanceTimersByTime(100);

    // Scroll back to beginning
    rangeSubject.next({ start: 0, end: 10 });
    vi.advanceTimersByTime(100);

    expect(emitted).toEqual([
      { start: 90, end: 100 },
      { start: 0, end: 10 },
    ]);
  });

  // AX.14: Empty data array
  it('should emit range even with empty data array', () => {
    fixture.componentRef.setInput('data', []);
    mockViewport();
    fixture.detectChanges();

    const emitted: ListRange[] = [];
    component.renderedRangeChange.subscribe(function captureRange(
      range: ListRange,
    ) {
      emitted.push(range);
    });

    rangeSubject.next({ start: 0, end: 0 });
    vi.advanceTimersByTime(100);

    expect(emitted).toEqual([{ start: 0, end: 0 }]);
  });
});

// Story 1.1 — behavior guards for the mat-table conversion (Story 1.2).
// These guard behaviors that MUST survive the rewrite: sort cycling, row /
// select-all selection, and default cell rendering by column type. They pass
// against the current two-region DIV implementation AND must keep passing after
// Story 1.2 — so they are NOT skipped (AC #6). Selectors use [data-column] and
// public handlers only, never bespoke class names that the rewrite may change.
describe('BaseTableComponent - mat-table behavior guards (Story 1.2)', () => {
  let component: BaseTableComponent<{ id: string; name: string }>;
  let fixture: ComponentFixture<
    BaseTableComponent<{ id: string; name: string }>
  >;

  const columns: ColumnDef[] = [
    { field: 'name', header: 'Name', sortable: true },
    { field: 'value', header: 'Value' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BaseTableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BaseTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('columns', columns);
    fixture.componentRef.setInput('data', [{ id: '1', name: 'Row One' }]);
  });

  it('should cycle sort asc → desc → clear across repeated header clicks (AC #3)', () => {
    const spy = vi.spyOn(component.sortChange, 'emit');
    // onHeaderClick reads the parent-fed sortColumns input to decide the next
    // direction; mirror a real host by feeding back each emitted state.
    component.onHeaderClick(columns[0]);
    expect(spy).toHaveBeenLastCalledWith({ active: 'name', direction: 'asc' });
    fixture.componentRef.setInput('sortColumns', [
      { column: 'name', direction: 'asc' },
    ]);

    component.onHeaderClick(columns[0]);
    expect(spy).toHaveBeenLastCalledWith({ active: 'name', direction: 'desc' });
    fixture.componentRef.setInput('sortColumns', [
      { column: 'name', direction: 'desc' },
    ]);

    component.onHeaderClick(columns[0]);
    expect(spy).toHaveBeenLastCalledWith({ active: '', direction: '' });
  });

  it('should render the sort-rank badge in a sortable header when sortColumns is set (AC #3)', () => {
    fixture.componentRef.setInput('sortColumns', [
      { column: 'name', direction: 'asc' },
    ]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    // Rank 1 ascending renders the superscript "¹" plus a sort-rank indicator.
    expect(el.textContent?.includes('¹')).toBe(true);
    // Select by the stable data-testid hook, not the bespoke class name, so this
    // guard survives the mat-table rewrite (Story 1.2).
    expect(el.querySelector('[data-testid="sort-rank"]')).not.toBeNull();
  });

  it('should set aria-sort on the primary sorted column header and clear it elsewhere (AC #2)', () => {
    fixture.componentRef.setInput('sortColumns', [
      { column: 'name', direction: 'asc' },
    ]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    // The first [data-column] match for a column is its header cell (the header
    // region precedes the body in both the current layout and the mat-table
    // rewrite), so this reads the rendered aria-sort binding on the header.
    expect(
      el.querySelector('[data-column="name"]')?.getAttribute('aria-sort'),
    ).toBe('ascending');
    // A non-primary column carries no aria-sort attribute at all.
    expect(
      el.querySelector('[data-column="value"]')?.getAttribute('aria-sort'),
    ).toBeNull();

    fixture.componentRef.setInput('sortColumns', [
      { column: 'name', direction: 'desc' },
    ]);
    fixture.detectChanges();
    expect(
      el.querySelector('[data-column="name"]')?.getAttribute('aria-sort'),
    ).toBe('descending');
  });

  it('should toggle row selection and emit the selected rows (AC #4)', () => {
    fixture.componentRef.setInput('selectable', true);
    const spy = vi.spyOn(component.selectionChange, 'emit');
    const row = component.dataSource()[0];
    component.toggleSelection(row);
    expect(component.selection.isSelected(row)).toBe(true);
    expect(spy).toHaveBeenCalledWith([row]);
  });

  it('should select all rows via toggleAllRows when multiSelect is enabled (AC #4)', () => {
    fixture.componentRef.setInput('selectable', true);
    fixture.componentRef.setInput('multiSelect', true);
    const spy = vi.spyOn(component.selectionChange, 'emit');
    component.toggleAllRows();
    const rows = component.dataSource();
    expect(component.selection.selected).toHaveLength(rows.length);
    expect(spy).toHaveBeenCalledWith(rows);
  });

  it('should render default cell content for currency, date, number and text column types (AC #6)', fakeAsync(() => {
    fixture.componentRef.setInput('columns', [
      { field: 'price', header: 'Price', type: 'currency' },
      { field: 'asOf', header: 'As Of', type: 'date' },
      { field: 'qty', header: 'Qty', type: 'number' },
      { field: 'name', header: 'Name' },
    ] as ColumnDef[]);
    fixture.componentRef.setInput('data', [
      {
        id: '1',
        name: 'Row One',
        price: 100,
        asOf: new Date(2025, 7, 20),
        qty: 42,
      } as unknown as { id: string; name: string },
    ]);
    fixture.detectChanges();
    // CDK virtual scroll defers body-row creation to a microtask (see the R3
    // spacer test above); flush it so the row + cells are in the DOM.
    flushMicrotasks();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    // Every cell (header and body) carries [data-column] in both the current
    // DIV layout and the mat-table rewrite, so collect all matches per column
    // and assert that SOME of them hold the formatted body value. This avoids
    // depending on element type (<th>/<td> vs <div>) or bespoke cell classes,
    // which is what lets this guard survive Story 1.2 (AC #6).
    const cellTexts = (col: string): string[] =>
      [...el.querySelectorAll(`[data-column="${col}"]`)].map(
        (c) => c.textContent?.trim() ?? '',
      );
    // currency → formatted with digits; date → contains the year digits.
    expect(cellTexts('price').some((t) => /\d/.test(t))).toBe(true);
    expect(cellTexts('asOf').some((t) => /\d/.test(t))).toBe(true);
    // number → a cell renders exactly the integer value (header is "Qty").
    expect(cellTexts('qty').some((t) => /^\d+$/.test(t))).toBe(true);
    // text → raw value rendered verbatim.
    expect(cellTexts('name')).toContain('Row One');
    discardPeriodicTasks();
  }));

  // --- mat-table markup assertions (TDD RED phase) -------------------------
  // These assert the NEW <table mat-table> structure that does not exist yet, so
  // they are skipped until Story 1.2 lands; after it they must pass without
  // modification. Re-enable by removing each .skip marker (Story 1.2, Task 1).
  // They live in this active describe (not a standalone all-skipped one) because
  // vitest errors with "No test found in suite" when a describe has only skips.

  it.skip('should render a single <table mat-table> and remove the old two-region markers (AC #1)', fakeAsync(() => {
    fixture.detectChanges();
    // CDK virtual scroll defers body-row creation to a microtask; flush so the
    // body row + cells are in the DOM before asserting on them.
    flushMicrotasks();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    // A real <table> element carrying the Material table directive (AC #1).
    expect(el.querySelector('table[mat-table]')).not.toBeNull();
    // The new mat-table structure is present (AC #1): column defs, header cells,
    // body cells and a body row.
    expect(el.querySelector('[matColumnDef]')).not.toBeNull();
    expect(el.querySelector('th[mat-header-cell]')).not.toBeNull();
    expect(el.querySelector('td[mat-cell]')).not.toBeNull();
    expect(el.querySelector('tr[mat-row]')).not.toBeNull();
    // The bespoke two-region DIV structure must be gone (AC #1).
    expect(el.querySelector('.dms-table-shell')).toBeNull();
    expect(el.querySelector('.dms-table-header-viewport')).toBeNull();
    expect(el.querySelector('.dms-table-header')).toBeNull();
    expect(el.querySelector('.dms-outer-scroller')).toBeNull();
    expect(el.querySelector('.dms-table-scroll-container')).toBeNull();
    discardPeriodicTasks();
  }));

  it.skip('should render one header cell per column with data-column and the column header text (AC #1, #8)', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const nameHeader = el.querySelector('th[data-column="name"]');
    expect(nameHeader).not.toBeNull();
    expect((nameHeader as HTMLElement).textContent?.trim()).toBe('Name');
    const valueHeader = el.querySelector('th[data-column="value"]');
    expect(valueHeader).not.toBeNull();
    expect((valueHeader as HTMLElement).textContent?.trim()).toBe('Value');
  });

  it.skip('should render a body row with role=row, one cell per column (AC #1, #7, #8)', fakeAsync(() => {
    fixture.detectChanges();
    flushMicrotasks();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    // Scope to mat-row: Material emits role="row" on header rows too, so a bare
    // tr[role=row] count would include the header and be 2 after Story 1.2.
    const rows = el.querySelectorAll('tr[mat-row]');
    expect(rows).toHaveLength(1);
    const row = rows[0] as HTMLElement;
    // Each column renders a body cell carrying its data-column attribute.
    expect(row.querySelector('[data-column="name"]')).not.toBeNull();
    expect(row.querySelector('[data-column="value"]')).not.toBeNull();
    discardPeriodicTasks();
  }));

  it.skip('should wrap the table in a cdk-virtual-scroll-viewport and remove the flex spacer (AC #5)', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    // The mat-table must live inside the virtual scroll viewport.
    expect(
      el.querySelector('cdk-virtual-scroll-viewport table'),
    ).not.toBeNull();
    // The bespoke flex spacer that padded the DIV rows is gone (AC #5).
    expect(el.querySelector('.dms-col-spacer')).toBeNull();
  });

  it.skip('should emit sortChange with ascending direction when a sortable column header is clicked (AC #3)', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const spy = vi.spyOn(component.sortChange, 'emit');
    const nameHeader = el.querySelector('th[data-column="name"]')!;
    expect(nameHeader).not.toBeNull();
    nameHeader.click();
    expect(spy).toHaveBeenCalledWith({ active: 'name', direction: 'asc' });
  });

  it.skip('should render a per-row checkbox in the select column when selectable (AC #4)', fakeAsync(() => {
    fixture.componentRef.setInput('selectable', true);
    fixture.detectChanges();
    flushMicrotasks();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('td input[type="checkbox"]')).not.toBeNull();
    discardPeriodicTasks();
  }));

  it.skip('should render a select-all checkbox in the header when multiSelect is enabled (AC #4)', () => {
    fixture.componentRef.setInput('selectable', true);
    fixture.componentRef.setInput('multiSelect', true);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('th input[type="checkbox"]')).not.toBeNull();
  });
});
