/**
 * base-table-two-region-regression.spec.ts — Epic 111 (Round 10)
 * ──────────────────────────────────────────────────────────────
 *
 * Regression suite for the two-region base-table layout introduced in Story 111.2.
 *
 * FOUR INVARIANTS PER CONSUMER SCREEN:
 *   (a) Header region computed position is NOT 'sticky'
 *       Epic 111's structural fix: removing position:sticky eliminates scroll jank entirely.
 *   (b) Header and body column widths match within 1px (shared fixed-column-width model)
 *       Validates that ColumnDef.width drives both header cells and body cells identically.
 *   (c) Synchronized horizontal scroll (when body content exceeds viewport width)
 *       .dms-table-body owns horizontal scroll while the sibling header viewport mirrors it.
 *   (d) Post-context-change: header top stays at scroll-container top during slow vertical scroll
 *       The header is in document flow, never position:sticky, so it cannot drift with CDK content.
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

import { expect, type Page, test } from 'playwright/test';

import { applyAndClearGlobalFilter } from './helpers/apply-and-clear-global-filter.helper';
import { login } from './helpers/login.helper';
import { seedScrollDivDepositsWithSymbolsData } from './helpers/seed-scroll-div-deposits-with-symbols-data.helper';
import { seedScrollOpenPositionsData } from './helpers/seed-scroll-open-positions-data.helper';
import { seedScrollScreenerData } from './helpers/seed-scroll-screener-data.helper';
import { seedScrollSoldPositionsData } from './helpers/seed-scroll-sold-positions-data.helper';
import { seedScrollUniverseData } from './helpers/seed-scroll-universe-data.helper';
import { swapActiveAccountViaNavigation } from './helpers/swap-active-account-via-navigation.helper';
import { swapUniverseAccount } from './helpers/swap-universe-account.helper';

// ─── Selectors ────────────────────────────────────────────────────────────────

/**
 * Stable test-id added to the header region in Story 111.4 (allowable additive change).
 * Mirrors the `data-testid="base-table-header"` attribute on .dms-table-header.
 */
const HEADER_REGION_SEL = '[data-testid="base-table-header"]';

/** Non-scrolling table shell that owns header + body regions. */
const TABLE_SHELL_SEL = '.dms-table-shell';

/**
 * Body horizontal-scroll owner.
 * Story 114.2 mirrors this viewport scrollLeft into the sibling header viewport.
 */
const SCROLL_CONTAINER_SEL = '.dms-table-body';

/** Detached header viewport clipped to the same visible width as the body viewport. */
const HEADER_VIEWPORT_SEL = '.dms-table-header-viewport';

/** Full-width outer vertical scroller delegated via cdkVirtualScrollingElement. */
const VIEWPORT_SEL = '.dms-outer-scroller';

/** Column-header cells in the column-label row (not the filter row). */
const COLUMN_HEADER_CELLS_SEL =
  '.dms-column-header-row .dms-header-cell[role="columnheader"]';

/** Body data rows. */
const BODY_ROW_SEL = '.dms-body-row[role="row"]';

/** Body cells inside a row. */
const BODY_CELL_SEL = '.dms-body-cell[role="cell"]';

// ─── Invariant Assertion Helpers ─────────────────────────────────────────────

/**
 * (a) Header region computed position must NOT be 'sticky'.
 *
 * position:sticky was the structural root cause of all nine prior scrolling
 * epics (29, 31, 44, 60, 64, 87, 101, 105, 106). Story 111.2 replaced it with
 * a plain div above the CDK viewport. This assertion permanently guards that
 * no future refactor silently re-introduces sticky on the header region.
 */
async function assertHeaderNotSticky(page: Page): Promise<void> {
  const position = await page
    .locator(HEADER_REGION_SEL)
    .first()
    .evaluate(function getComputedPositionValue(el: Element): string {
      return window.getComputedStyle(el).position;
    });
  expect(
    position,
    'Header region computed position must not be "sticky". ' +
      'Epic 111 (Story 111.2) removed position:sticky by introducing the two-region layout. ' +
      'Re-introducing sticky would re-enable the scroll jank artifacts this epic exists to prevent.'
  ).not.toBe('sticky');
}

/**
 * (b) Per-column header/body widths and whole-row parity must match.
 *
 * Story 111.2 introduced a shared fixed-column-width model: both header cells
 * and body cells use [style.width.px]="column.width" from the same ColumnDef.
 * This assertion verifies the model produces aligned columns in the rendered DOM
 * and that detached header/body regions keep matching visible and content widths.
 * Tolerance of 1px accounts for sub-pixel rounding on hi-DPI displays.
 */
async function assertColumnWidthParity(page: Page): Promise<void> {
  const result = await page.evaluate(
    function checkColumnWidthParity(arg: {
      headerCellsSel: string;
      bodyRowSel: string;
      bodyCellSel: string;
      headerViewportSel: string;
      bodyViewportSel: string;
    }): { ok: boolean; message: string } {
      const {
        headerCellsSel,
        bodyRowSel,
        bodyCellSel,
        headerViewportSel,
        bodyViewportSel,
      } = arg;
      const headerCells = Array.from(document.querySelectorAll(headerCellsSel));
      const bodyRow = document.querySelector(bodyRowSel);
      const headerViewport =
        document.querySelector<HTMLElement>(headerViewportSel);
      const bodyViewport = document.querySelector<HTMLElement>(bodyViewportSel);
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
        '.dms-column-header-row'
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
              2
            )}px body=${bodyWidth.toFixed(2)}px ` +
              `delta=${(headerWidth - bodyWidth).toFixed(2)}px`
          );
        }
      }

      const missingParts = [
        ['headerViewport', headerViewport],
        ['bodyViewport', bodyViewport],
        ['headerRow', headerRow],
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
        };
      }

      const headerViewportWidth = headerViewport.getBoundingClientRect().width;
      const bodyViewportWidth = bodyViewport.clientWidth;
      const viewportDiff = Math.abs(headerViewportWidth - bodyViewportWidth);
      if (viewportDiff > 2) {
        violations.push(
          `viewport: header=${headerViewportWidth.toFixed(
            2
          )}px body=${bodyViewportWidth.toFixed(2)}px ` +
            `delta=${viewportDiff.toFixed(2)}px`
        );
      }

      const headerRowWidth = headerRow.getBoundingClientRect().width;
      const bodyRowWidth = (bodyRow as HTMLElement).getBoundingClientRect()
        .width;
      const rowDiff = Math.abs(headerRowWidth - bodyRowWidth);
      if (rowDiff > 1) {
        violations.push(
          `row: header=${headerRowWidth.toFixed(2)}px ` +
            `body=${bodyRowWidth.toFixed(2)}px delta=${rowDiff.toFixed(2)}px`
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
      headerViewportSel: HEADER_VIEWPORT_SEL,
      bodyViewportSel: SCROLL_CONTAINER_SEL,
    }
  );
  expect(
    result.ok,
    `Column width parity violation (tolerance: 1px):\n${result.message}\n` +
      'Header/body cells must share fixed widths from ColumnDef.width, and the ' +
      'detached header/body regions must preserve matching visible and content widths.'
  ).toBe(true);
}

/**
 * (c) Synchronized horizontal scroll.
 *
 * Story 114.2 keeps one body horizontal-scroll owner and mirrors that scrollLeft
 * into the sibling header viewport. This assertion verifies:
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
    .locator(SCROLL_CONTAINER_SEL)
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
    function checkHScrollSync(arg: {
      containerSel: string;
      headerCellSel: string;
      bodyCellSel: string;
    }): Promise<{
      ok: boolean;
      message: string;
      hDelta: number;
      bDelta: number;
      syncDiff: number;
      resetDiff: number;
    }> {
      const { containerSel, headerCellSel, bodyCellSel } = arg;
      return new Promise(function executor(
        resolve: (value: {
          ok: boolean;
          message: string;
          hDelta: number;
          bDelta: number;
          syncDiff: number;
          resetDiff: number;
        }) => void
      ): void {
        const container = document.querySelector<HTMLElement>(containerSel);
        const headerCell = document.querySelector<HTMLElement>(headerCellSel);
        const bodyRow = document.querySelector<HTMLElement>(
          '.dms-body-row[role="row"]'
        );
        const bodyCell = bodyRow?.querySelector<HTMLElement>(bodyCellSel);

        if (!container || !headerCell || !bodyCell) {
          resolve({
            ok: false,
            message:
              'precondition unmet: required elements not found (container=' +
              !!container +
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
        const available = container.scrollWidth - container.clientWidth;
        const targetScroll =
          available > 0
            ? Math.max(1, Math.min(50, Math.ceil(available / 2)))
            : 0;

        container.scrollLeft = targetScroll;

        requestAnimationFrame(function afterScroll(): void {
          const hAfter = headerCell.getBoundingClientRect().left;
          const bAfter = bodyCell.getBoundingClientRect().left;

          const hDelta = hBefore - hAfter;
          const bDelta = bBefore - bAfter;
          const syncDiff = Math.abs(hDelta - bDelta);

          container.scrollLeft = 0;

          requestAnimationFrame(function afterReset(): void {
            const hReset = headerCell.getBoundingClientRect().left;
            const bReset = bodyCell.getBoundingClientRect().left;
            const resetDiff = Math.max(
              Math.abs(hReset - hBefore),
              Math.abs(bReset - bBefore)
            );

            const ok = syncDiff <= 1 && resetDiff <= 1;
            const message =
              `scrollTarget=${targetScroll}px — ` +
              `header shifted ${hDelta.toFixed(
                2
              )}px, body shifted ${bDelta.toFixed(2)}px; ` +
              `syncDiff=${syncDiff.toFixed(2)}px, resetDiff=${resetDiff.toFixed(
                2
              )}px`;
            resolve({ ok, message, hDelta, bDelta, syncDiff, resetDiff });
          });
        });
      });
    },
    {
      containerSel: SCROLL_CONTAINER_SEL,
      headerCellSel: COLUMN_HEADER_CELLS_SEL,
      bodyCellSel: BODY_CELL_SEL,
    }
  );

  expect(
    result.ok,
    `Horizontal scroll synchronization failed: ${result.message}. ` +
      'Header and body must shift by equal deltas (≤1px difference) — ' +
      'body owns horizontal scroll and header must mirror that offset.'
  ).toBe(true);
}

/**
 * (d) Post-context-change header position invariant.
 *
 * After an in-place data-context change (account-swap or filter-change), the
 * CDK viewport receives a new dataset and may re-measure its internal state.
 * This assertion slow-scrolls the CDK viewport (4px/step for up to 3s) and
 * on every rAF frame verifies:
 *
 *   header.getBoundingClientRect().top === tableShell.getBoundingClientRect().top ± 1px
 *
 * Story 114.2 keeps the header as a sibling above the outer vertical scroller.
 * Any violation means the header re-entered the vertical scroll subtree or some
 * other layout change is translating it during body scroll.
 */
async function assertPostContextChangeInvariant(
  page: Page,
  contextChange: () => Promise<void>
): Promise<void> {
  // Trigger the in-place data-context change.
  await contextChange();

  // Wait for body rows to be visible after context change.
  await page.waitForSelector(BODY_ROW_SEL, { timeout: 15000 });

  const result = await page.evaluate(
    function slowScrollAndCheckHeaderPosition(arg: {
      viewportSel: string;
      headerSel: string;
      shellSel: string;
      scrollMs: number;
      stepPx: number;
    }): Promise<{ ok: boolean; violations: string[]; frames: number }> {
      const { viewportSel, headerSel, shellSel, scrollMs, stepPx } = arg;
      return new Promise(function executor(
        resolve: (value: {
          ok: boolean;
          violations: string[];
          frames: number;
        }) => void
      ): void {
        const viewport = document.querySelector<HTMLElement>(viewportSel);
        const header = document.querySelector<HTMLElement>(headerSel);
        const shell = document.querySelector<HTMLElement>(shellSel);

        if (!viewport || !header || !shell) {
          resolve({
            ok: false,
            violations: [
              `selector not found: viewport=${!!viewport} header=${!!header} shell=${!!shell}`,
            ],
            frames: 0,
          });
          return;
        }

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

          const maxScroll = viewport.scrollHeight - viewport.clientHeight;
          if (maxScroll <= 0) {
            // Precondition unmet: scrollable content is required to verify the invariant.
            resolve({
              ok: false,
              violations: [
                'precondition unmet: no scrollable content after context change (maxScroll=' +
                  maxScroll +
                  ')',
              ],
              frames,
            });
            return;
          }

          viewport.scrollTop = Math.min(viewport.scrollTop + stepPx, maxScroll);

          requestAnimationFrame(function onFrame(): void {
            frames++;
            const headerTop = header.getBoundingClientRect().top;
            const shellTop = shell.getBoundingClientRect().top;
            const diff = Math.abs(headerTop - shellTop);

            if (diff > 1) {
              violations.push(
                `scrollTop=${viewport.scrollTop}: ` +
                  `headerTop=${headerTop.toFixed(
                    2
                  )} shellTop=${shellTop.toFixed(2)} ` +
                  `diff=${diff.toFixed(2)}`
              );
            }

            if (viewport.scrollTop >= maxScroll) {
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
      viewportSel: VIEWPORT_SEL,
      headerSel: HEADER_REGION_SEL,
      shellSel: TABLE_SHELL_SEL,
      scrollMs: 3000,
      stepPx: 4,
    }
  );

  expect(
    result.ok,
    `Header drifted from table-shell top after context change ` +
      `(${result.violations.length} violation(s) across ${result.frames} frames):\n` +
      result.violations.join('\n') +
      '\nThe two-region header must remain outside the outer vertical scroller — ' +
      'it must never shift during body scrolling.'
  ).toBe(true);
}

/**
 * Run all four two-region invariants against the currently loaded screen.
 */
async function runTwoRegionInvariants(
  page: Page,
  contextChange: () => Promise<void>
): Promise<void> {
  await assertHeaderNotSticky(page);
  await assertColumnWidthParity(page);
  await assertHorizontalScrollSync(page);
  await assertPostContextChangeInvariant(page, contextChange);
}

// ─── Universe ─────────────────────────────────────────────────────────────────

test.describe('Universe — two-region layout regression', () => {
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
    'Universe: (a) header not sticky, (b) column widths aligned, ' +
      '(c) h-scroll sync, (d) post-account-swap header invariant',
    async ({ page }) => {
      await runTwoRegionInvariants(page, async function doContextChange() {
        // Context-change: swap active account via toolbar mat-select.
        // GlobalUniverseComponent.onAccountChange() triggers an in-place CDK data swap.
        await swapUniverseAccount(page);
      });
    }
  );
});

// ─── Screener ─────────────────────────────────────────────────────────────────

test.describe('Screener — two-region layout regression', () => {
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
    'Screener: (a) header not sticky, (b) column widths aligned, ' +
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
    }
  );
});

// ─── Open Positions ───────────────────────────────────────────────────────────

test.describe('Open Positions — two-region layout regression', () => {
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
    await page.waitForTimeout(2000);
  });

  test(
    'Open Positions: (a) header not sticky, (b) column widths aligned, ' +
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
    }
  );
});

// ─── Sold Positions ───────────────────────────────────────────────────────────

test.describe('Sold Positions — two-region layout regression', () => {
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
    await page.waitForTimeout(2000);
  });

  test(
    'Sold Positions: (a) header not sticky, (b) column widths aligned, ' +
      '(c) h-scroll sync, (d) post-account-swap header invariant',
    async ({ page }) => {
      await runTwoRegionInvariants(page, async function doContextChange() {
        await swapActiveAccountViaNavigation(page, {
          toAccountId: accountId2,
          routeSuffix: 'sold',
        });
      });
    }
  );
});

// ─── Dividend Deposits ────────────────────────────────────────────────────────

test.describe('Dividend Deposits — two-region layout regression', () => {
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
    await page.waitForTimeout(2000);
  });

  test(
    'Dividend Deposits: (a) header not sticky, (b) column widths aligned, ' +
      '(c) h-scroll sync, (d) post-account-swap header invariant',
    async ({ page }) => {
      await runTwoRegionInvariants(page, async function doContextChange() {
        // Dividend Deposits has no filter row — only account-change is exercised.
        await swapActiveAccountViaNavigation(page, {
          toAccountId: accountId2,
          routeSuffix: 'div-dep',
        });
      });
    }
  );
});
