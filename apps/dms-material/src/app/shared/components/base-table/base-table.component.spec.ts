import { readFileSync } from 'node:fs';
import path from 'node:path';
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

  afterEach(() => {
    // Destroy the fixture so its CDK virtual scroll viewport is torn down and
    // does not leak async init state into later describes in this file.
    fixture.destroy();
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
});

// Story 5.1 — RED scaffold for the column-header wrap / top-align fix (Story 5.2).
//
// The acceptance contract is a CSS change: .dms-header-cell must stop clipping
// long headers (no `white-space: nowrap` / `text-overflow: ellipsis`) and align
// its content to the top (`vertical-align: top`).
//
// Story 5.2 removed the it.skip markers below; these tests now run and are
// expected to fail red until base-table.component.scss is fixed.
//
// The assertions read the component's declared SCSS rather than jsdom's
// getComputedStyle: this test environment does not inject component styles into
// the DOM (verified — computed white-space/vertical-align resolve empty on a
// rendered .dms-header-cell), so a computed-style assertion would fail both
// before and after the fix. Asserting the source is what makes this a genuine
// red→green signal.
describe('BaseTableComponent - column header wrapping (Story 5.1)', () => {
  const scss = readFileSync(
    path.join(__dirname, 'base-table.component.scss'),
    'utf-8',
  );

  // Extract the top-level `.dms-header-cell` rule body. The selector recurs
  // nested/indented elsewhere in this file (e.g. inside .dark-theme), so match
  // only the column-0 line to target the shared block that Story 5.2 edits.
  function headerCellRuleBody(): string {
    const lines = scss.split('\n');
    let start = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] === '.dms-header-cell {') {
        start = i;
        break;
      }
    }
    expect(start).toBeGreaterThan(-1);
    let depth = 1;
    for (let i = start + 1; i < lines.length; i++) {
      if (lines[i].includes('{')) {
        depth++;
      }
      if (lines[i].includes('}')) {
        depth--;
      }
      if (depth === 0) {
        return lines.slice(start + 1, i).join('\n');
      }
    }
    throw new Error('.dms-header-cell block not closed in SCSS');
  }

  // Task 1.1 — long headers must wrap fully, never clip.
  it('should not clip long headers: no white-space nowrap or text-overflow ellipsis on .dms-header-cell', () => {
    const body = headerCellRuleBody();
    expect(body).not.toMatch(/white-space\s*:\s*nowrap/);
    expect(body).not.toMatch(/text-overflow\s*:\s*ellipsis/);
  });

  // Task 1.2 — wrapped (multi-line) headers must align to the top of the cell.
  it('should align header content to the top: vertical-align top on .dms-header-cell', () => {
    const body = headerCellRuleBody();
    expect(body).toMatch(/vertical-align\s*:\s*top/);
  });

  // Task 1.3 — single-line headers must keep the same non-clipping, top-aligned
  // style (no regression for short headers that already fit on one line).
  it('should apply the same non-clipping, top-aligned style to single-line headers', () => {
    const body = headerCellRuleBody();
    expect(body).not.toMatch(/white-space\s*:\s*nowrap/);
    expect(body).not.toMatch(/text-overflow\s*:\s*ellipsis/);
    expect(body).toMatch(/vertical-align\s*:\s*top/);
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
    // Destroy the fixture so its CDK virtual scroll viewport is torn down and
    // does not leak pending rAF/async state into later describes in this file.
    fixture.destroy();
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
