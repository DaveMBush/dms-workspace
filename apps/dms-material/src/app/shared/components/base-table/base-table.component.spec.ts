import { ListRange } from '@angular/cdk/collections';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import {
  ComponentFixture,
  TestBed,
  discardPeriodicTasks,
  fakeAsync,
  flushMicrotasks,
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
      '.dms-header-cell[role="columnheader"]'
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
      '.dms-outer-scroller'
    );
    expect(outerScroller).not.toBeNull();
  });

  it('should nest cdk-virtual-scroll-viewport inside dms-outer-scroller (R1/R2 fix)', () => {
    // R1/R2: CDK viewport must be a descendant of the outer scroller so CDK
    // delegates scroll events to the outer element via cdkVirtualScrollingElement.
    fixture.componentRef.setInput('data', []);
    fixture.detectChanges();
    const outerScroller = fixture.nativeElement.querySelector(
      '.dms-outer-scroller'
    );
    const cdkViewport = fixture.nativeElement.querySelector(
      'cdk-virtual-scroll-viewport'
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
      '.dms-column-header-row'
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
      '.dms-body-row[role="row"]'
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
      range: ListRange
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
      range: ListRange
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
      range: ListRange
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
      range: ListRange
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
      range: ListRange
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
      range: ListRange
    ) {
      emitted.push(range);
    });

    rangeSubject.next({ start: 0, end: 0 });
    vi.advanceTimersByTime(100);

    expect(emitted).toEqual([{ start: 0, end: 0 }]);
  });
});
