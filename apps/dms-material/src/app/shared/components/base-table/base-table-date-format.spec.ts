import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BaseTableComponent } from './base-table.component';
import type { ColumnDef } from './column-def.interface';

// This suite lives in its own file (separate vitest module context) so the
// Rendered Range suite's vi.useFakeTimers() and real CdkVirtualScrollViewport
// fixtures cannot leak into these tests. CDK virtual scroll delivers its rendered
// range on a real animation frame, which fake timers would never fire; keeping
// this suite isolated guarantees *matRowDef body rows commit to the DOM for
// assertions (same convention as base-table-mat-table.spec.ts).

// TDD RED Phase: Story 9.1 - consistent MM/DD/YYYY date format in tables.
// These tests define the contract that Story 9.2 must satisfy when it replaces
// the locale-dependent 'shortDate' usages with an explicit 'MM/dd/yyyy' format.
// They are intentionally red against the current component (which still renders
// shortDate, e.g. "1/15/26"); they now run unskipped so CI confirms red until
// Story 9.2 implements the fix. No production code changes in this story.
describe('BaseTableComponent - date column MM/DD/YYYY rendering', () => {
  let fixture: ComponentFixture<BaseTableComponent<Record<string, unknown>>>;

  const columns: ColumnDef[] = [
    { field: 'name', header: 'Name' },
    { field: 'tradeDate', header: 'Trade Date', type: 'date' },
  ];

  const row = {
    id: 'row-1',
    name: 'Acme Corp',
    tradeDate: new Date(2026, 0, 15), // Jan 15, 2026 local
  };

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

  // Placeholder active test to keep vitest from failing on an otherwise all-skipped
  // suite (TDD RED phase convention, see file-upload-validation.spec.ts). The real
  // assertion below is disabled until Story 9.2 lands the 'MM/dd/yyyy' format change.
  it('should have TDD RED phase tests defined', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  // Task 1.1 (AC #1) - date-typed columns render through Angular's DatePipe with
  // an explicit 'MM/dd/yyyy' format, not the locale-dependent 'shortDate'. In en-US
  // shortDate is "M/d/yy", so Jan 15, 2026 currently renders as "1/15/26"; after
  // Story 9.2 it must render zero-padded "01/15/2026". Unskipped (AC #3): this is
  // the red phase — expected to fail until Story 9.2 lands the format change.
  it('should render date-typed body cells with the MM/DD/YYYY format', () => {
    expect(bodyCell('tradeDate').textContent?.trim()).toBe('01/15/2026');
  });
});
