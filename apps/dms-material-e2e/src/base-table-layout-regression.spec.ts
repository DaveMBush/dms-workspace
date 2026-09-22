/**
 * base-table-layout-regression.spec.ts — Epic 112 (updated for mat-table + CDK virtual scroll)
 * ──────────────────────────────────────────────────────────────
 *
 * Regression suite for the four layout regressions fixed in Story 112.2,
 * re-expressed against the new single-viewport architecture:
 *   - dms-base-table .table-container (overflow:hidden, flex:1)
 *     └── cdk-virtual-scroll-viewport (display:block, position:relative)
 *           └── .cdk-virtual-scrollable (overflow:auto — THE scroller, both axes)
 *                 └── .cdk-virtual-scroll-content-wrapper (position:absolute)
 *                       └── mat-table (display:block) — div-based, no native <table>
 *                             ├── .dms-column-header-row (sticky top:0)
 *                             │     └── .dms-header-cell[role=columnheader]
 *                             └── .dms-body-row[role=row]
 *                                   └── .dms-body-cell[role=cell]
 *
 * FOUR ASSERTIONS (mapped to new DOM):
 *   (a) R1 — Scroll viewport right-edge stays stable across horizontal scroll.
 *       The .cdk-virtual-scrollable element is a block-level child of its parent;
 *       its bounding box must NOT shift when its own scrollLeft changes.
 *       Additionally the sticky header row top position must remain fixed during
 *       vertical scroll (header doesn't drift away from viewport top).
 *   (b) R2 — Scroll viewport fills its flex parent width.
 *       cdk-virtual-scroll-viewport.clientWidth ≈ .table-container.clientWidth.
 *       Before the fix the container was truncated to table content width,
 *       placing the scrollbar adjacent to the last column instead of the edge.
 *   (c) R3 — Header/body cell alignment: each header cell's left position matches
 *       the corresponding body cell's left position at all scroll positions.
 *       (Replaces the old "spacer absorbs spare width" check; in mat-table the
 *       background fill handles the beyond-columns area instead.)
 *   (d) R4 — Beyond-table background matches cell background.
 *       .dms-body-row backgroundColor === .dms-body-cell backgroundColor,
 *       so the area to the right of the last column blends seamlessly.
 *
 * CONSUMER: Universe (/global/universe).
 * BROWSERS: Chromium + Firefox (no .skip / .only annotations per AC6).
 */

import { expect, test, type Page } from 'playwright/test';
import { login } from './helpers/login.helper';
import { seedScrollUniverseData } from './helpers/seed-scroll-universe-data.helper';
import { settle } from './helpers/settle.helper';

// ─── Selectors (new mat-table + CDK virtual scroll DOM) ──────────────────────

/** Outer flex container that clips the table. */
const tableContainerSel = 'dms-base-table .table-container';

/** The CDK viewport wrapper (display:block, position:relative). */
const cdkViewportSel = 'cdk-virtual-scroll-viewport';

/** The actual scroll element — overflow:auto, owns both scrollbars. */
const scrollerSel = '.cdk-virtual-scrollable';

// Story 3.2: mat-table now renders div-based custom elements (no native
// <table>/<tr>/<th>/<td>). Rows keep role="row"; header cells keep
// role="columnheader" but body cells emit NO role, so we anchor on the
// preserved .dms-* classes instead of element/role selectors.

/** Sticky column-label header row (not the filter row). */
const headerRowSel = '.dms-column-header-row';

// Scoped to the column-label row: .dms-header-cell is also applied to the
// filter-row's header cells, so an unscoped global query would double-count.
/** Header cells (column labels). */
const headerCellSel =
  '.dms-column-header-row .dms-header-cell[role="columnheader"]';

/** Body data rows. */
const bodyRowSel = '.dms-body-row[role="row"]';

/** Body cells inside a row. */
const bodyCellSel = '.dms-body-cell[role="cell"]';

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
  await page.waitForSelector(bodyRowSel, { timeout: 15000 });
}

// ─── AC1 — Scroll viewport stability on narrow viewport (800px) ──────────────

test.describe('Base Table Layout Regression — AC1: scroll viewport stability on narrow viewport', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 900 });
    await navigateToUniverse(page);
  });

  test('Universe: scroll viewport right-edge stays fixed while horizontal scroll advances to 50% and 100%', async ({
    page,
  }) => {
    // Precondition: table must be wider than the viewport for horizontal scroll.
    const canScroll = await page
      .locator(scrollerSel)
      .first()
      .evaluate(function checkScrollable(el: Element): boolean {
        return el.scrollWidth > el.clientWidth;
      });

    if (!canScroll) {
      throw new Error(
        'Precondition failed: .cdk-virtual-scrollable is not horizontally ' +
          'scrollable at 800px viewport. Universe column total should exceed ' +
          'the content area; check column definitions and seeder.',
      );
    }

    // ── Capture baseline geometry at scrollLeft=0 ───────────────────────
    const baseline = await page.evaluate(
      function captureBaseline(arg: {
        scrollerSel: string;
        headerRowSel: string;
        headerCellSel: string;
        bodyRowSel: string;
        bodyCellSel: string;
      }): {
        ok: boolean;
        scrollerRight: number;
        scrollerTop: number;
        headerRowTop: number;
        firstHeaderCellLeft: number;
        firstBodyCellLeft: number;
      } {
        const scroller = document.querySelector<HTMLElement>(arg.scrollerSel);
        const headerRow = document.querySelector<HTMLElement>(arg.headerRowSel);
        const headerCell = document.querySelector<HTMLElement>(
          arg.headerCellSel,
        );
        const bodyRow = document.querySelector<HTMLElement>(arg.bodyRowSel);
        const bodyCell = bodyRow?.querySelector<HTMLElement>(arg.bodyCellSel);

        if (!scroller || !headerRow || !headerCell || !bodyCell) {
          return {
            ok: false,
            scrollerRight: -9999,
            scrollerTop: -9999,
            headerRowTop: -9999,
            firstHeaderCellLeft: -9999,
            firstBodyCellLeft: -9999,
          };
        }

        scroller.scrollLeft = 0;

        const sRect = scroller.getBoundingClientRect();
        const hRowRect = headerRow.getBoundingClientRect();
        const hCellRect = headerCell.getBoundingClientRect();
        const bCellRect = bodyCell.getBoundingClientRect();

        return {
          ok: true,
          scrollerRight: sRect.right,
          scrollerTop: sRect.top,
          headerRowTop: hRowRect.top,
          firstHeaderCellLeft: hCellRect.left,
          firstBodyCellLeft: bCellRect.left,
        };
      },
      { scrollerSel, headerRowSel, headerCellSel, bodyRowSel, bodyCellSel },
    );

    if (!baseline.ok) {
      throw new Error(
        'Precondition failed: scroll viewport or table rows not found in DOM',
      );
    }

    // ── Scroll to 50% horizontal ────────────────────────────────────────
    await page.evaluate(
      function scrollToPercent(arg: { sel: string; percent: number }): void {
        const el = document.querySelector<HTMLElement>(arg.sel);
        if (el) {
          el.scrollLeft = (el.scrollWidth - el.clientWidth) * arg.percent;
        }
      },
      { sel: scrollerSel, percent: 0.5 },
    );

    await settle(page, 50);

    const result50 = await page.evaluate(
      function checkGeometry(arg: {
        scrollerSel: string;
        headerRowSel: string;
        headerCellSel: string;
        bodyRowSel: string;
        bodyCellSel: string;
        baselineScrollerRight: number;
        baselineHeaderRowTop: number;
        baselineFirstHeaderCellLeft: number;
        baselineFirstBodyCellLeft: number;
      }): {
        ok: boolean;
        scrollerRightDrift: number;
        headerRowTopDrift: number;
        cellAlignmentDiff: number;
        scrollLeft: number;
      } {
        const scroller = document.querySelector<HTMLElement>(arg.scrollerSel);
        const headerRow = document.querySelector<HTMLElement>(arg.headerRowSel);
        const headerCell = document.querySelector<HTMLElement>(
          arg.headerCellSel,
        );
        const bodyRow = document.querySelector<HTMLElement>(arg.bodyRowSel);
        const bodyCell = bodyRow?.querySelector<HTMLElement>(arg.bodyCellSel);

        if (!scroller || !headerRow || !headerCell || !bodyCell) {
          return {
            ok: false,
            scrollerRightDrift: 9999,
            headerRowTopDrift: 9999,
            cellAlignmentDiff: 9999,
            scrollLeft: -1,
          };
        }

        const sRect = scroller.getBoundingClientRect();
        const hRowRect = headerRow.getBoundingClientRect();
        const hCellRect = headerCell.getBoundingClientRect();
        const bCellRect = bodyCell.getBoundingClientRect();

        return {
          ok: true,
          scrollerRightDrift: Math.abs(sRect.right - arg.baselineScrollerRight),
          headerRowTopDrift: Math.abs(hRowRect.top - arg.baselineHeaderRowTop),
          cellAlignmentDiff: Math.abs(hCellRect.left - bCellRect.left),
          scrollLeft: scroller.scrollLeft,
        };
      },
      {
        scrollerSel,
        headerRowSel,
        headerCellSel,
        bodyRowSel,
        bodyCellSel,
        baselineScrollerRight: baseline.scrollerRight,
        baselineHeaderRowTop: baseline.headerRowTop,
        baselineFirstHeaderCellLeft: baseline.firstHeaderCellLeft,
        baselineFirstBodyCellLeft: baseline.firstBodyCellLeft,
      },
    );

    expect(
      result50.ok,
      'Precondition failed at 50% scroll: elements not found',
    ).toBe(true);
    expect(
      result50.scrollerRightDrift,
      `At 50% horizontal scroll (scrollLeft=${result50.scrollLeft.toFixed(1)}px): ` +
        'scroller right-edge drifted by ' +
        `${result50.scrollerRightDrift.toFixed(2)}px from baseline. ` +
        'The scroll viewport bounding box must stay fixed while its content scrolls (R1).',
    ).toBeLessThanOrEqual(1);
    expect(
      result50.headerRowTopDrift,
      `At 50% horizontal scroll: sticky header row top drifted by ` +
        `${result50.headerRowTopDrift.toFixed(2)}px. Header must stay pinned to viewport top (R1).`,
    ).toBeLessThanOrEqual(1);
    expect(
      result50.cellAlignmentDiff,
      `At 50% horizontal scroll: header/body first cell left positions differ by ` +
        `${result50.cellAlignmentDiff.toFixed(2)}px. Header and body cells must stay aligned (R3).`,
    ).toBeLessThanOrEqual(1);

    // ── Scroll to 100% horizontal ───────────────────────────────────────
    await page.evaluate(function scrollToMax(sel: string): void {
      const el = document.querySelector<HTMLElement>(sel);
      if (el) {
        el.scrollLeft = el.scrollWidth - el.clientWidth;
      }
    }, scrollerSel);

    await settle(page, 50);

    const result100 = await page.evaluate(
      function checkGeometryMax(arg: {
        scrollerSel: string;
        headerRowSel: string;
        headerCellSel: string;
        bodyRowSel: string;
        bodyCellSel: string;
        baselineScrollerRight: number;
        baselineHeaderRowTop: number;
      }): {
        ok: boolean;
        scrollerRightDrift: number;
        headerRowTopDrift: number;
        cellAlignmentDiff: number;
        scrollLeft: number;
      } {
        const scroller = document.querySelector<HTMLElement>(arg.scrollerSel);
        const headerRow = document.querySelector<HTMLElement>(arg.headerRowSel);
        const headerCell = document.querySelector<HTMLElement>(
          arg.headerCellSel,
        );
        const bodyRow = document.querySelector<HTMLElement>(arg.bodyRowSel);
        const bodyCell = bodyRow?.querySelector<HTMLElement>(arg.bodyCellSel);

        if (!scroller || !headerRow || !headerCell || !bodyCell) {
          return {
            ok: false,
            scrollerRightDrift: 9999,
            headerRowTopDrift: 9999,
            cellAlignmentDiff: 9999,
            scrollLeft: -1,
          };
        }

        const sRect = scroller.getBoundingClientRect();
        const hRowRect = headerRow.getBoundingClientRect();
        const hCellRect = headerCell.getBoundingClientRect();
        const bCellRect = bodyCell.getBoundingClientRect();

        return {
          ok: true,
          scrollerRightDrift: Math.abs(sRect.right - arg.baselineScrollerRight),
          headerRowTopDrift: Math.abs(hRowRect.top - arg.baselineHeaderRowTop),
          cellAlignmentDiff: Math.abs(hCellRect.left - bCellRect.left),
          scrollLeft: scroller.scrollLeft,
        };
      },
      {
        scrollerSel,
        headerRowSel,
        headerCellSel,
        bodyRowSel,
        bodyCellSel,
        baselineScrollerRight: baseline.scrollerRight,
        baselineHeaderRowTop: baseline.headerRowTop,
      },
    );

    expect(
      result100.ok,
      'Precondition failed at 100% scroll: elements not found',
    ).toBe(true);
    expect(
      result100.scrollerRightDrift,
      `At 100% horizontal scroll (scrollLeft=${result100.scrollLeft.toFixed(1)}px): ` +
        'scroller right-edge drifted by ' +
        `${result100.scrollerRightDrift.toFixed(2)}px from baseline. ` +
        'The scroll viewport bounding box must stay fixed at max scroll (R1).',
    ).toBeLessThanOrEqual(1);
    expect(
      result100.headerRowTopDrift,
      `At 100% horizontal scroll: sticky header row top drifted by ` +
        `${result100.headerRowTopDrift.toFixed(2)}px (R1).`,
    ).toBeLessThanOrEqual(1);
    expect(
      result100.cellAlignmentDiff,
      `At 100% horizontal scroll: header/body first cell left positions differ by ` +
        `${result100.cellAlignmentDiff.toFixed(2)}px (R3).`,
    ).toBeLessThanOrEqual(1);
  });

  test('Universe: wheel input over sticky header scrolls the table horizontally', async ({
    page,
  }) => {
    const canScroll = await page
      .locator(scrollerSel)
      .first()
      .evaluate(function checkScrollable(el: Element): boolean {
        return el.scrollWidth > el.clientWidth;
      });

    if (!canScroll) {
      throw new Error(
        'Precondition failed: .cdk-virtual-scrollable is not horizontally ' +
          'scrollable at 800px viewport.',
      );
    }

    const before = await page.evaluate(function captureState(
      sel: string,
    ): number {
      const el = document.querySelector<HTMLElement>(sel);
      if (!el) {
        throw new Error('Precondition failed: scroller not found');
      }
      el.scrollLeft = 0;
      return el.scrollLeft;
    }, scrollerSel);

    // Hover over the sticky header row (inside the scroll viewport).
    await page.locator(headerRowSel).hover();
    await page.mouse.wheel(240, 0);

    await page.waitForFunction(
      function waitForScroll(arg: { sel: string; prev: number }): boolean {
        const el = document.querySelector<HTMLElement>(arg.sel);
        return !!el && el.scrollLeft > arg.prev + 1;
      },
      { sel: scrollerSel, prev: before },
      { timeout: 2000 },
    );

    const afterValue = await page.evaluate(function getScroll(
      sel: string,
    ): number {
      return document.querySelector<HTMLElement>(sel)?.scrollLeft ?? -1;
    }, scrollerSel);

    expect(
      afterValue,
      `Wheel over sticky header should scroll the table horizontally. ` +
        `Observed scrollLeft before=${before.toFixed(2)} after=${afterValue.toFixed(2)}.`,
    ).toBeGreaterThan(before + 1);
  });
});

// ─── AC2 — Container width on wide viewport (1800px) ─────────────────────────

test.describe('Base Table Layout Regression — AC2: scroll viewport fills parent on wide viewport', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1800, height: 900 });
    await navigateToUniverse(page);
  });

  test('Universe: CDK scroll viewport fills its flex parent (not truncated to table width)', async ({
    page,
  }) => {
    const result = await page.evaluate(
      function checkViewportFillsParent(arg: {
        containerSel: string;
        cdkViewportSel: string;
      }): {
        ok: boolean;
        containerWidth: number;
        viewportWidth: number;
        diff: number;
      } {
        const container = document.querySelector<HTMLElement>(arg.containerSel);
        const viewport = document.querySelector<HTMLElement>(
          arg.cdkViewportSel,
        );

        if (!container || !viewport) {
          return { ok: false, containerWidth: 0, viewportWidth: 0, diff: 9999 };
        }

        const cw = container.clientWidth;
        const vw = viewport.clientWidth;
        const diff = Math.abs(cw - vw);
        return { ok: diff <= 2, containerWidth: cw, viewportWidth: vw, diff };
      },
      { containerSel: tableContainerSel, cdkViewportSel },
    );

    expect(
      result.ok,
      `cdk-virtual-scroll-viewport.clientWidth=${result.viewportWidth}px ` +
        `.table-container.clientWidth=${result.containerWidth}px ` +
        `diff=${result.diff.toFixed(2)}px (must be ≤2px). ` +
        'At 1800px viewport the scroll viewport must span its full flex parent — ' +
        'it must NOT be truncated to the table content width (R2 regression guard).',
    ).toBe(true);
  });

  test('Universe: wide viewport keeps header/body alignment and stable geometry at 2200px', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 2200, height: 900 });
    await navigateToUniverse(page);

    const result = await page.evaluate(
      function checkWideLayout(arg: {
        containerSel: string;
        cdkViewportSel: string;
        scrollerSel: string;
        headerRowSel: string;
        bodyRowSel: string;
      }): {
        ok: boolean;
        message: string;
        viewportParentDiff: number;
        headerBodyAlignDiff: number;
      } {
        const container = document.querySelector<HTMLElement>(arg.containerSel);
        const viewport = document.querySelector<HTMLElement>(
          arg.cdkViewportSel,
        );
        const scroller = document.querySelector<HTMLElement>(arg.scrollerSel);
        const headerRow = document.querySelector<HTMLElement>(arg.headerRowSel);
        const bodyRow = document.querySelector<HTMLElement>(arg.bodyRowSel);

        if (!container || !viewport || !scroller || !headerRow || !bodyRow) {
          return {
            ok: false,
            message: 'precondition unmet: missing elements',
            viewportParentDiff: 9999,
            headerBodyAlignDiff: 9999,
          };
        }

        const vpDiff = Math.abs(viewport.clientWidth - container.clientWidth);

        // Check first header cell vs first body cell alignment.
        const hCell = headerRow.querySelector<HTMLElement>('.dms-header-cell');
        const bCell = bodyRow.querySelector<HTMLElement>('.dms-body-cell');
        let alignDiff = 0;
        if (hCell && bCell) {
          alignDiff = Math.abs(
            hCell.getBoundingClientRect().left -
              bCell.getBoundingClientRect().left,
          );
        } else {
          alignDiff = 9999;
        }

        return {
          ok: vpDiff <= 2 && alignDiff <= 1,
          message: '',
          viewportParentDiff: vpDiff,
          headerBodyAlignDiff: alignDiff,
        };
      },
      {
        containerSel: tableContainerSel,
        cdkViewportSel,
        scrollerSel,
        headerRowSel,
        bodyRowSel,
      },
    );

    expect(
      result.ok,
      result.message ||
        `Wide viewport layout mismatch: viewportParentDiff=${result.viewportParentDiff.toFixed(2)}px, ` +
          `headerBodyAlignDiff=${result.headerBodyAlignDiff.toFixed(2)}px. ` +
          'Scroll viewport must fill parent and header/body cells must stay aligned (R2+R3).',
    ).toBe(true);
  });
});

// ─── AC3 — Column alignment on very wide viewport (2200px) ──────────────────

test.describe('Base Table Layout Regression — AC3: column alignment on wide viewport', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 2200, height: 900 });
    await navigateToUniverse(page);
  });

  test('Universe: all header cells align with corresponding body cells at zero scroll', async ({
    page,
  }) => {
    const result = await page.evaluate(
      function checkColumnAlignment(arg: {
        scrollerSel: string;
        headerCellSel: string;
        bodyRowSel: string;
        bodyCellSel: string;
      }): {
        ok: boolean;
        message: string;
        colCount: number;
        maxDiff: number;
      } {
        const scroller = document.querySelector<HTMLElement>(arg.scrollerSel);
        if (scroller) {
          scroller.scrollLeft = 0;
        }

        const headerCells = Array.from(
          document.querySelectorAll<HTMLElement>(arg.headerCellSel),
        );
        const bodyRow = document.querySelector<HTMLElement>(arg.bodyRowSel);
        const bodyCells = bodyRow
          ? Array.from(bodyRow.querySelectorAll<HTMLElement>(arg.bodyCellSel))
          : [];

        if (headerCells.length === 0 || bodyCells.length === 0) {
          return {
            ok: false,
            message: 'precondition unmet: no cells found',
            colCount: 0,
            maxDiff: 9999,
          };
        }

        const count = Math.min(headerCells.length, bodyCells.length);
        let maxDiff = 0;
        for (let i = 0; i < count; i++) {
          const hLeft = headerCells[i].getBoundingClientRect().left;
          const bLeft = bodyCells[i].getBoundingClientRect().left;
          const diff = Math.abs(hLeft - bLeft);
          if (diff > maxDiff) {
            maxDiff = diff;
          }
        }

        return { ok: maxDiff <= 1, message: '', colCount: count, maxDiff };
      },
      { scrollerSel, headerCellSel, bodyRowSel, bodyCellSel },
    );

    expect(
      result.ok,
      result.message ||
        `Column alignment failed: ${result.colCount} columns checked, ` +
          `max header/body left-position diff=${result.maxDiff.toFixed(2)}px (must be ≤1px). ` +
          'Each header cell must align with its corresponding body cell (R3 regression guard).',
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
        const bodyRow = document.querySelector<HTMLElement>(arg.bodyRowSel);
        if (!bodyRow) {
          return {
            ok: false,
            message: 'precondition unmet: no body row visible',
            cellBg: '',
            rowBg: '',
          };
        }
        const bodyCell = bodyRow.querySelector<HTMLElement>(arg.bodyCellSel);
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

        return { ok: cellBg === rowBg, message: '', cellBg, rowBg };
      },
      { bodyRowSel, bodyCellSel },
    );

    expect(
      result.ok,
      result.message ||
        `Background color mismatch: ` +
          `bodyCell.backgroundColor="${result.cellBg}" ` +
          `bodyRow.backgroundColor="${result.rowBg}". ` +
          'Both must resolve to the same surface color (var(--dms-surface)) so the area ' +
          'beyond the last column matches cell background (R4 regression guard).',
    ).toBe(true);
  });
});
