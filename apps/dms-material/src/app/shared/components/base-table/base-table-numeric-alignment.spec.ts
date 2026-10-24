import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BaseTableComponent } from './base-table.component';
import type { ColumnDef } from './column-def.interface';

// This suite lives in its own file (separate vitest module context) so the
// Rendered Range suite's vi.useFakeTimers() and real CdkVirtualScrollViewport
// fixtures cannot leak into these tests. CDK virtual scroll delivers its rendered
// range on a real animation frame, which fake timers would never fire; keeping
// this suite isolated guarantees *matRowDef body rows commit to the DOM for
// assertions (same convention as base-table-mat-table.spec.ts).

// TDD RED Phase: Story 8.1 - numeric column right-alignment in dms-base-table.
// These tests define the contract that Story 8.2 must satisfy when it adds a
// type-derived alignment class (`.dms-body-cell--numeric`) to body cells whose
// `column.type` is 'number' or 'currency', plus the CSS that right-aligns their
// content. They are intentionally red against the current component; each test
// is marked it.skip so CI stays green until Story 8.2 unskips, confirms red,
// then implements. No production code changes in this story.
describe('BaseTableComponent - numeric column right-alignment', () => {
  let fixture: ComponentFixture<BaseTableComponent<Record<string, unknown>>>;

  // Mixed-type columns covering every alignment-relevant type: a default/text
  // column, a number column, a currency column, and a date column.
  const columns: ColumnDef[] = [
    { field: 'name', header: 'Name' },
    { field: 'qty', header: 'Qty', type: 'number' },
    { field: 'price', header: 'Price', type: 'currency' },
    { field: 'lastTrade', header: 'Last Trade', type: 'date' },
  ];

  const row = {
    id: 'row-1',
    name: 'Acme Corp',
    qty: 12,
    price: 43.57,
    lastTrade: new Date('2026-01-15'),
  };

  // The component's declared styles. This test environment does not inject
  // component SCSS into the DOM (verified — computed styles resolve empty on a
  // rendered cell), so AC #2 asserts the source rule rather than getComputedStyle,
  // matching the Story 5.x convention for a genuine red→green signal.
  const scss = readFileSync(
    path.join(__dirname, 'base-table.component.scss'),
    'utf-8',
  );

  // Wait for a real animation frame so CDK virtual scroll can deliver its range.
  async function nextFrame(): Promise<void> {
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BaseTableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BaseTableComponent);
    // jsdom has no layout engine, so the cdk-virtual-scroll-viewport reports a
    // zero clientHeight and CDK renders no body rows. Give it a real height (as in
    // base-table-mat-table.spec.ts) before change detection so *matRowDef body
    // rows are created for these assertions. The viewport host is static, so it
    // exists immediately after createComponent.
    const viewportEl = fixture.nativeElement.querySelector(
      'cdk-virtual-scroll-viewport',
    );
    Object.defineProperty(viewportEl, 'clientHeight', {
      configurable: true,
      value: 570,
    });
    fixture.componentRef.setInput('columns', columns);
    fixture.componentRef.setInput('data', [row]);
    // Render the viewport and wait one animation frame so CDK virtual scroll
    // delivers its rendered range and commits *matRowDef body rows to the DOM.
    fixture.detectChanges();
    await nextFrame();
    fixture.detectChanges();
  });

  afterEach(() => {
    // Destroy the fixture so its CDK virtual scroll viewport is torn down and
    // does not leak async init state into later describes in this file.
    fixture.destroy();
  });

  // Body cell for a given column field (template sets [attr.data-column]).
  function bodyCell(field: string): HTMLElement {
    const el = fixture.nativeElement.querySelector(
      `.dms-body-cell[data-column="${field}"]`,
    );
    expect(
      el,
      `expected a rendered body cell for column "${field}"`,
    ).toBeTruthy();
    return el as HTMLElement;
  }

  // Extract the top-level `.dms-body-cell--numeric` rule body. Story 8.2 adds this
  // class to numeric-typed body cells; until then it is absent and the assertion
  // below fails red. Match only the column-0 line so a nested/indented recurrence
  // (e.g. inside .dark-theme) does not shadow the shared block.
  function numericCellRuleBody(): string {
    const lines = scss.split('\n');
    let start = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] === '.dms-body-cell--numeric {') {
        start = i;
        break;
      }
    }
    expect(
      start,
      'expected a .dms-body-cell--numeric rule in base-table.component.scss',
    ).toBeGreaterThan(-1);
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
    throw new Error('.dms-body-cell--numeric block not closed in SCSS');
  }

  // Task 1.1 (AC #1) - numeric-typed body cells carry the alignment class;
  // text/date cells do not.
  // eslint-disable-next-line vitest/no-disabled-tests -- BLOCKED: intentionally disabled TDD RED phase test; Story 8.2 removes the skip, confirms red, then implements until green
  it.skip('should mark number and currency body cells with .dms-body-cell--numeric', () => {
    expect(bodyCell('qty').classList.contains('dms-body-cell--numeric')).toBe(
      true,
    );
    expect(bodyCell('price').classList.contains('dms-body-cell--numeric')).toBe(
      true,
    );
    expect(bodyCell('name').classList.contains('dms-body-cell--numeric')).toBe(
      false,
    );
    expect(
      bodyCell('lastTrade').classList.contains('dms-body-cell--numeric'),
    ).toBe(false);
  });

  // Task 1.2 (AC #2) - the alignment class right-aligns cell content. The test
  // environment does not inject component SCSS into the DOM, so assert the source
  // rule rather than getComputedStyle (Story 5.x convention). AC #2 accepts either
  // mechanism: flex-end or text-align: right.
  // eslint-disable-next-line vitest/no-disabled-tests -- BLOCKED: intentionally disabled TDD RED phase test; Story 8.2 removes the skip, confirms red, then implements until green
  it.skip('should right-align .dms-body-cell--numeric (flex-end or text-align)', () => {
    const body = numericCellRuleBody();
    expect(
      /justify-content\s*:\s*flex-end/.test(body) ||
        /text-align\s*:\s*right/.test(body),
    ).toBe(true);
  });

  // Task 2.1 (AC #3) - header cells are unaffected: no numeric-alignment class on
  // any <mat-header-cell>, preserving the existing left-aligned header convention.
  // eslint-disable-next-line vitest/no-disabled-tests -- BLOCKED: intentionally disabled TDD RED phase test; Story 8.2 removes the skip, confirms red, then implements until green
  it.skip('should not mark header cells with .dms-body-cell--numeric', () => {
    const headers = fixture.nativeElement.querySelectorAll(
      '.dms-header-cell[data-column]',
    );
    expect(headers.length).toBeGreaterThan(0);
    for (const el of Array.from(headers)) {
      expect(el.classList.contains('dms-body-cell--numeric')).toBe(false);
    }
  });
});
