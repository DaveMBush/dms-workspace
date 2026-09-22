import { Component, Input } from '@angular/core';
import {
  ComponentFixture,
  discardPeriodicTasks,
  fakeAsync,
  flushMicrotasks,
  TestBed,
  tick,
} from '@angular/core/testing';
import { vi } from 'vitest';
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
      const headerCell = el.querySelector(
        `.dms-header-cell[data-column="${column.field}"]`,
      );
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

  // Unskipped in Task 0. NOTE: passes under BOTH forms — <table mat-table>
  // already satisfies the [role="table"] / .mat-mdc-table selector (Material's
  // table directive applies these), so this is a guard pinning that the
  // viewport-wrapped table survives Tasks 1–2, not a red-phase failure. The
  // genuinely-red assertions for the div conversion are AC #2 and AC #5 below.
  it(
    'should render a div-based mat-table inside the cdk-virtual-scroll-viewport (AC #1, red-phase for Story 3.2)',
    async () => {
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
    },
  );

  // Red-phase contract for Story 3.2's div-based conversion: unskipped in Task 0;
  // fails against the current <table mat-table> template until Tasks 1–2 convert it.
  it(
    'should apply position:sticky to the column-header row so headers stay visible while scrolling (AC #5, red-phase for Story 3.2)',
    async () => {
      fixture.detectChanges();
      // CDK virtual scroll delivers the rendered range on an animation frame; wait
      // for a real rAF so the header row is in the DOM before asserting.
      await nextFrame();
      const el = fixture.nativeElement as HTMLElement;
      const headerRow =
        el.querySelector('tr.dms-column-header-row') ??
        el.querySelector('th[mat-header-cell]')?.closest('tr') ??
        null;
      expect(headerRow).not.toBeNull();
      expect(getComputedStyle(headerRow!).position).toBe('sticky');
    },
  );

  // Red-phase contract for Story 3.2's div-based conversion: unskipped in Task 0;
  // fails against the current <table mat-table> template until Tasks 1–2 convert it.
  it(
    'should not render any native table elements (AC #2)',
    async () => {
      fixture.detectChanges();
      // CDK virtual scroll delivers the rendered range on an animation frame; wait
      // for a real rAF so the body row + cells are in the DOM before asserting.
      await nextFrame();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('table')).toBeNull();
      expect(el.querySelector('th')).toBeNull();
      expect(el.querySelector('td')).toBeNull();
      expect(el.querySelector('thead')).toBeNull();
      expect(el.querySelector('tbody')).toBeNull();
      expect(el.querySelector('tr')).toBeNull();
    },
  );

  // Red-phase contract for Story 3.2's div-based conversion: unskipped in Task 0;
  // pins the stable class/role/data-column selectors that must survive Tasks 1–2.
  it(
    'should keep stable selectors working after the div-based conversion (AC #3)',
    async () => {
      fixture.detectChanges();
      await nextFrame();
      // CDK virtual scroll renders body rows on rAF; a second change-detection
      // pass flushes their [attr.data-column] bindings onto the freshly created
      // cells before we assert. (Matches the sibling "body row" guard.)
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      // Header cells resolve via class + ARIA role + data-column, not element type.
      expect(
        el.querySelectorAll(
          '.dms-header-cell[role="columnheader"][data-column]',
        ),
      ).not.toHaveLength(0);
      expect(
        el.querySelector(
          '.dms-header-cell[role="columnheader"][data-column="name"]',
        ),
      ).not.toBeNull();
      expect(
        el.querySelector(
          '.dms-header-cell[role="columnheader"][data-column="value"]',
        ),
      ).not.toBeNull();
      // Body rows keep role=row and the stable .dms-body-row class.
      const row = el.querySelector('.dms-body-row[role="row"]');
      expect(row).not.toBeNull();
      // Each body cell keeps its data-column attribute on a .dms-body-cell element.
      expect(
        el.querySelector('.dms-body-cell[data-column="name"]'),
      ).not.toBeNull();
      expect(
        (row as HTMLElement).querySelector(
          '.dms-body-cell[data-column="name"]',
        ),
      ).not.toBeNull();
    },
  );

  it('should render one header cell per column with data-column and the column header text (AC #1, #8)', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    // Select by the stable .dms-header-cell class + data-column attribute so this
    // guard survives Story 3.2's div-based conversion (the <th> element type is not
    // guaranteed to remain).
    const nameHeader = el.querySelector('.dms-header-cell[data-column="name"]');
    expect(nameHeader).not.toBeNull();
    expect((nameHeader as HTMLElement).textContent?.trim()).toBe('Name');
    const valueHeader = el.querySelector(
      '.dms-header-cell[data-column="value"]',
    );
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
    // Select by the stable .dms-body-row class + role=row so this guard survives
    // Story 3.2's div-based conversion (the <tr> element type is not guaranteed to
    // remain). A bare [role=row] would also match header rows, so scope to body rows.
    const rows = el.querySelectorAll('.dms-body-row[role="row"]');
    expect(rows).toHaveLength(1);
    const row = rows[0] as HTMLElement;
    // Each column renders a body cell carrying its data-column attribute.
    expect(row.querySelector('[data-column="name"]')).not.toBeNull();
    expect(row.querySelector('[data-column="value"]')).not.toBeNull();
  });

  it('should wrap the table in a cdk-virtual-scroll-viewport and remove the flex spacer (AC #5)', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    // The mat-table must live inside the virtual scroll viewport. Select by the
    // .mat-mdc-table class Material adds to its host so this guard survives Story
    // 3.2's div-based conversion (the <table> element type is not guaranteed).
    expect(
      el.querySelector('cdk-virtual-scroll-viewport .mat-mdc-table'),
    ).not.toBeNull();
    // The bespoke flex spacer that padded the DIV rows is gone (AC #5).
    expect(el.querySelector('.dms-col-spacer')).toBeNull();
  });

  it('should emit sortChange with ascending direction when a sortable column header is clicked (AC #3)', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const spy = vi.spyOn(component.sortChange, 'emit');
    // Select by the stable .dms-header-cell class + data-column attribute so this
    // guard survives Story 3.2's div-based conversion (the <th> element type is not
    // guaranteed to remain). The click handler binds to the cell regardless of tag.
    const nameHeader = el.querySelector(
      '.dms-header-cell[data-column="name"]',
    )!;
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
    // Select by the stable .dms-body-row class + role=row so this guard survives
    // Story 3.2's div-based conversion (the <td> element type is not guaranteed to
    // remain). The per-row checkbox renders inside that body row regardless of tag.
    expect(
      el.querySelector('.dms-body-row[role="row"] input[type="checkbox"]'),
    ).not.toBeNull();
  });

  it('should render a select-all checkbox in the header when multiSelect is enabled (AC #4)', () => {
    fixture.componentRef.setInput('selectable', true);
    fixture.componentRef.setInput('multiSelect', true);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    // Select by the stable .dms-column-header-row class + role=row so this guard
    // survives Story 3.2's div-based conversion (the <th> element type is not
    // guaranteed to remain). Scoping to the column-header row also excludes the
    // separate filter row, which has no checkbox.
    expect(
      el.querySelector(
        '.dms-column-header-row[role="row"] input[type="checkbox"]',
      ),
    ).not.toBeNull();
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
  // Test-only host; selector uses the app "dms" prefix so @angular-eslint/
  // component-selector passes (the **/*.spec.ts override does not relax it).
  // Instantiated by class reference, never by this string.
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
    const nameCell = el.querySelector('.dms-body-cell[data-column="name"]');
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
    const filterRow = el.querySelector('.dms-filter-row[role="row"]');
    expect(filterRow).not.toBeNull();
    // The projected #filterRowTemplate renders "<header> filter" per column, so
    // the first column's filter cell carries "Name filter".
    expect((filterRow as HTMLElement).textContent?.trim()).toContain(
      'Name filter',
    );
  });
});
