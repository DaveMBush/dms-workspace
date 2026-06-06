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

/** Detached header region inside the clipped header viewport. */
const HEADER_REGION_SEL = '[data-testid="base-table-header"]';

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

interface HeaderViewportGeometryArgs {
  outerSel: string;
  headerViewportSel: string;
  bodySel: string;
  headerCellSel: string;
  bodyRowSel: string;
  bodyCellSel: string;
  baselineOuterRight: number;
  baselineHeaderTop: number;
  baselineHeaderRight: number;
  baselineHeaderCellLeft: number;
  baselineBodyCellLeft: number;
  previousBodyScrollLeft: number;
}

interface HeaderViewportGeometryResult {
  ok: boolean;
  outerRight: number;
  outerRightDrift: number;
  headerTop: number;
  headerTopDrift: number;
  headerRight: number;
  headerRightDrift: number;
  headerScrollLeft: number;
  bodyScrollLeft: number;
  scrollDelta: number;
  scrollMirrorDiff: number;
  headerCellShift: number;
  bodyCellShift: number;
  cellShiftDiff: number;
}

/**
 * Checks that detached header viewport stays fixed while outer scrollbar edge
 * remains pinned and header/body content stay horizontally aligned during
 * real horizontal scrolling.
 */
function checkHeaderViewportAndOuterGeometry(
  arg: HeaderViewportGeometryArgs
): HeaderViewportGeometryResult {
  function createMissingHeaderViewportGeometryResult(): HeaderViewportGeometryResult {
    return {
      ok: false,
      outerRight: 0,
      outerRightDrift: 9999,
      headerTop: 0,
      headerTopDrift: 9999,
      headerRight: 0,
      headerRightDrift: 9999,
      headerScrollLeft: 0,
      bodyScrollLeft: 0,
      scrollDelta: 0,
      scrollMirrorDiff: 9999,
      headerCellShift: 0,
      bodyCellShift: 0,
      cellShiftDiff: 9999,
    };
  }

  function isStableHeaderViewportGeometry(
    result: Omit<HeaderViewportGeometryResult, 'ok'>
  ): boolean {
    return (
      result.outerRightDrift <= 2 &&
      result.headerTopDrift <= 1 &&
      result.headerRightDrift <= 2 &&
      result.scrollDelta > 1 &&
      result.scrollMirrorDiff <= 1 &&
      result.cellShiftDiff <= 1
    );
  }

  function measureHeaderViewportGeometry():
    | Omit<HeaderViewportGeometryResult, 'ok'>
    | undefined {
    const outer = document.querySelector<HTMLElement>(arg.outerSel);
    const headerViewport = document.querySelector<HTMLElement>(
      arg.headerViewportSel
    );
    const body = document.querySelector<HTMLElement>(arg.bodySel);
    const headerCell = document.querySelector<HTMLElement>(arg.headerCellSel);
    const bodyRow = document.querySelector<HTMLElement>(arg.bodyRowSel);
    const bodyCell = bodyRow?.querySelector<HTMLElement>(arg.bodyCellSel);

    if (!outer || !headerViewport || !body || !headerCell || !bodyCell) {
      return undefined;
    }

    const outerRect = outer.getBoundingClientRect();
    const headerRect = headerViewport.getBoundingClientRect();
    const headerCellRect = headerCell.getBoundingClientRect();
    const bodyCellRect = bodyCell.getBoundingClientRect();
    const headerCellShift = arg.baselineHeaderCellLeft - headerCellRect.left;
    const bodyCellShift = arg.baselineBodyCellLeft - bodyCellRect.left;

    return {
      outerRight: outerRect.right,
      outerRightDrift: Math.abs(outerRect.right - arg.baselineOuterRight),
      headerTop: headerRect.top,
      headerTopDrift: Math.abs(headerRect.top - arg.baselineHeaderTop),
      headerRight: headerRect.right,
      headerRightDrift: Math.abs(headerRect.right - arg.baselineHeaderRight),
      headerScrollLeft: headerViewport.scrollLeft,
      bodyScrollLeft: body.scrollLeft,
      scrollDelta: body.scrollLeft - arg.previousBodyScrollLeft,
      scrollMirrorDiff: Math.abs(headerViewport.scrollLeft - body.scrollLeft),
      headerCellShift,
      bodyCellShift,
      cellShiftDiff: Math.abs(headerCellShift - bodyCellShift),
    };
  }

  const measured = measureHeaderViewportGeometry();

  if (!measured) {
    return createMissingHeaderViewportGeometryResult();
  }

  return {
    ok: isStableHeaderViewportGeometry(measured),
    ...measured,
  };
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

  test('Universe: detached header stays fixed while far-right scrollbar stays pinned at 50% and 100% horizontal scroll', async ({
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
    const baseline = await page.evaluate(
      function captureBaselineGeometry(arg: {
        outerSel: string;
        headerViewportSel: string;
        headerCellSel: string;
        bodySel: string;
        bodyRowSel: string;
        bodyCellSel: string;
      }): {
        ok: boolean;
        outerRight: number;
        headerTop: number;
        headerRight: number;
        headerCellLeft: number;
        bodyCellLeft: number;
      } {
        const outer = document.querySelector<HTMLElement>(arg.outerSel);
        const headerViewport = document.querySelector<HTMLElement>(
          arg.headerViewportSel
        );
        const headerCell = document.querySelector<HTMLElement>(
          arg.headerCellSel
        );
        const body = document.querySelector<HTMLElement>(arg.bodySel);
        const bodyRow = document.querySelector<HTMLElement>(arg.bodyRowSel);
        const bodyCell = bodyRow?.querySelector<HTMLElement>(arg.bodyCellSel);

        if (!outer || !headerViewport || !headerCell || !body || !bodyCell) {
          return {
            ok: false,
            outerRight: -9999,
            headerTop: -9999,
            headerRight: -9999,
            headerCellLeft: -9999,
            bodyCellLeft: -9999,
          };
        }

        body.scrollLeft = 0;

        const outerRect = outer.getBoundingClientRect();
        const headerRect = headerViewport.getBoundingClientRect();
        const headerCellRect = headerCell.getBoundingClientRect();
        const bodyCellRect = bodyCell.getBoundingClientRect();

        return {
          ok: true,
          outerRight: outerRect.right,
          headerTop: headerRect.top,
          headerRight: headerRect.right,
          headerCellLeft: headerCellRect.left,
          bodyCellLeft: bodyCellRect.left,
        };
      },
      {
        outerSel: OUTER_SCROLLER_SEL,
        headerViewportSel: HEADER_VIEWPORT_SEL,
        headerCellSel: COLUMN_HEADER_CELLS_SEL,
        bodySel: SCROLL_CONTAINER_SEL,
        bodyRowSel: BODY_ROW_SEL,
        bodyCellSel: BODY_CELL_SEL,
      }
    );

    if (!baseline.ok) {
      throw new Error(
        'Precondition failed: outer scroller or detached header viewport not found in DOM'
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

    const result50 = await page.evaluate(checkHeaderViewportAndOuterGeometry, {
      outerSel: OUTER_SCROLLER_SEL,
      headerViewportSel: HEADER_VIEWPORT_SEL,
      bodySel: SCROLL_CONTAINER_SEL,
      headerCellSel: COLUMN_HEADER_CELLS_SEL,
      bodyRowSel: BODY_ROW_SEL,
      bodyCellSel: BODY_CELL_SEL,
      baselineOuterRight: baseline.outerRight,
      baselineHeaderTop: baseline.headerTop,
      baselineHeaderRight: baseline.headerRight,
      baselineHeaderCellLeft: baseline.headerCellLeft,
      baselineBodyCellLeft: baseline.bodyCellLeft,
      previousBodyScrollLeft: 0,
    });

    expect(
      result50.ok,
      `At 50% horizontal scroll: outer right drift=${result50.outerRightDrift.toFixed(
        2
      )}px, header top drift=${result50.headerTopDrift.toFixed(
        2
      )}px, header right drift=${result50.headerRightDrift.toFixed(
        2
      )}px, body scroll delta=${result50.scrollDelta.toFixed(
        2
      )}px, header/body scroll diff=${result50.scrollMirrorDiff.toFixed(
        2
      )}px, header/body cell shift diff=${result50.cellShiftDiff.toFixed(
        2
      )}px. ` +
        'Detached header viewport must stay visually fixed while horizontal ' +
        'scroll advances and header/body content stay aligned.'
    ).toBe(true);

    // ── Scroll to 100% ────────────────────────────────────────────────────
    await page.evaluate(function scrollToMax(containerSel: string): void {
      const el = document.querySelector<HTMLElement>(containerSel);
      if (el) {
        el.scrollLeft = el.scrollWidth - el.clientWidth;
      }
    }, SCROLL_CONTAINER_SEL);

    await page.waitForTimeout(50);

    const result100 = await page.evaluate(checkHeaderViewportAndOuterGeometry, {
      outerSel: OUTER_SCROLLER_SEL,
      headerViewportSel: HEADER_VIEWPORT_SEL,
      bodySel: SCROLL_CONTAINER_SEL,
      headerCellSel: COLUMN_HEADER_CELLS_SEL,
      bodyRowSel: BODY_ROW_SEL,
      bodyCellSel: BODY_CELL_SEL,
      baselineOuterRight: baseline.outerRight,
      baselineHeaderTop: baseline.headerTop,
      baselineHeaderRight: baseline.headerRight,
      baselineHeaderCellLeft: baseline.headerCellLeft,
      baselineBodyCellLeft: baseline.bodyCellLeft,
      previousBodyScrollLeft: result50.bodyScrollLeft,
    });

    expect(
      result100.ok,
      `At 100% horizontal scroll: outer right drift=${result100.outerRightDrift.toFixed(
        2
      )}px, header top drift=${result100.headerTopDrift.toFixed(
        2
      )}px, header right drift=${result100.headerRightDrift.toFixed(
        2
      )}px, body scroll delta=${result100.scrollDelta.toFixed(
        2
      )}px, header/body scroll diff=${result100.scrollMirrorDiff.toFixed(
        2
      )}px, header/body cell shift diff=${result100.cellShiftDiff.toFixed(
        2
      )}px. ` +
        'Detached header viewport and far-right scrollbar edge must remain stable ' +
        'while header/body content stay aligned at max horizontal scroll.'
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
    await page.waitForFunction(
      function waitForMirroredHorizontalScroll(arg: {
        headerSel: string;
        bodySel: string;
        previousBodyScrollLeft: number;
      }): boolean {
        const header = document.querySelector<HTMLElement>(arg.headerSel);
        const body = document.querySelector<HTMLElement>(arg.bodySel);

        if (!header || !body) {
          return false;
        }

        return (
          body.scrollLeft > arg.previousBodyScrollLeft + 1 &&
          Math.abs(header.scrollLeft - body.scrollLeft) <= 1
        );
      },
      {
        headerSel: HEADER_VIEWPORT_SEL,
        bodySel: SCROLL_CONTAINER_SEL,
        previousBodyScrollLeft: before.bodyScrollLeft,
      },
      { timeout: 2000 }
    );

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

  test('Universe: wide viewport keeps far-right scrollbar placement and header/body width-fill alignment', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 2200, height: 900 });
    await navigateToUniverse(page);

    const result = await page.evaluate(
      function checkWideViewportLayout(arg: {
        outerSel: string;
        headerViewportSel: string;
        headerRegionSel: string;
        bodySel: string;
        bodyRowSel: string;
      }): {
        ok: boolean;
        message: string;
        outerParentDiff: number;
        outerRightDiff: number;
        viewportWidthDiff: number;
        rowWidthDiff: number;
      } {
        const outer = document.querySelector<HTMLElement>(arg.outerSel);
        const headerViewport = document.querySelector<HTMLElement>(
          arg.headerViewportSel
        );
        const headerRegion = document.querySelector<HTMLElement>(
          arg.headerRegionSel
        );
        const body = document.querySelector<HTMLElement>(arg.bodySel);
        const bodyRow = document.querySelector<HTMLElement>(arg.bodyRowSel);
        const outerParent = outer?.parentElement as HTMLElement | null;

        const missingParts = [
          ['outer', outer],
          ['parent', outerParent],
          ['headerViewport', headerViewport],
          ['headerRegion', headerRegion],
          ['body', body],
          ['bodyRow', bodyRow],
        ]
          .filter(function isMissing(entry): boolean {
            return !entry[1];
          })
          .map(function getMissingName(entry): string {
            return entry[0];
          });

        if (missingParts.length > 0) {
          return {
            ok: false,
            message: `precondition unmet: ${missingParts.join(', ')}`,
            outerParentDiff: 9999,
            outerRightDiff: 9999,
            viewportWidthDiff: 9999,
            rowWidthDiff: 9999,
          };
        }

        const outerRect = outer.getBoundingClientRect();
        const outerParentRect = outerParent.getBoundingClientRect();
        const headerViewportRect = headerViewport.getBoundingClientRect();
        const headerRegionRect = headerRegion.getBoundingClientRect();
        const bodyRect = body.getBoundingClientRect();
        const bodyRowRect = bodyRow.getBoundingClientRect();

        const outerParentDiff = Math.abs(
          outer.clientWidth - outerParent.clientWidth
        );
        const outerRightDiff = Math.abs(
          outerRect.right - outerParentRect.right
        );
        const viewportWidthDiff = Math.abs(
          headerViewportRect.width - body.clientWidth
        );
        const rowWidthDiff = Math.max(
          Math.abs(headerRegionRect.width - headerViewportRect.width),
          Math.abs(bodyRowRect.width - bodyRect.width)
        );

        const checks = [
          outerParentDiff <= 2,
          outerRightDiff <= 2,
          viewportWidthDiff <= 2,
          rowWidthDiff <= 2,
        ];

        return {
          ok: checks.every(function isPassing(check): boolean {
            return check;
          }),
          message: '',
          outerParentDiff,
          outerRightDiff,
          viewportWidthDiff,
          rowWidthDiff,
        };
      },
      {
        outerSel: OUTER_SCROLLER_SEL,
        headerViewportSel: HEADER_VIEWPORT_SEL,
        headerRegionSel: HEADER_REGION_SEL,
        bodySel: SCROLL_CONTAINER_SEL,
        bodyRowSel: BODY_ROW_SEL,
      }
    );

    expect(
      result.ok,
      result.message ||
        `Wide viewport layout mismatch: outerParentDiff=${result.outerParentDiff.toFixed(
          2
        )}px, outerRightDiff=${result.outerRightDiff.toFixed(
          2
        )}px, viewportWidthDiff=${result.viewportWidthDiff.toFixed(
          2
        )}px, rowWidthDiff=${result.rowWidthDiff.toFixed(2)}px. ` +
          'Outer scroller must fill available width, scrollbar edge must stay at far right, ' +
          'and detached header/body regions must keep width-fill alignment.'
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
