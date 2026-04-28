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

import { assertVisibleRowsNonEmpty } from './helpers/assert-visible-rows-non-empty.helper';
import { login } from './helpers/login.helper';
import { seedScrollSoldPositionsData } from './helpers/seed-scroll-sold-positions-data.helper';

const VIEWPORT_SELECTOR = 'cdk-virtual-scroll-viewport';
const ROW_SELECTOR = 'tr.mat-mdc-row';
const SYMBOL_CELL_SELECTOR = 'tr.mat-mdc-row td.mat-column-symbol';
const SELL_CELL_SELECTOR = 'tr.mat-mdc-row td.mat-column-sell';

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
    // new isLoading window. All seeded rows use symbols starting with 'TEST'
    // so filtering by 'T' keeps all rows visible while still triggering the
    // isLoading cycle that can expose blank cells.
    const symbolFilter = page.getByPlaceholder('Search Symbol');
    await expect(symbolFilter).toBeVisible({ timeout: 10000 });
    await symbolFilter.fill('T');

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
    const sellDateHeader = page.getByRole('button', { name: 'Sell Date', exact: true });
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
