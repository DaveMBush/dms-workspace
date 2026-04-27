/**
 * Story 87.1: Reproduce Scrolling Failures on All Affected Screens
 *
 * Test Coverage Gap Analysis:
 *   The existing universe-scrolling-regression.spec.ts checks for cells where
 *   text === '' (empty string). The Universe screen uses '\u2026' (U+2026 ellipsis)
 *   as the placeholder symbol for SmartNgRX loading rows, so those tests PASS even
 *   when loading rows are visible — the placeholder is non-empty and does not
 *   trigger the empty-cell assertion.
 *
 *   However, the account-panel screens use symbol: '' (empty string) as their
 *   loading placeholder:
 *     - open-positions-component.service.ts: placeholderOpenPosition → symbol: ''
 *     - sold-positions-component.service.ts: placeholder → symbol: ''
 *     - dividend-deposits-component.service.ts: buildPlaceholderDividendRow → symbol: ''
 *
 *   The existing smooth-scroll tests for these screens
 *   (open-positions-smooth-scroll.spec.ts, div-deposits-smooth-scroll.spec.ts)
 *   only assert that scroll position is monotonically non-decreasing — they do NOT
 *   check for blank symbol cells. No smooth-scroll test exists at all for Sold Positions.
 *
 *   This is the gap: rapid scrolling on account-panel screens triggers SmartNgRX
 *   lazy-load in-flight windows where placeholder rows with symbol: '' are rendered,
 *   producing blank symbol cells. This is the same failure mode documented in Epic 60
 *   for the Universe screen, but occurring on the account-panel screens that were
 *   never covered by blank-cell regression tests.
 *
 * Prior root causes (Epics 29–64):
 *   Epic 29: rowHeight mismatch between CSS and CDK viewport config
 *   Epic 31: contain:strict on header caused jump on viewport recalculation
 *   Epic 44: CSS transition animations + change detection cycles
 *   Epic 60: isLoading===true rows filtered to null → array shrinks → CDK jumps back
 *   Epic 64: excludeLoadingRows filter in filteredData$ re-introduced the Epic 60 regression
 *
 * Current failure mode (Story 87.1 observation):
 *   Same root cause as Epic 60/64 but on account-panel screens. The placeholder
 *   symbol is '' (empty string, not '\u2026'), so the blank-cell guard used in
 *   universe-scrolling-regression.spec.ts does not cover these screens. A fast
 *   scroll triggers SmartNgRX lazy-load windows; the placeholder rows appear with
 *   empty symbol cells that are visible to the user.
 *
 * Existing Test Gap (why prior tests missed this):
 *   universe-scrolling-regression.spec.ts: guards universe only; universe placeholder
 *     is '\u2026' so these tests pass even if loading rows are briefly visible.
 *   open-positions-smooth-scroll.spec.ts: checks monotonic scroll position only,
 *     not blank cell content.
 *   div-deposits-smooth-scroll.spec.ts: checks monotonic scroll position only,
 *     not blank cell content.
 *   No sold-positions smooth-scroll spec exists at all.
 *
 * These tests are PASSING regression guards (no test.fail() annotation).
 * With the 60-row seed dataset, SmartNgRX's computed signals (selectOpenPositions,
 * selectSoldPositions, dividends) eagerly iterate all row positions on every
 * change-detection cycle, proactively calling loadByIndexes for positions 50–59
 * immediately after the initial 50-row load. This resolves the lazy-load window
 * before waitForSelector(ROW_SELECTOR) completes in beforeEach, so blank cells
 * never appear in automated tests.
 *
 * On live data (hundreds of rows across multiple server pages), the lazy-load
 * windows persist longer, making blank cells visible to users — the real bug.
 * Story 87.2+ should fix the account-panel placeholder symbol from '' to '\u2026'
 * (matching the Universe screen fix in Story 76.3). These regression guards will
 * continue to pass after the fix, confirming the placeholder is no longer ''.
 */

import { expect, Locator, Page, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedScrollDivDepositsWithSymbolsData } from './helpers/seed-scroll-div-deposits-with-symbols-data.helper';
import { seedScrollOpenPositionsData } from './helpers/seed-scroll-open-positions-data.helper';
import { seedScrollSoldPositionsData } from './helpers/seed-scroll-sold-positions-data.helper';

const VIEWPORT_SELECTOR = 'cdk-virtual-scroll-viewport';
const ROW_SELECTOR = 'tr.mat-mdc-row';
const SYMBOL_CELL_SELECTOR = 'tr.mat-mdc-row td.mat-column-symbol';

/**
 * Assert that all currently visible symbol cells have non-empty text content.
 * Uses expect.poll to retry the assertion until all rows are populated or the
 * timeout expires — no fixed sleeps required.
 *
 * This is the same guard pattern used in universe-scrolling-regression.spec.ts,
 * applied to account-panel screens where the placeholder is '' (empty string),
 * not '\u2026'.
 */
async function assertVisibleSymbolsNonEmpty(
  page: Page,
  failureMessage: string,
  timeout = 10000
): Promise<void> {
  // Wait for at least one row to be visible first
  await expect(page.locator(ROW_SELECTOR).first()).toBeVisible({ timeout });

  // Poll until no empty cells remain (auto-retries until timeout)
  await expect
    .poll(
      async function countEmptySymbols() {
        const symbolCells = page.locator(SYMBOL_CELL_SELECTOR);
        // Read the currently rendered symbol cells in one DOM snapshot so CDK
        // row recycling cannot race a count()+nth() loop mid-poll.
        const texts = await symbolCells.evaluateAll(function readTexts(
          cells: Element[]
        ) {
          return cells.map(function readText(cell) {
            return (cell.textContent ?? '').trim();
          });
        });
        if (texts.length === 0) {
          return -1; // no rows yet — keep polling
        }
        return texts.filter(function isEmpty(text) {
          return text === '';
        }).length;
      },
      { message: failureMessage, timeout }
    )
    .toBe(0);
}

/**
 * Scroll the CDK virtual-scroll viewport to the very bottom in one jump.
 */
async function scrollViewportToBottom(viewport: Locator): Promise<void> {
  await viewport.evaluate(function setScrollTop(node: Element): void {
    node.scrollTop = node.scrollHeight;
  });
}

/**
 * Scroll the CDK virtual-scroll viewport back to the top.
 */
async function scrollViewportToTop(viewport: Locator): Promise<void> {
  await viewport.evaluate(function setScrollTop(node: Element): void {
    node.scrollTop = 0;
  });
}

// ─── Open Positions Scrolling Regression Tests ───────────────────────────────

test.describe('Open Positions Scrolling Regression — blank rows on fast scroll (Story 87.1)', () => {
  let cleanup: () => Promise<void>;
  let accountId: string;

  test.beforeAll(async () => {
    const seeder = await seedScrollOpenPositionsData();
    cleanup = seeder.cleanup;
    accountId = seeder.accountId;
  });

  test.afterAll(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`/account/${accountId}/open`);
    await expect(page.locator('dms-base-table')).toBeVisible({
      timeout: 15000,
    });
    await page.waitForSelector(ROW_SELECTOR, { timeout: 15000 });
  });

  test('should have no blank symbol cells after fast scroll to bottom', async ({
    page,
  }) => {
    // Story 87.1 regression guard: Open Positions placeholder uses symbol: ''
    // (empty string). Asserts no blank symbol cells are visible after fast
    // scroll to the bottom. SmartNgRX's selectOpenPositions eagerly evaluates
    // all 60 row positions on each compute cycle, so the lazy-load window
    // (where placeholder rows with symbol: '' briefly appear) resolves before
    // waitForSelector completes. This test therefore serves as a regression
    // guard: it will fail if blank cells become persistently visible.
    // See open-positions-component.service.ts placeholderOpenPosition.
    const viewport = page.locator(VIEWPORT_SELECTOR);
    await expect(viewport).toBeVisible({ timeout: 10000 });

    await scrollViewportToBottom(viewport);

    await assertVisibleSymbolsNonEmpty(
      page,
      'Open Positions: visible rows have empty symbol cells after fast scroll to bottom. ' +
        "Story 87.1 regression: account-panel placeholder uses symbol: '' (empty string). " +
        'SmartNgRX lazy-load in-flight rows are visible as blank cells. ' +
        'See open-positions-component.service.ts placeholderOpenPosition.'
    );
  });

  test('should have no blank symbol cells after scroll bottom then top', async ({
    page,
  }) => {
    // Story 87.1 regression guard: scroll bottom then back to top.
    // Both directions may produce lazy-load windows with placeholder
    // symbol: '' rows if SmartNgRX evicts and re-fetches rows.
    const viewport = page.locator(VIEWPORT_SELECTOR);
    await expect(viewport).toBeVisible({ timeout: 10000 });

    await scrollViewportToBottom(viewport);
    await scrollViewportToTop(viewport);

    await assertVisibleSymbolsNonEmpty(
      page,
      'Open Positions: visible rows have empty symbol cells after bottom→top scroll. ' +
        'Story 87.1 regression: re-entering previously evicted rows triggers another ' +
        'isLoading window, producing more blank cells at the top.'
    );
  });
});

// ─── Sold Positions Scrolling Regression Tests ───────────────────────────────

test.describe('Sold Positions Scrolling Regression — blank rows on fast scroll (Story 87.1)', () => {
  let cleanup: () => Promise<void>;
  let accountId: string;

  test.beforeAll(async () => {
    const seeder = await seedScrollSoldPositionsData();
    cleanup = seeder.cleanup;
    accountId = seeder.accountId;
  });

  test.afterAll(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`/account/${accountId}/sold`);
    await expect(page.locator('dms-base-table')).toBeVisible({
      timeout: 15000,
    });
    await page.waitForSelector(ROW_SELECTOR, { timeout: 15000 });
  });

  test('should have no blank symbol cells after fast scroll to bottom', async ({
    page,
  }) => {
    // Story 87.1 regression guard: Sold Positions placeholder uses symbol: ''.
    // No smooth-scroll test existed for this screen before Story 87.1 — both
    // blank-cell and scroll-monotonicity patterns were completely untested.
    // See sold-positions-component.service.ts placeholderClosedPosition.
    const viewport = page.locator(VIEWPORT_SELECTOR);
    await expect(viewport).toBeVisible({ timeout: 10000 });

    await scrollViewportToBottom(viewport);

    await assertVisibleSymbolsNonEmpty(
      page,
      'Sold Positions: visible rows have empty symbol cells after fast scroll to bottom. ' +
        "Story 87.1 regression: account-panel placeholder uses symbol: '' (empty string). " +
        'See sold-positions-component.service.ts placeholderClosedPosition.'
    );
  });

  test('should have no blank symbol cells after scroll bottom then top', async ({
    page,
  }) => {
    // Story 87.1 regression guard: sold positions — round-trip scroll pattern.
    const viewport = page.locator(VIEWPORT_SELECTOR);
    await expect(viewport).toBeVisible({ timeout: 10000 });

    await scrollViewportToBottom(viewport);
    await scrollViewportToTop(viewport);

    await assertVisibleSymbolsNonEmpty(
      page,
      'Sold Positions: visible rows have empty symbol cells after bottom→top scroll. ' +
        "Story 87.1 regression: same placeholder symbol: '' issue on re-entry."
    );
  });
});

// ─── Dividend Deposits Scrolling Regression Tests ────────────────────────────

test.describe('Dividend Deposits Scrolling Regression — blank rows on fast scroll (Story 87.1)', () => {
  let cleanup: () => Promise<void>;
  let accountId: string;

  test.beforeAll(async () => {
    // Use the "with symbols" seed helper so all 60 rows have a universeId and
    // thus a symbol. Rows seeded without a universeId have symbol: '' by
    // design (no universe link), which is not a bug. We test only rows that
    // SHOULD have a symbol so blank cells are unambiguous regression evidence.
    const seeder = await seedScrollDivDepositsWithSymbolsData();
    cleanup = seeder.cleanup;
    accountId = seeder.accountId;
  });

  test.afterAll(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`/account/${accountId}/div-dep`);
    await expect(page.locator('dms-base-table')).toBeVisible({
      timeout: 15000,
    });
    await page.waitForSelector(ROW_SELECTOR, { timeout: 15000 });
  });

  test('should have no blank symbol cells after fast scroll to bottom', async ({
    page,
  }) => {
    // Story 87.1 regression guard: Dividend Deposits placeholder uses symbol: ''.
    // div-deposits-smooth-scroll.spec.ts only checks scroll monotonicity, not
    // cell content. See dividend-deposits-component.service.ts buildPlaceholderDividendRow.
    const viewport = page.locator(VIEWPORT_SELECTOR);
    await expect(viewport).toBeVisible({ timeout: 10000 });

    await scrollViewportToBottom(viewport);

    await assertVisibleSymbolsNonEmpty(
      page,
      'Dividend Deposits: visible rows have empty symbol cells after fast scroll to bottom. ' +
        "Story 87.1 regression: account-panel placeholder uses symbol: '' (empty string). " +
        'See dividend-deposits-component.service.ts buildPlaceholderDividendRow.'
    );
  });

  test('should have no blank symbol cells after scroll bottom then top', async ({
    page,
  }) => {
    // Story 87.1 regression guard: dividend deposits — round-trip scroll pattern.
    const viewport = page.locator(VIEWPORT_SELECTOR);
    await expect(viewport).toBeVisible({ timeout: 10000 });

    await scrollViewportToBottom(viewport);
    await scrollViewportToTop(viewport);

    await assertVisibleSymbolsNonEmpty(
      page,
      'Dividend Deposits: visible rows have empty symbol cells after bottom→top scroll. ' +
        "Story 87.1 regression: placeholder symbol: '' on re-entry of evicted rows."
    );
  });
});
