/**
 * Story 87.3: Sold Positions Scrolling Regression Prevention Suite
 *
 * Regression guard covering multiple scroll patterns on the Sold Positions screen.
 * Extends the coverage added by Story 87.1 (`scrolling-regression-87.spec.ts`)
 * with the oscillation pattern and sell-price column validation.
 *
 * The Sold Positions placeholder (Story 87.2) uses symbol: '\u2026' for loading rows.
 * These tests guard against any future change that re-introduces blank symbol cells
 * or empty sell-price cells at any scroll position.
 *
 * Data volume: ≥ 40 sold-position rows seeded via `seedScrollSoldPositionsData`.
 */

import { expect, Locator, test } from 'playwright/test';

import { assertStickyHeaderInvariant } from './helpers/assert-sticky-header-invariant.helper';
import { assertVisibleRowsNonEmpty } from './helpers/assert-visible-rows-non-empty.helper';
import { login } from './helpers/login.helper';
import { seedScrollSoldPositionsData } from './helpers/seed-scroll-sold-positions-data.helper';

const VIEWPORT_SELECTOR = 'cdk-virtual-scroll-viewport';
// NOTE: must be a TH cell selector — Angular Material's stickRows applies
// position:sticky to TH children, not the TR. getBoundingClientRect on TR
// returns the table-layout flow position, not the visual sticky position.
const HEADER_ROW_SELECTOR = '.dms-header-cell[role="columnheader"]';
const ROW_SELECTOR = '.dms-body-row[role="row"]';
const SYMBOL_CELL_SELECTOR = '.dms-body-row[role="row"] .dms-body-cell[data-column="symbol"]';
const SELL_CELL_SELECTOR = '.dms-body-row[role="row"] .dms-body-cell[data-column="sell"]';

// ─── Scroll Helpers ────────────────────────────────────────────────────────────

async function scrollViewportToBottom(viewport: Locator): Promise<void> {
  await viewport.evaluate(function setScrollTop(node: Element): void {
    node.scrollTop = node.scrollHeight;
  });
}

async function scrollViewportToTop(viewport: Locator): Promise<void> {
  await viewport.evaluate(function setScrollTop(node: Element): void {
    node.scrollTop = 0;
  });
}

// ─── Sold Positions Scrolling Regression Tests ─────────────────────────────────

test.describe('Sold Positions Scrolling Regression — Story 87.3', () => {
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

  test('all sold-position rows populate after fast scroll to bottom', async ({
    page,
  }) => {
    // Story 87.3 regression guard — fast scroll to the bottom triggers the
    // SmartNgRX lazy-load in-flight window where placeholder rows with
    // symbol: '\u2026' (or '' before Story 87.2) may briefly appear.
    // Asserts no blank symbol or sell-price cells are visible after the scroll.
    const viewport = page.locator(VIEWPORT_SELECTOR);
    await expect(viewport).toBeVisible({ timeout: 10000 });

    await scrollViewportToBottom(viewport);

    await assertVisibleRowsNonEmpty(
      page,
      SYMBOL_CELL_SELECTOR,
      'Sold Positions: blank symbol cells detected after fast scroll to bottom. ' +
        'Story 87.3 regression guard: SmartNgRX lazy-load placeholder rows should not produce blank cells.'
    );

    await assertVisibleRowsNonEmpty(
      page,
      SELL_CELL_SELECTOR,
      'Sold Positions: blank sell-price cells detected after fast scroll to bottom. ' +
        'Story 87.3 regression guard: sell-price column must be non-empty at all scroll positions.'
    );
  });

  test('no blank rows after oscillation scroll', async ({ page }) => {
    // Story 87.3 regression guard — oscillation (bottom\u2192top\u2192bottom) maximises
    // the number of SmartNgRX lazy-load in-flight windows that overlap with
    // the viewport. Asserts symbol and sell-price cells remain non-empty
    // throughout the oscillation cycle.
    const viewport = page.locator(VIEWPORT_SELECTOR);
    await expect(viewport).toBeVisible({ timeout: 10000 });

    await scrollViewportToBottom(viewport);
    await scrollViewportToTop(viewport);
    await scrollViewportToBottom(viewport);

    await assertVisibleRowsNonEmpty(
      page,
      SYMBOL_CELL_SELECTOR,
      'Sold Positions: blank symbol cells detected after oscillation scroll (bottom\u2192top\u2192bottom). ' +
        'Story 87.3 regression guard: repeated isLoading cycles should not produce blank symbol cells.'
    );

    await assertVisibleRowsNonEmpty(
      page,
      SELL_CELL_SELECTOR,
      'Sold Positions: blank sell-price cells detected after oscillation scroll. ' +
        'Story 87.3 regression guard: sell-price column must remain non-empty across all oscillation cycles.'
    );
  });

  test('no blank rows after symbol filter and scroll to bottom', async ({
    page,
  }) => {
    // Story 87.3 regression guard — applying a symbol filter triggers a
    // new isLoading window. The filter prefix is derived from the first visible
    // symbol so the test stays data-driven and is not coupled to any specific
    // seed-data naming convention.
    const symbolFilter = page.getByPlaceholder('Search Symbol');
    await expect(symbolFilter).toBeVisible({ timeout: 10000 });
    const firstSymbolCell = page.locator(SYMBOL_CELL_SELECTOR).first();
    await expect(firstSymbolCell).toBeVisible({ timeout: 10000 });
    const firstSymbol = ((await firstSymbolCell.textContent()) ?? '').trim();
    await symbolFilter.fill(firstSymbol.slice(0, 1));

    const viewport = page.locator(VIEWPORT_SELECTOR);
    await expect(viewport).toBeVisible({ timeout: 10000 });
    await scrollViewportToBottom(viewport);

    await assertVisibleRowsNonEmpty(
      page,
      SYMBOL_CELL_SELECTOR,
      'Sold Positions: blank symbol cells detected after symbol filter + scroll to bottom. ' +
        'Story 87.3 regression guard: filter-triggered isLoading window should not produce blank rows.'
    );

    await assertVisibleRowsNonEmpty(
      page,
      SELL_CELL_SELECTOR,
      'Sold Positions: blank sell-price cells detected after symbol filter + scroll to bottom. ' +
        'Story 87.3 regression guard: filter-triggered isLoading window should not produce blank sell cells.'
    );
  });

  test('no blank rows after sort change and scroll to bottom', async ({
    page,
  }) => {
    // Story 87.3 regression guard — changing sort order triggers a new
    // server-side request and an isLoading window. A fast scroll into the
    // newly sorted data should not expose placeholder rows.
    // Sell Date is used as the sort trigger because Symbol is not sortable on
    // this screen.
    const sellDateHeader = page.getByRole('columnheader', {
      name: 'Sell Date',
      exact: true,
    });
    await expect(sellDateHeader).toBeVisible({ timeout: 10000 });
    await sellDateHeader.click();

    const viewport = page.locator(VIEWPORT_SELECTOR);
    await expect(viewport).toBeVisible({ timeout: 10000 });
    await scrollViewportToBottom(viewport);

    await assertVisibleRowsNonEmpty(
      page,
      SYMBOL_CELL_SELECTOR,
      'Sold Positions: blank symbol cells detected after sort change + scroll to bottom. ' +
        'Story 87.3 regression guard: sort-triggered isLoading window should not produce blank rows.'
    );

    await assertVisibleRowsNonEmpty(
      page,
      SELL_CELL_SELECTOR,
      'Sold Positions: blank sell-price cells detected after sort change + scroll to bottom. ' +
        'Story 87.3 regression guard: sort-triggered isLoading window should not produce blank sell cells.'
    );
  });
});

// ─── Story 101.3: Header-Invariant Regression — Sold Positions ───────────────

/**
 * Regression guard added by Story 101.3 (Epic 101, Round 7).
 * See universe-scrolling-regression.spec.ts for the full design rationale.
 */
test.describe('Sold Positions — Story 101.3 slow-scroll header-invariant regression', () => {
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
    await page.waitForSelector('.dms-body-row[role="row"]', { timeout: 15000 });
  });

  test('sold positions — slow scroll keeps header anchored under parent header', async ({
    page,
  }) => {
    // Regression guard for Epic 101 (Round 7) — Story 101.3.
    // See Universe variant for full root-cause explanation.
    // AC #4: Reverting the Story 101.2 fix (re-adding contain:paint to
    // base-table.component.scss) causes this test to fail.
    await assertStickyHeaderInvariant(
      page,
      VIEWPORT_SELECTOR,
      HEADER_ROW_SELECTOR
    );
  });
});
