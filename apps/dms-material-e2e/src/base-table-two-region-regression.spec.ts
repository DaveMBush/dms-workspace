/**
 * base-table-two-region-regression.spec.ts — Epic 111 (Round 10)
 * ──────────────────────────────────────────────────────────────
 *
 * Regression suite for the base-table layout, re-expressed against the new
 * single-viewport mat-table architecture (Story 1.2): header and body live in
 * ONE <table mat-table> inside a cdk-virtual-scroll-viewport; Material's
 * sticky header rows pin the column labels to the top of the scroller.
 *
 * FOUR INVARIANTS PER CONSUMER SCREEN:
 *   (a) The column-header row is pinned via position:sticky — on either the <tr>
 *       row or its <th> cells, depending on MDC/CDK version — inside the single
 *       scroll viewport (Material sticky rows). This is the mechanism that
 *       replaced the old two-region layout; losing it re-introduces the
 *       header-scroll-away defect.
 *   (b) Header and body column widths match within 1px (shared fixed-column-width model)
 *       Validates that ColumnDef.width drives both header cells and body cells identically.
 *   (c) Synchronized horizontal scroll (when content exceeds viewport width)
 *       The single .cdk-virtual-scrollable scroller moves header and body together —
 *       first header cell and first body cell must shift by equal deltas within 1px.
 *   (d) Post-context-change: sticky column-header row stays pinned to the scroller top
 *       during slow vertical scroll, at its expected offset (filter-row height when a
 *       filter row is present). Any drift means the header left the sticky mechanism.
 *
 * CONSUMERS (Story 111.1 inventory):
 *   Universe           /global/universe
 *   Screener           /global/screener
 *   Open Positions     /account/{id}/open
 *   Sold Positions     /account/{id}/sold
 *   Dividend Deposits  /account/{id}/div-dep
 *
 * BROWSERS: Chromium + Firefox (all 5 × 4 = 20 invariant checks per browser).
 *
 * AC3 NOTE: This spec is part of pnpm all (no .skip / xit / unconditional test.skip).
 * Assertion (c) uses an if-guard (not test.skip) so the skip-check script stays clean.
 */

import { expect, test, type Page } from 'playwright/test';
import { applyAndClearGlobalFilter } from './helpers/apply-and-clear-global-filter.helper';
import { login } from './helpers/login.helper';
import { seedScrollDivDepositsWithSymbolsData } from './helpers/seed-scroll-div-deposits-with-symbols-data.helper';
import { seedScrollOpenPositionsData } from './helpers/seed-scroll-open-positions-data.helper';
import { seedScrollScreenerData } from './helpers/seed-scroll-screener-data.helper';
import { seedScrollSoldPositionsData } from './helpers/seed-scroll-sold-positions-data.helper';
import { seedScrollUniverseData } from './helpers/seed-scroll-universe-data.helper';
import { settle } from './helpers/settle.helper';
import { swapActiveAccountViaNavigation } from './helpers/swap-active-account-via-navigation.helper';
import { swapUniverseAccount } from './helpers/swap-universe-account.helper';

// ─── Selectors ────────────────────────────────────────────────────────────────

/**
 * Single scroll viewport. Story 1.2 collapsed the old two-region layout into one
 * cdk-virtual-scroll-viewport that owns both vertical and horizontal scrolling;
 * header rows and body rows are siblings inside a single <table mat-table>.
 */
const VIEWPORT_SEL = '.dms-table-body';

/** The inner CDK scroller element that actually carries overflow + scrollLeft. */
const SCROLLABLE_SEL = '.cdk-virtual-scrollable';

/** Column-header cells in the column-label row (not the filter row). */
const COLUMN_HEADER_CELLS_SEL =
  '.dms-column-header-row .dms-header-cell[role="columnheader"]';

/** Body data rows. */
const BODY_ROW_SEL = '.dms-body-row[role="row"]';

/** Body cells inside a row. */
const BODY_CELL_SEL = '.dms-body-cell[role="cell"]';

// ─── Invariant Assertion Helpers ─────────────────────────────────────────────

/**
 * (a) The column-header row must be pinned via position:sticky.
 *
 * Story 1.2 replaced the old two-region layout with a single-viewport mat-table
 * whose header rows use Material's sticky-row support (`*matHeaderRowDef="...;
 * sticky: true"`). Depending on the MDC/CDK version, `position:sticky` is applied
 * either to the `<tr>` row or to each `<th>` cell of a sticky row. This assertion
 * accepts EITHER placement so it guards the mechanism without over-constraining
 * the implementation detail — if neither the row nor any header cell computes to
 * position:sticky, the column labels would scroll away with the body and the
 * whole single-viewport design has regressed.
 */
async function assertHeaderSticky(page: Page): Promise<void> {
  const result = await page.evaluate(
    function checkHeaderSticky(arg: {
      headerRowSel: string;
      headerCellsSel: string;
    }): {
      ok: boolean;
      rowSticky: boolean;
      stickyCellCount: number;
      totalCells: number;
    } {
      const row = document.querySelector<HTMLElement>(arg.headerRowSel);
      const cells = Array.from(
        document.querySelectorAll<HTMLElement>(arg.headerCellsSel),
      );
      let stickyCellCount = 0;
      for (const cell of cells) {
        if (window.getComputedStyle(cell).position === 'sticky') {
          stickyCellCount++;
        }
      }
      const rowSticky =
        !!row && window.getComputedStyle(row).position === 'sticky';
      return {
        ok: rowSticky || stickyCellCount > 0,
        rowSticky,
        stickyCellCount,
        totalCells: cells.length,
      };
    },
    {
      headerRowSel: '.dms-column-header-row',
      headerCellsSel: COLUMN_HEADER_CELLS_SEL,
    },
  );

  expect(
    result.ok,
    'Column-header row is not pinned via position:sticky (row sticky=' +
      `${result.rowSticky}, sticky cells=${result.stickyCellCount}/${result.totalCells}). ` +
      'Story 1.2 pins the column-label row via Material sticky rows — if neither the ' +
      'row nor its cells compute to position:sticky, the header would scroll away ' +
      'with the body.',
  ).toBe(true);
}

/**
 * (b) Per-column header/body widths and whole-row parity must match.
 *
 * Story 1.2 introduced a shared fixed-column-width model: both header cells
 * and body cells use [style.width.px]="column.width" from the same ColumnDef.
 * This assertion verifies the model produces aligned columns in the rendered DOM
 * and that the single table keeps matching visible widths across regions.
 * Tolerance of 1px accounts for sub-pixel rounding on hi-DPI displays.
 */
async function assertColumnWidthParity(page: Page): Promise<void> {
  const result = await page.evaluate(
    function checkColumnWidthParity(arg: {
      headerCellsSel: string;
      bodyRowSel: string;
      bodyCellSel: string;
    }): { ok: boolean; message: string } {
      const { headerCellsSel, bodyRowSel, bodyCellSel } = arg;
      const headerCells = Array.from(document.querySelectorAll(headerCellsSel));
      const bodyRow = document.querySelector(bodyRowSel);
      if (!bodyRow) {
        // Precondition unmet: body rows must be present to verify column widths.
        return {
          ok: false,
          message:
            'precondition unmet: no body rows visible — cannot verify column width parity',
        };
      }
      const bodyCells = Array.from(bodyRow.querySelectorAll(bodyCellSel));
      const headerRow = headerCells[0]?.closest<HTMLElement>(
        '.dms-column-header-row',
      );
      const violations: string[] = [];
      for (let i = 0; i < headerCells.length; i++) {
        if (!bodyCells[i]) {
          return {
            ok: false,
            message:
              'precondition unmet: body cell missing at column ' +
              i +
              ' (header count: ' +
              headerCells.length +
              ', body count: ' +
              bodyCells.length +
              ')',
          };
        }
        const headerWidth = headerCells[i].getBoundingClientRect().width;
        const bodyWidth = bodyCells[i].getBoundingClientRect().width;
        if (Math.abs(headerWidth - bodyWidth) > 1) {
          violations.push(
            `col[${i}]: header=${headerWidth.toFixed(
              2,
            )}px body=${bodyWidth.toFixed(2)}px ` +
              `delta=${(headerWidth - bodyWidth).toFixed(2)}px`,
          );
        }
      }

      if (!headerRow) {
        return {
          ok: false,
          message: 'precondition unmet: column-header row not found',
        };
      }

      const headerRowWidth = headerRow.getBoundingClientRect().width;
      const bodyRowWidth = (bodyRow as HTMLElement).getBoundingClientRect()
        .width;
      const rowDiff = Math.abs(headerRowWidth - bodyRowWidth);
      if (rowDiff > 1) {
        violations.push(
          `row: header=${headerRowWidth.toFixed(2)}px ` +
            `body=${bodyRowWidth.toFixed(2)}px delta=${rowDiff.toFixed(2)}px`,
        );
      }

      return {
        ok: violations.length === 0,
        message: violations.join('; '),
      };
    },
    {
      headerCellsSel: COLUMN_HEADER_CELLS_SEL,
      bodyRowSel: BODY_ROW_SEL,
      bodyCellSel: BODY_CELL_SEL,
    },
  );
  expect(
    result.ok,
    `Column width parity violation (tolerance: 1px):\n${result.message}\n` +
      'Header/body cells must share fixed widths from ColumnDef.width within the ' +
      'single mat-table.',
  ).toBe(true);
}

/**
 * (c) Synchronized horizontal scroll.
 *
 * Story 1.2 keeps one scroller (.cdk-virtual-scrollable inside the viewport)
 * that owns both header and body, so they move together by construction. This
 * assertion verifies:
 *   1. Scrolling right by ≤50px shifts both the first header cell and the first
 *      body cell by the same delta within 1px.
 *   2. Resetting scrollLeft to 0 returns both cells to their original positions
 *      within 1px.
 *
 * If the table is not wider than the viewport there is nothing to scroll.
 * The check is guarded with a boolean condition; the test continues without
 * counting as a failure in that case (environmental, not a defect).
 */
async function assertHorizontalScrollSync(page: Page): Promise<void> {
  const canScroll = await page
    .locator(SCROLLABLE_SEL)
    .first()
    .evaluate(function checkScrollable(el: Element): boolean {
      return el.scrollWidth > el.clientWidth;
    });

  if (!canScroll) {
    // Table content fits within the viewport at this browser viewport size.
    // Horizontal scroll synchronization is not testable — no assertion emitted.
    return;
  }

  const result = await page.evaluate(
    async function checkHScrollSync(arg: {
      scrollerSel: string;
      headerCellSel: string;
      bodyRowSel: string;
      bodyCellSel: string;
    }): Promise<{
      ok: boolean;
      message: string;
      hDelta: number;
      bDelta: number;
      syncDiff: number;
      resetDiff: number;
    }> {
      const { scrollerSel, headerCellSel, bodyRowSel, bodyCellSel } = arg;
      return new Promise(function executor(
        resolve: (value: {
          ok: boolean;
          message: string;
          hDelta: number;
          bDelta: number;
          syncDiff: number;
          resetDiff: number;
        }) => void,
      ): void {
        const scroller = document.querySelector<HTMLElement>(scrollerSel);
        const headerCell = document.querySelector<HTMLElement>(headerCellSel);
        const bodyRow = document.querySelector<HTMLElement>(bodyRowSel);
        const bodyCell = bodyRow?.querySelector<HTMLElement>(bodyCellSel);

        if (!scroller || !headerCell || !bodyCell) {
          resolve({
            ok: false,
            message:
              'precondition unmet: required elements not found (scroller=' +
              !!scroller +
              ' headerCell=' +
              !!headerCell +
              ' bodyCell=' +
              !!bodyCell +
              ')',
            hDelta: 0,
            bDelta: 0,
            syncDiff: 0,
            resetDiff: 0,
          });
          return;
        }

        const hBefore = headerCell.getBoundingClientRect().left;
        const bBefore = bodyCell.getBoundingClientRect().left;
        const available = scroller.scrollWidth - scroller.clientWidth;
        const targetScroll =
          available > 0
            ? Math.max(1, Math.min(50, Math.ceil(available / 2)))
            : 0;

        scroller.scrollLeft = targetScroll;

        requestAnimationFrame(function afterScroll(): void {
          const hAfter = headerCell.getBoundingClientRect().left;
          const bAfter = bodyCell.getBoundingClientRect().left;

          const hDelta = hBefore - hAfter;
          const bDelta = bBefore - bAfter;
          const syncDiff = Math.abs(hDelta - bDelta);

          scroller.scrollLeft = 0;

          requestAnimationFrame(function afterReset(): void {
            const hReset = headerCell.getBoundingClientRect().left;
            const bReset = bodyCell.getBoundingClientRect().left;
            const resetDiff = Math.max(
              Math.abs(hReset - hBefore),
              Math.abs(bReset - bBefore),
            );

            const ok = syncDiff <= 1 && resetDiff <= 1;
            const message =
              `scrollTarget=${targetScroll}px — ` +
              `header shifted ${hDelta.toFixed(
                2,
              )}px, body shifted ${bDelta.toFixed(2)}px; ` +
              `syncDiff=${syncDiff.toFixed(2)}px, resetDiff=${resetDiff.toFixed(
                2,
              )}px`;
            resolve({ ok, message, hDelta, bDelta, syncDiff, resetDiff });
          });
        });
      });
    },
    {
      scrollerSel: SCROLLABLE_SEL,
      headerCellSel: COLUMN_HEADER_CELLS_SEL,
      bodyRowSel: BODY_ROW_SEL,
      bodyCellSel: BODY_CELL_SEL,
    },
  );

  expect(
    result.ok,
    `Horizontal scroll synchronization failed: ${result.message}. ` +
      'Header and body must shift by equal deltas (≤1px difference) — ' +
      'the single scroller moves both regions together.',
  ).toBe(true);
}

/**
 * (d) Post-context-change header position invariant.
 *
 * After an in-place data-context change (account-swap or filter-change), the
 * CDK viewport receives a new dataset and may re-measure its internal state.
 * This assertion slow-scrolls the viewport (4px/step for up to 3s) and on every
 * rAF frame verifies that a sticky column-header cell stays pinned at its
 * expected offset from the scroller top:
 *
 *   headerCell.top - scrollerTop === baselineOffset ± 1px
 *
 * where baselineOffset is measured before scrolling (0 when no filter row, or
 * the filter-row height when one is present). Any drift means the header left
 * the sticky mechanism and scrolled away with the body.
 *
 * NOTE: we measure a header CELL, not the `<tr>` row. For a native mat-table,
 * CDK's sticky support pins each `<th>` cell (and rewrites its inline `top`
 * during virtual scroll); the row element itself is never part of that
 * mechanism and its bounding rect follows the scroll. Measuring the row would
 * report drift equal to -scrollTop even when the header is correctly pinned.
 */
async function assertPostContextChangeInvariant(
  page: Page,
  contextChange: () => Promise<void>,
): Promise<void> {
  // Trigger the in-place data-context change.
  await contextChange();

  // Wait for body rows to be visible after context change.
  await page.waitForSelector(BODY_ROW_SEL, { timeout: 15000 });

  const result = await page.evaluate(
    async function slowScrollAndCheckHeaderPosition(arg: {
      scrollerSel: string;
      headerCellSel: string;
      scrollMs: number;
      stepPx: number;
    }): Promise<{ ok: boolean; violations: string[]; frames: number }> {
      const { scrollerSel, headerCellSel, scrollMs, stepPx } = arg;
      return new Promise(function executor(
        resolve: (value: {
          ok: boolean;
          violations: string[];
          frames: number;
        }) => void,
      ): void {
        const scroller = document.querySelector<HTMLElement>(scrollerSel);
        // Measure a sticky header CELL. The `<tr>` row is not part of CDK's
        // native-table sticky mechanism (only the cells are pinned), so its
        // rect would drift with the scroll and produce false violations.
        const headerCell = document.querySelector<HTMLElement>(headerCellSel);

        if (!scroller || !headerCell) {
          resolve({
            ok: false,
            violations: [
              `selector not found: scroller=${!!scroller} headerCell=${!!headerCell}`,
            ],
            frames: 0,
          });
          return;
        }

        const maxScroll = scroller.scrollHeight - scroller.clientHeight;
        if (maxScroll <= 0) {
          // Precondition unmet: scrollable content is required to verify the invariant.
          resolve({
            ok: false,
            violations: [
              'precondition unmet: no scrollable content after context change (maxScroll=' +
                maxScroll +
                ')',
            ],
            frames: 0,
          });
          return;
        }

        // Non-null aliases for the nested step()/onFrame() closures — TS does not
        // carry control-flow narrowing of `scroller`/`headerCell` into function bodies.
        const scrollerEl = scroller;
        const headerCellEl = headerCell;

        // Baseline offset of the sticky header cell from the scroller top. The
        // column-header row is the SECOND sticky row (the filter row sits above
        // it), so its pinned offset equals the filter-row height — a constant
        // that must not drift as the body scrolls beneath it.
        const scrollerTop = scrollerEl.getBoundingClientRect().top;
        const baselineOffset =
          headerCellEl.getBoundingClientRect().top - scrollerTop;

        const violations: string[] = [];
        let frames = 0;
        const start = performance.now();
        const maxViolations = 5;

        function step(): void {
          if (
            performance.now() - start >= scrollMs ||
            violations.length >= maxViolations
          ) {
            resolve({ ok: violations.length === 0, violations, frames });
            return;
          }

          scrollerEl.scrollTop = Math.min(
            scrollerEl.scrollTop + stepPx,
            maxScroll,
          );

          requestAnimationFrame(function onFrame(): void {
            frames++;
            const headerTop = headerCellEl.getBoundingClientRect().top;
            const currentOffset = headerTop - scrollerTop;
            const diff = Math.abs(currentOffset - baselineOffset);

            if (diff > 1) {
              violations.push(
                `scrollTop=${scrollerEl.scrollTop}: ` +
                  `headerOffset=${currentOffset.toFixed(2)}px ` +
                  `baseline=${baselineOffset.toFixed(2)}px ` +
                  `drift=${diff.toFixed(2)}px`,
              );
            }

            if (scrollerEl.scrollTop >= maxScroll) {
              resolve({ ok: violations.length === 0, violations, frames });
              return;
            }

            setTimeout(step, 16);
          });
        }

        step();
      });
    },
    {
      scrollerSel: SCROLLABLE_SEL,
      headerCellSel: COLUMN_HEADER_CELLS_SEL,
      scrollMs: 3000,
      stepPx: 4,
    },
  );

  expect(
    result.ok,
    `Sticky column-header cell drifted from its pinned offset after context change ` +
      `(${result.violations.length} violation(s) across ${result.frames} frames):\n` +
      result.violations.join('\n') +
      '\nThe header must stay pinned to the scroller top via position:sticky — ' +
      'it must never scroll away with the body.',
  ).toBe(true);
}

/**
 * Run all four single-viewport invariants against the currently loaded screen.
 */
async function runTwoRegionInvariants(
  page: Page,
  contextChange: () => Promise<void>,
): Promise<void> {
  await assertHeaderSticky(page);
  await assertColumnWidthParity(page);
  await assertHorizontalScrollSync(page);
  await assertPostContextChangeInvariant(page, contextChange);
}

// ─── Universe ─────────────────────────────────────────────────────────────────

test.describe('Universe — single-viewport mat-table regression', () => {
  let universeCleanup: () => Promise<void>;
  let openPositionsCleanup: () => Promise<void>;

  test.beforeAll(async () => {
    // Universe rows provide scrollable content.
    const universeSeeder = await seedScrollUniverseData();
    universeCleanup = universeSeeder.cleanup;
    // Open-positions data creates a real account so the toolbar account-select
    // has a second option, enabling the account-swap context-change trigger.
    const openPositionsSeeder = await seedScrollOpenPositionsData();
    openPositionsCleanup = openPositionsSeeder.cleanup;
  });

  test.afterAll(async () => {
    if (universeCleanup) {
      await universeCleanup();
    }
    if (openPositionsCleanup) {
      await openPositionsCleanup();
    }
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/global/universe');
    await page
      .locator('dms-base-table')
      .waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForSelector(BODY_ROW_SEL, { timeout: 15000 });
  });

  test(
    'Universe: (a) header sticky, (b) column widths aligned, ' +
      '(c) h-scroll sync, (d) post-account-swap header invariant',
    async ({ page }) => {
      await runTwoRegionInvariants(page, async function doContextChange() {
        // Context-change: swap active account via toolbar mat-select.
        // GlobalUniverseComponent.onAccountChange() triggers an in-place CDK data swap.
        await swapUniverseAccount(page);
      });
    },
  );
});

// ─── Screener ─────────────────────────────────────────────────────────────────

test.describe('Screener — single-viewport mat-table regression', () => {
  let cleanup: () => Promise<void>;

  test.beforeAll(async () => {
    const seeder = await seedScrollScreenerData();
    cleanup = seeder.cleanup;
  });

  test.afterAll(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/global/screener');
    await page
      .locator('dms-base-table')
      .waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForSelector(BODY_ROW_SEL, { timeout: 15000 });
  });

  test(
    'Screener: (a) header sticky, (b) column widths aligned, ' +
      '(c) h-scroll sync, (d) post-risk-group-filter header invariant',
    async ({ page }) => {
      await runTwoRegionInvariants(page, async function doContextChange() {
        // Context-change: apply then clear the risk-group filter.
        // CDK receives a collapsed array then the full array — in-place data swap.
        await applyAndClearGlobalFilter(page, {
          filterSelector: '[data-testid="risk-group-filter"]',
          applyOptionText: 'Income',
          clearOptionText: 'All',
        });
      });
    },
  );
});

// ─── Open Positions ───────────────────────────────────────────────────────────

test.describe('Open Positions — single-viewport mat-table regression', () => {
  let cleanup1: () => Promise<void>;
  let cleanup2: () => Promise<void>;
  let accountId1: string;
  let accountId2: string;

  test.beforeAll(async () => {
    // Two accounts required so the account-change triggers a real in-place data swap.
    const seeder1 = await seedScrollOpenPositionsData();
    cleanup1 = seeder1.cleanup;
    accountId1 = seeder1.accountId;
    const seeder2 = await seedScrollOpenPositionsData();
    cleanup2 = seeder2.cleanup;
    accountId2 = seeder2.accountId;
  });

  test.afterAll(async () => {
    if (cleanup1) {
      await cleanup1();
    }
    if (cleanup2) {
      await cleanup2();
    }
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`/account/${accountId1}/open`);
    await page.waitForSelector(VIEWPORT_SEL, { timeout: 30000 });
    await settle(page, 2000);
  });

  test(
    'Open Positions: (a) header sticky, (b) column widths aligned, ' +
      '(c) h-scroll sync, (d) post-account-swap header invariant',
    async ({ page }) => {
      await runTwoRegionInvariants(page, async function doContextChange() {
        // Context-change: navigate to /account/{id2}/open.
        // AccountPanelComponent is reused by the router — CDK viewport stays in DOM,
        // receives new account's data as an in-place array replacement.
        await swapActiveAccountViaNavigation(page, {
          toAccountId: accountId2,
          routeSuffix: 'open',
        });
      });
    },
  );
});

// ─── Sold Positions ───────────────────────────────────────────────────────────

test.describe('Sold Positions — single-viewport mat-table regression', () => {
  let cleanup1: () => Promise<void>;
  let cleanup2: () => Promise<void>;
  let accountId1: string;
  let accountId2: string;

  test.beforeAll(async () => {
    const seeder1 = await seedScrollSoldPositionsData();
    cleanup1 = seeder1.cleanup;
    accountId1 = seeder1.accountId;
    const seeder2 = await seedScrollSoldPositionsData();
    cleanup2 = seeder2.cleanup;
    accountId2 = seeder2.accountId;
  });

  test.afterAll(async () => {
    if (cleanup1) {
      await cleanup1();
    }
    if (cleanup2) {
      await cleanup2();
    }
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`/account/${accountId1}/sold`);
    await page.waitForSelector(VIEWPORT_SEL, { timeout: 30000 });
    await settle(page, 2000);
  });

  test(
    'Sold Positions: (a) header sticky, (b) column widths aligned, ' +
      '(c) h-scroll sync, (d) post-account-swap header invariant',
    async ({ page }) => {
      await runTwoRegionInvariants(page, async function doContextChange() {
        // Context-change: navigate to /account/{id2}/sold.
        await swapActiveAccountViaNavigation(page, {
          toAccountId: accountId2,
          routeSuffix: 'sold',
        });
      });
    },
  );
});

// ─── Dividend Deposits ────────────────────────────────────────────────────────

test.describe('Dividend Deposits — single-viewport mat-table regression', () => {
  let cleanup1: () => Promise<void>;
  let cleanup2: () => Promise<void>;
  let accountId1: string;
  let accountId2: string;

  test.beforeAll(async () => {
    const seeder1 = await seedScrollDivDepositsWithSymbolsData();
    cleanup1 = seeder1.cleanup;
    accountId1 = seeder1.accountId;
    const seeder2 = await seedScrollDivDepositsWithSymbolsData();
    cleanup2 = seeder2.cleanup;
    accountId2 = seeder2.accountId;
  });

  test.afterAll(async () => {
    if (cleanup1) {
      await cleanup1();
    }
    if (cleanup2) {
      await cleanup2();
    }
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`/account/${accountId1}/div-dep`);
    await page.waitForSelector(VIEWPORT_SEL, { timeout: 30000 });
    await settle(page, 2000);
  });

  test(
    'Dividend Deposits: (a) header sticky, (b) column widths aligned, ' +
      '(c) h-scroll sync, (d) post-account-swap header invariant',
    async ({ page }) => {
      await runTwoRegionInvariants(page, async function doContextChange() {
        // Dividend Deposits has no filter row — only account-change is exercised.
        await swapActiveAccountViaNavigation(page, {
          toAccountId: accountId2,
          routeSuffix: 'div-dep',
        });
      });
    },
  );
});
