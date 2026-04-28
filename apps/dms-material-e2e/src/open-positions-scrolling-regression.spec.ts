/**
 * Story 87.3: Open Positions Scrolling Regression Prevention Suite
 *
 * Regression guard covering multiple scroll patterns on the Open Positions screen.
 * Extends the coverage added by Story 87.1 (`scrolling-regression-87.spec.ts`)
 * with additional patterns: oscillation, and multi-column data validation.
 *
 * The Open Positions placeholder (Story 87.2) uses symbol: '\u2026' for loading rows.
 * These tests guard against any future change that re-introduces blank symbol cells,
 * missing quantity data, or empty buy-price cells at any scroll position.
 *
 * Data volume: ≥ 40 open-position rows seeded via `seedScrollOpenPositionsData`.
 */

import { expect, Locator, test } from 'playwright/test';

import { assertVisibleRowsNonEmpty } from './helpers/assert-visible-rows-non-empty.helper';
import { login } from './helpers/login.helper';
import { seedScrollOpenPositionsData } from './helpers/seed-scroll-open-positions-data.helper';

const VIEWPORT_SELECTOR = 'cdk-virtual-scroll-viewport';
const ROW_SELECTOR = 'tr.mat-mdc-row';
const SYMBOL_CELL_SELECTOR = 'tr.mat-mdc-row td.mat-column-symbol';
const QUANTITY_CELL_SELECTOR = 'tr.mat-mdc-row td.mat-column-quantity';
const BUY_CELL_SELECTOR = 'tr.mat-mdc-row td.mat-column-buy';

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

// ─── Open Positions Scrolling Regression Tests ─────────────────────────────────

test.describe('Open Positions Scrolling Regression — Story 87.3', () => {
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

  test('all position rows populate after fast scroll to bottom', async ({
    page,
  }) => {
    // Story 87.3 regression guard — fast scroll to the bottom triggers the
    // SmartNgRX lazy-load in-flight window where placeholder rows with
    // symbol: '\u2026' (or '' before Story 87.2) may briefly appear.
    // Asserts no blank symbol cells are visible after the scroll completes.
    const viewport = page.locator(VIEWPORT_SELECTOR);
    await expect(viewport).toBeVisible({ timeout: 10000 });

    await scrollViewportToBottom(viewport);

    await assertVisibleRowsNonEmpty(
      page,
      SYMBOL_CELL_SELECTOR,
      'Open Positions: blank symbol cells detected after fast scroll to bottom. ' +
        'Story 87.3 regression guard: SmartNgRX lazy-load placeholder rows should not produce blank cells.'
    );
  });

  test('no blank rows after oscillation scroll (bottom-top-bottom)', async ({
    page,
  }) => {
    // Story 87.3 regression guard — oscillation (bottom\u2192top\u2192bottom) maximises
    // the number of SmartNgRX lazy-load in-flight windows that overlap with
    // the viewport. Each direction change triggers a new batch of isLoading
    // rows; if any produce blank symbol cells the assertion will fail.
    const viewport = page.locator(VIEWPORT_SELECTOR);
    await expect(viewport).toBeVisible({ timeout: 10000 });

    await scrollViewportToBottom(viewport);
    await scrollViewportToTop(viewport);
    await scrollViewportToBottom(viewport);

    await assertVisibleRowsNonEmpty(
      page,
      SYMBOL_CELL_SELECTOR,
      'Open Positions: blank symbol cells detected after oscillation scroll (bottom\u2192top\u2192bottom). ' +
        'Story 87.3 regression guard: repeated isLoading cycles should not produce blank symbol cells.'
    );
  });

  test('position data (symbol, quantity, buy price) non-empty at all scroll positions', async ({
    page,
  }) => {
    // Story 87.3 regression guard — scrolls to the bottom and asserts that
    // all three key data columns (symbol, quantity, buy price) are non-empty
    // at the final scroll position. Blank cells in any of these columns would
    // indicate that placeholder rows are being rendered to the user.
    const viewport = page.locator(VIEWPORT_SELECTOR);
    await expect(viewport).toBeVisible({ timeout: 10000 });

    await scrollViewportToBottom(viewport);

    await assertVisibleRowsNonEmpty(
      page,
      SYMBOL_CELL_SELECTOR,
      'Open Positions: blank symbol cells detected after scroll to bottom. ' +
        'Story 87.3 regression guard: symbol column must be non-empty at all scroll positions.'
    );

    await assertVisibleRowsNonEmpty(
      page,
      QUANTITY_CELL_SELECTOR,
      'Open Positions: blank quantity cells detected after scroll to bottom. ' +
        'Story 87.3 regression guard: quantity column must be non-empty at all scroll positions.'
    );

    await assertVisibleRowsNonEmpty(
      page,
      BUY_CELL_SELECTOR,
      'Open Positions: blank buy-price cells detected after scroll to bottom. ' +
        'Story 87.3 regression guard: buy-price column must be non-empty at all scroll positions.'
    );
  });

  test('no blank rows after symbol filter and scroll to bottom', async ({
    page,
  }) => {
    // Story 87.3 regression guard — applying a symbol filter triggers a
    // server-side request and an isLoading window (server-side filter via
    // interceptor). All seeded rows use symbols starting with 'TEST' so
    // filtering by 'T' keeps all rows visible while still triggering the
    // round-trip and the resulting isLoading cycle.
    const symbolFilter = page.getByTestId('symbol-search-input');
    await expect(symbolFilter).toBeVisible({ timeout: 10000 });
    await symbolFilter.fill('T');

    const viewport = page.locator(VIEWPORT_SELECTOR);
    await expect(viewport).toBeVisible({ timeout: 10000 });
    await scrollViewportToBottom(viewport);

    await assertVisibleRowsNonEmpty(
      page,
      SYMBOL_CELL_SELECTOR,
      'Open Positions: blank symbol cells detected after symbol filter + scroll to bottom. ' +
        'Story 87.3 regression guard: filter-triggered isLoading window should not produce blank rows.'
    );

    await assertVisibleRowsNonEmpty(
      page,
      QUANTITY_CELL_SELECTOR,
      'Open Positions: blank quantity cells detected after symbol filter + scroll to bottom. ' +
        'Story 87.3 regression guard: filter-triggered isLoading window should not produce blank quantity cells.'
    );

    await assertVisibleRowsNonEmpty(
      page,
      BUY_CELL_SELECTOR,
      'Open Positions: blank buy-price cells detected after symbol filter + scroll to bottom. ' +
        'Story 87.3 regression guard: filter-triggered isLoading window should not produce blank buy cells.'
    );
  });

  test('no blank rows after sort change and scroll to bottom', async ({
    page,
  }) => {
    // Story 87.3 regression guard — changing sort order triggers a new
    // server-side request and an isLoading window. A fast scroll into the
    // newly sorted data should not expose placeholder rows.
    // Buy Date is used as the sort trigger because Symbol is not sortable on
    // this screen.
    const buyDateHeader = page.getByRole('button', {
      name: 'Buy Date',
      exact: true,
    });
    await expect(buyDateHeader).toBeVisible({ timeout: 10000 });
    await buyDateHeader.click();

    const viewport = page.locator(VIEWPORT_SELECTOR);
    await expect(viewport).toBeVisible({ timeout: 10000 });
    await scrollViewportToBottom(viewport);

    await assertVisibleRowsNonEmpty(
      page,
      SYMBOL_CELL_SELECTOR,
      'Open Positions: blank symbol cells detected after sort change + scroll to bottom. ' +
        'Story 87.3 regression guard: sort-triggered isLoading window should not produce blank rows.'
    );

    await assertVisibleRowsNonEmpty(
      page,
      QUANTITY_CELL_SELECTOR,
      'Open Positions: blank quantity cells detected after sort change + scroll to bottom. ' +
        'Story 87.3 regression guard: sort-triggered isLoading window should not produce blank quantity cells.'
    );

    await assertVisibleRowsNonEmpty(
      page,
      BUY_CELL_SELECTOR,
      'Open Positions: blank buy-price cells detected after sort change + scroll to bottom. ' +
        'Story 87.3 regression guard: sort-triggered isLoading window should not produce blank buy cells.'
    );
  });
});
