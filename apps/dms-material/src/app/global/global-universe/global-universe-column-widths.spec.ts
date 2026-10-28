import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BaseTableComponent } from '../../shared/components/base-table/base-table.component';
import { universeColumns } from './global-universe.columns';

// TDD RED Phase: Story 10.1 - Universe Ex-Date column width fits its editable date input.
// These tests define the contract that Story 10.2 must satisfy when it widens the
// `ex_date` column definition (currently 175px, which truncates the <dms-editable-date-cell>
// mat-form-field). They are intentionally red against the current definitions; Story 10.2
// Task 1 un-skipped them and confirmed they fail (red) before implementing until green.
describe('GlobalUniverse - Ex-Date column width fits content', () => {
  let fixture: ComponentFixture<BaseTableComponent<Record<string, unknown>>>;

  // The Universe table's declared column definitions. AC #1 asserts directly on the
  // `ex_date` entry; the rendered cell width is driven entirely by its `width` field via
  // the base-table binding [style.width.px]="column.width ?? DEFAULT_COLUMN_WIDTH".
  const exDateColumn = universeColumns.find((c) => c.field === 'ex_date');

  // Minimal row so *matRowDef body cells commit to the DOM for the body-cell assertion.
  const row = { id: 'row-1', symbol: 'AAPL', ex_date: new Date('2026-03-15') };

  // Wait for a real animation frame so CDK virtual scroll can deliver its range.
  async function nextFrame(): Promise<void> {
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BaseTableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BaseTableComponent);
    // jsdom has no layout engine, so the cdk-virtual-scroll-viewport reports a zero
    // clientHeight and CDK renders no body rows. Give it a real height (as in
    // base-table-mat-table.spec.ts) before change detection so *matRowDef body cells are
    // created for these assertions. The viewport host is static, so it exists immediately.
    const viewportEl = fixture.nativeElement.querySelector(
      'cdk-virtual-scroll-viewport',
    );
    Object.defineProperty(viewportEl, 'clientHeight', {
      configurable: true,
      value: 570,
    });
    fixture.componentRef.setInput('columns', universeColumns);
    fixture.componentRef.setInput('data', [row]);
    // Render the viewport and wait one animation frame so CDK virtual scroll delivers its
    // rendered range and commits *matRowDef body cells to the DOM.
    fixture.detectChanges();
    await nextFrame();
    fixture.detectChanges();
  });

  afterEach(() => {
    // Destroy the fixture so its CDK virtual scroll viewport is torn down and does not
    // leak async init state into later describes in this file.
    fixture.destroy();
  });

  // AC #1 - the `ex_date` column definition declares a width sufficient for an editable
  // date input. The current value of 175 truncates the input, so this fails red until
  // Story 10.2 widens it to at least 200px.
  it('should declare the ex_date column with a width of at least 200px (AC #1)', () => {
    expect(exDateColumn).toBeDefined();
    const width = exDateColumn?.width;
    expect(
      width,
      `expected the ex_date column to declare width >= 200 (current: ${width})`,
    ).toBeGreaterThanOrEqual(200);
  });

  // AC #2 - render test: the Ex-Date <mat-header-cell> / <mat-cell> computed width equals
  // the declared column width, i.e. the base-table binding is honored so a widened
  // definition actually widens the rendered cell. Rendered through BaseTableComponent with
  // the real universeColumns (the same component the Universe table uses), not pixel-scraping
  // of a live input. jsdom has no layout engine, so assert the inline style.width set by
  // the [style.width.px] binding rather than getComputedStyle.
  it('should render the Ex-Date header cell at the declared column width (AC #2)', () => {
    expect(exDateColumn).toBeDefined();
    const el = fixture.nativeElement.querySelector(
      '.dms-header-cell[data-column="ex_date"]',
    );
    expect(el, 'expected a rendered Ex-Date header cell').toBeTruthy();
    // The [style.width.px] binding sets an inline width of "<width>px".
    expect((el as HTMLElement).style.width).toBe(`${exDateColumn?.width}px`);
  });

  it('should render the Ex-Date body cell at the declared column width (AC #2)', () => {
    expect(exDateColumn).toBeDefined();
    const el = fixture.nativeElement.querySelector(
      '.dms-body-cell[data-column="ex_date"]',
    );
    expect(el, 'expected a rendered Ex-Date body cell').toBeTruthy();
    expect((el as HTMLElement).style.width).toBe(`${exDateColumn?.width}px`);
  });
});
