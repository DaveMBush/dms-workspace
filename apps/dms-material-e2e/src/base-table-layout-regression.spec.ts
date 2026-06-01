/**
 * base-table-layout-regression.spec.ts — Epic 112
 * ──────────────────────────────────────────────────────────────
 *
 * Regression suite for the four layout regressions fixed in Story 112.2.
 *
 * FOUR ASSERTIONS:
 *   (a) Scrollbar right-edge stays stable across horizontal scroll positions (R1)
 *       .dms-outer-scroller owns overflow-y:auto and is always full-width.
 *       Its right edge must NOT DRIFT when the body viewport scrolls horizontally.
 *       Before the fix the vertical scrollbar sat on the inner container and would
 *       shift right as the user scrolled left, exposing blank space (R1 regression).
 *   (b) Outer container fills its flex parent (R2)
 *       .dms-outer-scroller.clientWidth must equal its parentElement.clientWidth.
 *       Before the fix the outer container was only as wide as the table content,
 *       placing the scrollbar adjacent to the last column instead of the container edge.
 *   (c) Sum of column widths + spacer equals scroll container clientWidth (R3)
 *       .dms-col-spacer absorbs spare width so rows always span the container.
 *       Tested at 2200px viewport where content area (~1800px) exceeds column total
 *       (~1475px), ensuring the spacer has positive width to absorb.
 *   (d) Beyond-table background matches cell background (R4)
 *       .dms-body-row has background-color:var(--dms-surface); the spacer region
 *       is covered by the row background, matching the cell background.
 *
 * CONSUMER: Universe (/global/universe) — used for all four assertions.
 *   Universe column total ≈ 1475px (narrow at 800px, wide at 1800px / 2200px).
 *
 * BROWSERS: Chromium + Firefox (no .skip / .only annotations per AC6).
 */

import { expect, type Page, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedScrollUniverseData } from './helpers/seed-scroll-universe-data.helper';

// ─── Selectors ────────────────────────────────────────────────────────────────

/**
 * Epic 112 (Story 112.2): full-width outer scroll container — owns overflow-y:auto.
 * The vertical scrollbar lives on this element, permanently at the viewport right edge.
 */
const OUTER_SCROLLER_SEL = '.dms-outer-scroller';

/**
 * Body viewport owns horizontal scroll.
 * Story 114.2 keeps the vertical scrollbar on .dms-outer-scroller and mirrors
 * this viewport scrollLeft into the sibling header viewport.
 */
const SCROLL_CONTAINER_SEL = '.dms-table-body';

/** Header viewport receives wheel input and proxies horizontal motion into body viewport. */
const HEADER_VIEWPORT_SEL = '.dms-table-header-viewport';

/** Column-header cells in the column-label row (not the filter row). */
const COLUMN_HEADER_CELLS_SEL =
  '.dms-column-header-row .dms-header-cell[role="columnheader"]';

/**
 * Flex spacer at the end of the column header row.
 * flex:1 — absorbs spare width so rows always span container width.
 */
const COL_SPACER_IN_HEADER_SEL = '.dms-column-header-row .dms-col-spacer';

/** Body data rows. */
const BODY_ROW_SEL = '.dms-body-row[role="row"]';

/** Body cells inside a row. */
const BODY_CELL_SEL = '.dms-body-cell[role="cell"]';

// ─── Shared browser-side helpers ──────────────────────────────────────────────

/**
 * Checks whether `.dms-outer-scroller`'s right edge has drifted from a
 * previously captured baseline.  Passed to `page.evaluate()` — must be a
 * self-contained, serialisable function (no outer-scope closures).
 */
function checkOuterScrollerDrift(arg: {
  outerSel: string;
  baselineRight: number;
}): {
  ok: boolean;
  right: number;
  baselineRight: number;
  drift: number;
} {
  const { outerSel, baselineRight } = arg;
  const el = document.querySelector<HTMLElement>(outerSel);
  if (!el) {
    return { ok: false, right: 0, baselineRight, drift: 9999 };
  }
  const right = el.getBoundingClientRect().right;
  const drift = Math.abs(right - baselineRight);
  return { ok: drift <= 2, right, baselineRight, drift };
}

// ─── Suite Setup ─────────────────────────────────────────────────────────────

let cleanup: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
  const seeder = await seedScrollUniverseData();
  cleanup = seeder.cleanup;
});

test.afterAll(async () => {
  if (cleanup) {
    await cleanup();
  }
});

// ─── Navigation helper ────────────────────────────────────────────────────────

async function navigateToUniverse(page: Page): Promise<void> {
  await login(page);
  await page.goto('/global/universe');
  await page
    .locator('dms-base-table')
    .waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForSelector(BODY_ROW_SEL, { timeout: 15000 });
}

// ─── AC1 — Scrollbar right-edge on narrow viewport (800px) ────────────────────

test.describe('Base Table Layout Regression — AC1: scrollbar right-edge on narrow viewport', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 900 });
    await navigateToUniverse(page);
  });

  test('Universe: scrollbar right-edge stays at viewport right at 50% and 100% horizontal scroll', async ({
    page,
  }) => {
    // Precondition: table must be wider than 800px to test horizontal scroll.
    const canScroll = await page
      .locator(SCROLL_CONTAINER_SEL)
      .first()
      .evaluate(function checkScrollable(el: Element): boolean {
        return el.scrollWidth > el.clientWidth;
      });

    if (!canScroll) {
      // Universe columns (≈1475px) must be wider than the 800px content area.
      // If this branch is hit the seeder or layout changed — flag it as a failure.
      throw new Error(
        'Precondition failed: .dms-table-body is not horizontally ' +
          'scrollable at 800px viewport. Universe column total should exceed ' +
          '800px; check column definitions and seeder.'
      );
    }

    // ── Capture baseline right edge at 0% scroll ──────────────────────
    // NOTE: We assert drift stability (right edge must not move relative to
    // baseline) rather than an absolute right ≈ window.innerWidth check.
    // The app layout has a sidebar so outerScroller.right < window.innerWidth
    // by design. The regression (R1) is that the right edge *moves* when the
    // inner container scrolls horizontally — the drift guard catches exactly
    // that without depending on sidebar width.
    const baseline = await page.evaluate(function captureRightEdge(
      outerSel: string
    ): {
      ok: boolean;
      right: number;
    } {
      const el = document.querySelector<HTMLElement>(outerSel);
      if (!el) {
        return { ok: false, right: -9999 };
      }
      return { ok: true, right: el.getBoundingClientRect().right };
    }, OUTER_SCROLLER_SEL);

    if (!baseline.ok) {
      throw new Error(
        'Precondition failed: .dms-outer-scroller not found in DOM'
      );
    }

    // ── Scroll to 50% ─────────────────────────────────────────────────────
    await page.evaluate(
      function scrollToPercent(arg: {
        containerSel: string;
        percent: number;
      }): void {
        const { containerSel, percent } = arg;
        const el = document.querySelector<HTMLElement>(containerSel);
        if (el) {
          el.scrollLeft = (el.scrollWidth - el.clientWidth) * percent;
        }
      },
      { containerSel: SCROLL_CONTAINER_SEL, percent: 0.5 }
    );

    // Allow one frame for the layout to settle.
    await page.waitForTimeout(50);

    const result50 = await page.evaluate(checkOuterScrollerDrift, {
      outerSel: OUTER_SCROLLER_SEL,
      baselineRight: baseline.right,
    });

    expect(
      result50.ok,
      `At 50% horizontal scroll: outer-scroller right drifted from ` +
        `${result50.baselineRight}px (baseline) to ${result50.right}px, ` +
        `drift=${result50.drift.toFixed(2)}px (must be ≤2px). ` +
        '.dms-outer-scroller (overflow-y:auto, overflow-x:hidden) must ' +
        'remain fixed-width regardless of inner horizontal scroll position ' +
        '(R1 regression guard: vertical scrollbar must not drift with content).'
    ).toBe(true);

    // ── Scroll to 100% ────────────────────────────────────────────────────
    await page.evaluate(function scrollToMax(containerSel: string): void {
      const el = document.querySelector<HTMLElement>(containerSel);
      if (el) {
        el.scrollLeft = el.scrollWidth - el.clientWidth;
      }
    }, SCROLL_CONTAINER_SEL);

    await page.waitForTimeout(50);

    const result100 = await page.evaluate(checkOuterScrollerDrift, {
      outerSel: OUTER_SCROLLER_SEL,
      baselineRight: baseline.right,
    });

    expect(
      result100.ok,
      `At 100% horizontal scroll: outer-scroller right drifted from ` +
        `${result100.baselineRight}px (baseline) to ${result100.right}px, ` +
        `drift=${result100.drift.toFixed(2)}px (must be ≤2px). ` +
        'The vertical scrollbar must stay fixed at the container right edge — ' +
        'it must not scroll with the table content (R1 regression guard).'
    ).toBe(true);
  });

  test('Universe: wheel input over detached header forwards horizontal scroll into body viewport', async ({
    page,
  }) => {
    const canScroll = await page
      .locator(SCROLL_CONTAINER_SEL)
      .first()
      .evaluate(function checkScrollable(el: Element): boolean {
        return el.scrollWidth > el.clientWidth;
      });

    if (!canScroll) {
      throw new Error(
        'Precondition failed: .dms-table-body is not horizontally ' +
          'scrollable at 800px viewport. Universe column total should exceed ' +
          '800px; check column definitions and seeder.'
      );
    }

    const before = await page.evaluate(
      function captureScrollState(arg: {
        headerSel: string;
        bodySel: string;
      }): { headerScrollLeft: number; bodyScrollLeft: number } {
        const header = document.querySelector<HTMLElement>(arg.headerSel);
        const body = document.querySelector<HTMLElement>(arg.bodySel);

        if (!header || !body) {
          throw new Error(
            'Precondition failed: detached header or body viewport not found'
          );
        }

        body.scrollLeft = 0;
        return {
          headerScrollLeft: header.scrollLeft,
          bodyScrollLeft: body.scrollLeft,
        };
      },
      { headerSel: HEADER_VIEWPORT_SEL, bodySel: SCROLL_CONTAINER_SEL }
    );

    await page.locator(HEADER_VIEWPORT_SEL).hover();
    await page.mouse.wheel(240, 0);
    await page.waitForTimeout(100);

    const after = await page.evaluate(
      function captureScrollState(arg: {
        headerSel: string;
        bodySel: string;
      }): { headerScrollLeft: number; bodyScrollLeft: number } {
        const header = document.querySelector<HTMLElement>(arg.headerSel);
        const body = document.querySelector<HTMLElement>(arg.bodySel);

        if (!header || !body) {
          throw new Error(
            'Precondition failed: detached header or body viewport not found'
          );
        }

        return {
          headerScrollLeft: header.scrollLeft,
          bodyScrollLeft: body.scrollLeft,
        };
      },
      { headerSel: HEADER_VIEWPORT_SEL, bodySel: SCROLL_CONTAINER_SEL }
    );

    expect(
      after.bodyScrollLeft,
      `Header wheel input should move the body viewport horizontally. ` +
        `Observed body scrollLeft before=${before.bodyScrollLeft.toFixed(2)} ` +
        `after=${after.bodyScrollLeft.toFixed(2)}.`
    ).toBeGreaterThan(before.bodyScrollLeft + 1);

    expect(
      Math.abs(after.headerScrollLeft - after.bodyScrollLeft),
      `Header and body scrollLeft must stay synchronized after wheel forwarding. ` +
        `Observed header=${after.headerScrollLeft.toFixed(2)} ` +
        `body=${after.bodyScrollLeft.toFixed(2)}.`
    ).toBeLessThanOrEqual(1);
  });
});

// ─── AC2 — Container-width on wide viewport (1800px) ─────────────────────────

test.describe('Base Table Layout Regression — AC2: outer container width on wide viewport', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1800, height: 900 });
    await navigateToUniverse(page);
  });

  test('Universe: outer scroll container fills its flex parent (not truncated to table width)', async ({
    page,
  }) => {
    const result = await page.evaluate(function checkOuterScrollerFillsParent(
      outerSel: string
    ): {
      ok: boolean;
      outerClientWidth: number;
      parentClientWidth: number;
      diff: number;
    } {
      const el = document.querySelector<HTMLElement>(outerSel);
      const parent = el?.parentElement;
      if (!el || !parent) {
        return {
          ok: false,
          outerClientWidth: 0,
          parentClientWidth: 0,
          diff: 9999,
        };
      }
      const outerClientWidth = el.clientWidth;
      const parentClientWidth = parent.clientWidth;
      const diff = Math.abs(outerClientWidth - parentClientWidth);
      return { ok: diff <= 2, outerClientWidth, parentClientWidth, diff };
    }, OUTER_SCROLLER_SEL);

    expect(
      result.ok,
      `outer-scroller.clientWidth=${result.outerClientWidth}px ` +
        `parentElement.clientWidth=${result.parentClientWidth}px ` +
        `diff=${result.diff.toFixed(2)}px (must be ≤2px). ` +
        'At 1800px viewport the scrollable outer container must span its full ' +
        'flex parent — it must NOT be truncated to the table content width ' +
        '(R2 regression guard, ~1475px for Universe columns).'
    ).toBe(true);
  });
});

// ─── AC3 — Column fill on very wide viewport (2200px) ────────────────────────

test.describe('Base Table Layout Regression — AC3: column fill on wide viewport', () => {
  test.beforeEach(async ({ page }) => {
    // 2200px ensures the content area (~1800px after sidebar) exceeds the
    // Universe column total (~1475px), so the spacer has positive width to absorb.
    await page.setViewportSize({ width: 2200, height: 900 });
    await navigateToUniverse(page);
  });

  test('Universe: sum of column widths plus spacer equals scroll container clientWidth', async ({
    page,
  }) => {
    const result = await page.evaluate(
      function checkColumnFill(arg: {
        containerSel: string;
        headerCellsSel: string;
        spacerSel: string;
      }): {
        ok: boolean;
        message: string;
        totalWidth: number;
        containerClientWidth: number;
        colCount: number;
        spacerWidth: number;
        diff: number;
      } {
        const { containerSel, headerCellsSel, spacerSel } = arg;
        const container = document.querySelector<HTMLElement>(containerSel);
        const headerCells = Array.from(
          document.querySelectorAll<HTMLElement>(headerCellsSel)
        );
        const spacer = document.querySelector<HTMLElement>(spacerSel);

        if (!container || headerCells.length === 0 || !spacer) {
          return {
            ok: false,
            message:
              'precondition unmet: container=' +
              !!container +
              ' cells=' +
              headerCells.length +
              ' spacer=' +
              !!spacer,
            totalWidth: 0,
            containerClientWidth: 0,
            colCount: 0,
            spacerWidth: 0,
            diff: 9999,
          };
        }

        const sumCols = headerCells.reduce(function sumWidths(
          acc: number,
          el: HTMLElement
        ): number {
          return acc + el.getBoundingClientRect().width;
        },
        0);
        const spacerWidth = spacer.getBoundingClientRect().width;
        const totalWidth = sumCols + spacerWidth;
        const containerClientWidth = container.clientWidth;
        const diff = Math.abs(totalWidth - containerClientWidth);

        return {
          ok: diff <= 2,
          message: '',
          totalWidth,
          containerClientWidth,
          colCount: headerCells.length,
          spacerWidth,
          diff,
        };
      },
      {
        containerSel: SCROLL_CONTAINER_SEL,
        headerCellsSel: COLUMN_HEADER_CELLS_SEL,
        spacerSel: COL_SPACER_IN_HEADER_SEL,
      }
    );

    expect(
      result.ok,
      result.message ||
        `Column fill assertion failed: ` +
          `sumCols+spacer=${result.totalWidth.toFixed(2)}px ` +
          `(${result.colCount} cols + spacer=${result.spacerWidth.toFixed(
            2
          )}px) ` +
          `container.clientWidth=${result.containerClientWidth}px ` +
          `diff=${result.diff.toFixed(2)}px (must be ≤2px). ` +
          'At 2200px viewport the content area exceeds Universe column total, ' +
          'so .dms-col-spacer (flex:1 0 auto) must absorb all spare horizontal ' +
          'width so the row spans the full container (R3 regression guard).'
    ).toBe(true);
  });
});

// ─── AC4 — Beyond-table background color on wide viewport (1800px) ────────────

test.describe('Base Table Layout Regression — AC4: beyond-table background matches cell background', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1800, height: 900 });
    await navigateToUniverse(page);
  });

  test('Universe: body row background matches body cell background (beyond-table area)', async ({
    page,
  }) => {
    const result = await page.evaluate(
      function checkBackgroundColors(arg: {
        bodyRowSel: string;
        bodyCellSel: string;
      }): {
        ok: boolean;
        message: string;
        cellBg: string;
        rowBg: string;
      } {
        const { bodyRowSel, bodyCellSel } = arg;
        const bodyRow = document.querySelector<HTMLElement>(bodyRowSel);
        if (!bodyRow) {
          return {
            ok: false,
            message: 'precondition unmet: no body row visible',
            cellBg: '',
            rowBg: '',
          };
        }
        const bodyCell = bodyRow.querySelector<HTMLElement>(bodyCellSel);
        if (!bodyCell) {
          return {
            ok: false,
            message: 'precondition unmet: no body cell found in body row',
            cellBg: '',
            rowBg: '',
          };
        }

        const cellBg = window.getComputedStyle(bodyCell).backgroundColor;
        const rowBg = window.getComputedStyle(bodyRow).backgroundColor;

        return {
          ok: cellBg === rowBg,
          message: '',
          cellBg,
          rowBg,
        };
      },
      { bodyRowSel: BODY_ROW_SEL, bodyCellSel: BODY_CELL_SEL }
    );

    expect(
      result.ok,
      result.message ||
        `Background color mismatch: ` +
          `bodyCell.backgroundColor="${result.cellBg}" ` +
          `bodyRow.backgroundColor="${result.rowBg}". ` +
          'Both must resolve to the same surface color (var(--dms-surface)). ' +
          '.dms-body-row has background-color:var(--dms-surface) so the area ' +
          'beyond the last column (covered by .dms-col-spacer) matches cell ' +
          'background (R4 regression guard).'
    ).toBe(true);
  });
});
