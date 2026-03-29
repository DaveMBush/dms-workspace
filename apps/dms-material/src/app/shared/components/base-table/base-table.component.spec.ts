import { ListRange } from '@angular/cdk/collections';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { ComponentFixture, TestBed } from '@angular/core/testing';
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

  it('should render header cells with mat-mdc-header-cell class for scroll border transparency fix (regression: AS.9 Bug #1)', () => {
    // Regression: th.mat-mdc-header-cell must be sticky with background-color: var(--dms-surface)
    // so that when td.mat-mdc-cell also has background-color: var(--dms-surface), borders remain
    // visible and do not "ghost" (become transparent) during scroll in real browsers.
    // The fix is purely CSS — verified here by confirming the table header renders correctly
    // so that the CSS selectors will apply in a real browser context.
    fixture.componentRef.setInput('data', []);
    fixture.detectChanges();
    const headerCells = fixture.nativeElement.querySelectorAll(
      'th.mat-mdc-header-cell'
    );
    expect(headerCells.length).toBeGreaterThan(0);
  });
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

describe('BaseTableComponent - Sort State Restoration', () => {
  let component: BaseTableComponent<{ id: string; name: string }>;
  let fixture: ComponentFixture<
    BaseTableComponent<{ id: string; name: string }>
  >;

  const columns: ColumnDef[] = [
    { field: 'name', header: 'Name', sortable: true },
    { field: 'id', header: 'ID', sortable: true },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BaseTableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BaseTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('columns', columns);
    fixture.componentRef.setInput('data', []);
  });

  it('should derive activeSortColumn from single sortColumns input', () => {
    fixture.componentRef.setInput('sortColumns', [
      { column: 'name', direction: 'asc' },
    ]);
    fixture.detectChanges();

    expect(component.activeSortColumn()).toBe('name');
    expect(component.activeSortDirection()).toBe('asc');
  });

  it('should derive activeSortColumn from first of multiple sortColumns', () => {
    fixture.componentRef.setInput('sortColumns', [
      { column: 'name', direction: 'desc' },
      { column: 'id', direction: 'asc' },
    ]);
    fixture.detectChanges();

    expect(component.activeSortColumn()).toBe('name');
    expect(component.activeSortDirection()).toBe('desc');
  });

  it('should return empty strings when sortColumns is empty', () => {
    fixture.componentRef.setInput('sortColumns', []);
    fixture.detectChanges();

    expect(component.activeSortColumn()).toBe('');
    expect(component.activeSortDirection()).toBe('');
  });
});
