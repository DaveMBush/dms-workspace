import { Component, Input } from '@angular/core';
import {
  ComponentFixture,
  discardPeriodicTasks,
  fakeAsync,
  flushMicrotasks,
  TestBed,
  tick,
} from '@angular/core/testing';
// redIt: alias for vitest's own `it`, used ONLY for .skip() registrations. The
// injected global `it` (zone.js-patched) silently drops `.skip()` calls, so a
// skipped test written with the global would never register at all. Active tests
// stay on the global `it`; importing vitest's `it` for an ACTIVE test breaks
// ProxyZone under fakeAsync.
import { it as redIt, vi } from 'vitest';
import type { SortColumn } from '../../services/sort-column.interface';
import { BaseTableComponent } from './base-table.component';
import type { ColumnDef } from './column-def.interface';

// This suite lives in its own file (separate vitest module context) so the
// Rendered Range suite's vi.useFakeTimers() and real CdkVirtualScrollViewport
// fixtures cannot leak into these tests. CDK virtual scroll delivers its rendered
// range on a real animation frame, which fake timers would never fire; keeping the
// two suites in separate files guarantees each runs under clean, real timers.

/** Wait for a real animation frame so CDK virtual scroll can deliver its range. */
async function nextFrame(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

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
    // jsdom has no layout engine, so the cdk-virtual-scroll-viewport reports a
    // zero clientHeight and CDK renders no body rows. Give it a real height (as a
    // browser would) before change detection so *matRowDef rows are created in the
    // DOM for these markup guards. The <cdk-virtual-scroll-viewport> host is static
    // (not behind an @if), so it exists immediately after createComponent.
    const viewportEl = fixture.nativeElement.querySelector(
      'cdk-virtual-scroll-viewport',
    );
    Object.defineProperty(viewportEl, 'clientHeight', {
      configurable: true,
      value: 570,
    });
    fixture.componentRef.setInput('columns', columns);
    fixture.componentRef.setInput('data', [{ id: '1', name: 'Row One' }]);
  });

  it('should render header labels when sortColumns is undefined (regression: EmptyState story omits the arg)', () => {
    // The EmptyState story binds [sortColumns]="undefined" (arg omitted), which
    // overrides the input's [] default. getAriaSort/sortRankMap must tolerate an
    // undefined value or change detection throws and mat-table blanks every <th>.
    fixture.componentRef.setInput('sortColumns', undefined);
    expect(() => fixture.detectChanges()).not.toThrow();
    const el = fixture.nativeElement as HTMLElement;
    for (const column of columns) {
      const headerCell = el.querySelector(`th[data-column="${column.field}"]`);
      expect(headerCell).not.toBeNull();
      expect(headerCell?.textContent?.trim()).toBe(column.header);
    }
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
    // CDK virtual scroll delivers the rendered range on an animation frame, so
    // advance one rAF (tick) after flushing microtasks to let *matRowDef create
    // the body row + cells in the DOM.
    flushMicrotasks();
    tick(16);
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

  // --- mat-table markup assertions -----------------------------------------
  // These assert the NEW <table mat-table> structure introduced by Story 1.2;
  // they live in this active describe and must pass without modification.

  it('should render a single <table mat-table> and remove the old two-region markers (AC #1)', async () => {
    fixture.detectChanges();
    // CDK virtual scroll delivers the rendered range on an animation frame; wait
    // for a real rAF so the body row + cells are in the DOM before asserting.
    await nextFrame();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    // A real <table> element carrying the Material table directive (AC #1).
    expect(el.querySelector('table[mat-table]')).not.toBeNull();
    // The new mat-table structure is present (AC #1): column defs, header cells,
    // body cells and a body row. matColumnDef lives on <ng-container>, which renders
    // no DOM node, so its presence is proven by the data-column attribute each column
    // def stamps onto its rendered cells.
    expect(el.querySelector('[data-column]')).not.toBeNull();
    expect(el.querySelector('th[mat-header-cell]')).not.toBeNull();
    expect(el.querySelector('td[mat-cell]')).not.toBeNull();
    expect(el.querySelector('tr[mat-row]')).not.toBeNull();
    // The bespoke two-region DIV structure must be gone (AC #1).
    expect(el.querySelector('.dms-table-shell')).toBeNull();
    expect(el.querySelector('.dms-table-header-viewport')).toBeNull();
    expect(el.querySelector('.dms-table-header')).toBeNull();
    expect(el.querySelector('.dms-outer-scroller')).toBeNull();
    expect(el.querySelector('.dms-table-scroll-container')).toBeNull();
  });

  // Red-phase contract for Story 3.2's div-based conversion: skipped until the
  // template renders <mat-table> (divs) instead of <table mat-table>.
  // eslint-disable-next-line vitest/no-disabled-tests -- BLOCKED: intentionally disabled TDD RED phase test
  redIt.skip('should render a div-based mat-table inside the cdk-virtual-scroll-viewport (AC #1, red-phase for Story 3.2)', async () => {
    fixture.detectChanges();
    // CDK virtual scroll delivers the rendered range on an animation frame; wait
    // for a real rAF so the table is in the DOM before asserting.
    await nextFrame();
    const el = fixture.nativeElement as HTMLElement;
    expect(
      el.querySelector(
        'cdk-virtual-scroll-viewport mat-table[role="table"], cdk-virtual-scroll-viewport .mat-mdc-table',
      ),
    ).not.toBeNull();
  });

  // Red-phase contract for Story 3.2's div-based conversion: skipped until the
  // template renders <mat-table> (divs) instead of <table mat-table>. Under the
  // current native <table> form, position:sticky on the header row is not
  // guaranteed in jsdom, so this stays red-phase by skip.
  // eslint-disable-next-line vitest/no-disabled-tests -- BLOCKED: intentionally disabled TDD RED phase test
  redIt.skip('should apply position:sticky to the column-header row so headers stay visible while scrolling (AC #5, red-phase for Story 3.2)', async () => {
    fixture.detectChanges();
    // CDK virtual scroll delivers the rendered range on an animation frame; wait
    // for a real rAF so the header row is in the DOM before asserting.
    await nextFrame();
    const el = fixture.nativeElement as HTMLElement;
    const headerRow =
      el.querySelector('tr.dms-column-header-row') ??
      (el.querySelector('th[mat-header-cell]')?.closest('tr') ?? null);
    expect(headerRow).not.toBeNull();
    expect(getComputedStyle(headerRow!).position).toBe('sticky');
  });

  it('should render one header cell per column with data-column and the column header text (AC #1, #8)', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const nameHeader = el.querySelector('th[data-column="name"]');
    expect(nameHeader).not.toBeNull();
    expect((nameHeader as HTMLElement).textContent?.trim()).toBe('Name');
    const valueHeader = el.querySelector('th[data-column="value"]');
    expect(valueHeader).not.toBeNull();
    expect((valueHeader as HTMLElement).textContent?.trim()).toBe('Value');
  });

  it('should render a body row with role=row, one cell per column (AC #1, #7, #8)', async () => {
    fixture.detectChanges();
    // CDK virtual scroll delivers the rendered range on an animation frame; wait
    // for a real rAF so the *matRowDef body row is in the DOM before asserting.
    await nextFrame();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    // tr[role=row] count would include the header and be 2 after Story 1.2.
    const rows = el.querySelectorAll('tr[mat-row]');
    expect(rows).toHaveLength(1);
    const row = rows[0] as HTMLElement;
    // Each column renders a body cell carrying its data-column attribute.
    expect(row.querySelector('[data-column="name"]')).not.toBeNull();
    expect(row.querySelector('[data-column="value"]')).not.toBeNull();
  });

  it('should wrap the table in a cdk-virtual-scroll-viewport and remove the flex spacer (AC #5)', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    // The mat-table must live inside the virtual scroll viewport.
    expect(
      el.querySelector('cdk-virtual-scroll-viewport table'),
    ).not.toBeNull();
    // The bespoke flex spacer that padded the DIV rows is gone (AC #5).
    expect(el.querySelector('.dms-col-spacer')).toBeNull();
  });

  it('should emit sortChange with ascending direction when a sortable column header is clicked (AC #3)', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const spy = vi.spyOn(component.sortChange, 'emit');
    const nameHeader = el.querySelector('th[data-column="name"]')!;
    expect(nameHeader).not.toBeNull();
    nameHeader.click();
    expect(spy).toHaveBeenCalledWith({ active: 'name', direction: 'asc' });
  });

  it('should render a per-row checkbox in the select column when selectable (AC #4)', async () => {
    fixture.componentRef.setInput('selectable', true);
    fixture.detectChanges();
    // CDK virtual scroll delivers the rendered range on an animation frame; wait
    // for a real rAF so the *matRowDef body row (with its checkbox cell) is in
    // the DOM before asserting.
    await nextFrame();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('td input[type="checkbox"]')).not.toBeNull();
  });

  it('should render a select-all checkbox in the header when multiSelect is enabled (AC #4)', () => {
    fixture.componentRef.setInput('selectable', true);
    fixture.componentRef.setInput('multiSelect', true);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('th input[type="checkbox"]')).not.toBeNull();
  });
});

// Host harness for the TemplateRef-based inputs (Story 3.1, Task 3). The
// component reads cellTemplate/filterRowTemplate via @ContentChild, so they
// must be projected as <ng-template> content — a plain [input] binding cannot
// carry a TemplateRef. This mirrors how real consumers (e.g. open-positions)
// use the table.
interface HostTableRow {
  id: string;
  name?: string;
}

@Component({
  selector: 'dms-test-base-table-host',
  // BaseTableComponent must be in the host's own imports: TestBed.configureTestingModule
  // does not make a component known to another component's template.
  imports: [BaseTableComponent],
  template: `
    <dms-base-table
      [columns]="columns"
      [data]="data"
      [selectable]="selectable"
      [multiSelect]="multiSelect"
      [sortColumns]="sortColumns"
    >
      <ng-template #cellTemplate let-row let-column="column">
        {{ row[column.field] }}-custom
      </ng-template>
      <ng-template #filterRowTemplate let-col>
        {{ col.header }} filter
      </ng-template>
    </dms-base-table>
  `,
})
class TestHostComponent {
  @Input() columns: ColumnDef[] = [];
  @Input() data: HostTableRow[] = [];
  @Input() selectable = false;
  @Input() multiSelect = true;
  @Input() sortColumns: SortColumn[] = [];
}

describe('BaseTableComponent - host harness with TemplateRef inputs (Story 3.1, Task 3)', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  const columns: ColumnDef[] = [
    { field: 'name', header: 'Name' },
    { field: 'value', header: 'Value' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BaseTableComponent, TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    // Render the host template once so <dms-base-table> (and its static
    // cdk-virtual-scroll-viewport) exist in the DOM.
    fixture.detectChanges();
    // jsdom has no layout engine, so the cdk-virtual-scroll-viewport reports a
    // zero clientHeight and CDK renders no body rows. Give it a real height (as
    // in the sibling describe) before change detection so *matRowDef body rows
    // are created for the custom-cell assertions. The viewport host is static,
    // so it exists after that first render pass.
    const viewportEl = fixture.nativeElement.querySelector(
      'cdk-virtual-scroll-viewport',
    );
    Object.defineProperty(viewportEl, 'clientHeight', {
      configurable: true,
      value: 570,
    });
  });

  it('should render custom cell content via the provided cellTemplate', async () => {
    const host = fixture.componentInstance;
    host.columns = columns;
    host.data = [{ id: '1', name: 'Row One' }];
    fixture.detectChanges();
    // CDK virtual scroll delivers the rendered range on an animation frame; wait
    // for a real rAF so the *matRowDef body row (with its custom cell content) is
    // in the DOM before asserting.
    await nextFrame();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const nameCell = el.querySelector('td[data-column="name"]');
    expect(nameCell).not.toBeNull();
    // The projected #cellTemplate renders "<value>-custom", proving the custom
    // template replaced the default per-type rendering.
    expect((nameCell as HTMLElement).textContent?.trim()).toBe(
      'Row One-custom',
    );
  });

  it('should render filter inputs in the filter row when filterRowTemplate is set', async () => {
    const host = fixture.componentInstance;
    host.columns = columns;
    host.data = [{ id: '1', name: 'Row One' }];
    fixture.detectChanges();
    // The filter row is a header row (*matHeaderRowDef) and renders without
    // virtual scroll, but wait one frame to be safe.
    await nextFrame();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const filterRow = el.querySelector('tr.dms-filter-row');
    expect(filterRow).not.toBeNull();
    // The projected #filterRowTemplate renders "<header> filter" per column, so
    // the first column's filter cell carries "Name filter".
    expect((filterRow as HTMLElement).textContent?.trim()).toContain(
      'Name filter',
    );
  });
});
