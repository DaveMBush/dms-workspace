/**
 * Story 87.3: Dividend Deposits Scrolling Regression Prevention Suite
 *
 * Regression guard covering multiple scroll patterns on the Dividend Deposits screen.
 * Extends the coverage added by Story 87.1 (`scrolling-regression-87.spec.ts`)
 * with the oscillation pattern.
 *
 * The Dividend Deposits placeholder (Story 87.2) uses symbol: '\u2026' for loading rows.
 * These tests guard against any future change that re-introduces blank symbol cells
 * at any scroll position.
 *
 * Data volume: ≥ 60 dividend deposit rows seeded via `seedScrollDivDepositsWithSymbolsData`.
 * All rows are seeded with a universeId so every row should have a non-empty symbol.
 */

import { expect, Locator, test } from 'playwright/test';

import { assertStickyHeaderInvariant } from './helpers/assert-sticky-header-invariant.helper';
import { assertVisibleRowsNonEmpty } from './helpers/assert-visible-rows-non-empty.helper';
import { login } from './helpers/login.helper';
import { seedScrollDivDepositsWithSymbolsData } from './helpers/seed-scroll-div-deposits-with-symbols-data.helper';

const VIEWPORT_SELECTOR = 'cdk-virtual-scroll-viewport';
// NOTE: must be a TH cell selector — Angular Material's stickRows applies
// position:sticky to TH children, not the TR. getBoundingClientRect on TR
// returns the table-layout flow position, not the visual sticky position.
const HEADER_ROW_SELECTOR = '.dms-header-cell[role="columnheader"]';
const ROW_SELECTOR = '.dms-body-row[role="row"]';
const SYMBOL_CELL_SELECTOR =
  '.dms-body-row[role="row"] .dms-body-cell[data-column="symbol"]';

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

// ─── Dividend Deposits Scrolling Regression Tests ─────────────────────────────

test.describe('Dividend Deposits Scrolling Regression — Story 87.3', () => {
  let cleanup: () => Promise<void>;
  let accountId: string;

  test.beforeAll(async () => {
    // Use the "with symbols" seed helper so all 60 rows have a universeId and
    // thus a symbol. Rows without a universeId have symbol: '' by design (no
    // universe link), which is not a bug. We test only rows that SHOULD have a
    // symbol so blank cells are unambiguous regression evidence.
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

  test('all deposit rows populate after fast scroll to bottom', async ({
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
      'Dividend Deposits: blank symbol cells detected after fast scroll to bottom. ' +
        'Story 87.3 regression guard: SmartNgRX lazy-load placeholder rows should not produce blank cells.'
    );
  });

  test('no blank rows after oscillation scroll', async ({ page }) => {
    // Story 87.3 regression guard — oscillation (bottom\u2192top\u2192bottom) maximises
    // the number of SmartNgRX lazy-load in-flight windows that overlap with
    // the viewport. Each direction change may trigger a new batch of isLoading
    // rows; if any produce blank symbol cells the assertion will fail.
    const viewport = page.locator(VIEWPORT_SELECTOR);
    await expect(viewport).toBeVisible({ timeout: 10000 });

    await scrollViewportToBottom(viewport);
    await scrollViewportToTop(viewport);
    await scrollViewportToBottom(viewport);

    await assertVisibleRowsNonEmpty(
      page,
      SYMBOL_CELL_SELECTOR,
      'Dividend Deposits: blank symbol cells detected after oscillation scroll (bottom\u2192top\u2192bottom). ' +
        'Story 87.3 regression guard: repeated isLoading cycles should not produce blank symbol cells.'
    );
  });
  test('no blank rows after sort change and scroll to bottom', async ({
    page,
  }) => {
    // Story 87.3 regression guard — changing sort order triggers a new
    // server-side request and an isLoading window. A fast scroll into the
    // newly sorted data should not expose placeholder rows with blank symbol
    // cells.
    const symbolHeader = page.getByRole('columnheader', { name: 'Symbol' });
    await expect(symbolHeader).toBeVisible({ timeout: 10000 });
    await symbolHeader.click();

    const viewport = page.locator(VIEWPORT_SELECTOR);
    await expect(viewport).toBeVisible({ timeout: 10000 });
    await scrollViewportToBottom(viewport);

    await assertVisibleRowsNonEmpty(
      page,
      SYMBOL_CELL_SELECTOR,
      'Dividend Deposits: blank symbol cells detected after sort change + scroll to bottom. ' +
        'Story 87.3 regression guard: sort-triggered isLoading window should not produce blank rows.'
    );
  });
});

// ─── Story 101.3: Header-Invariant Regression — Dividend Deposits ────────────

/**
 * Regression guard added by Story 101.3 (Epic 101, Round 7).
 * See universe-scrolling-regression.spec.ts for the full design rationale.
 */
test.describe('Dividend Deposits — Story 101.3 slow-scroll header-invariant regression', () => {
  let cleanup: () => Promise<void>;
  let accountId: string;

  test.beforeAll(async () => {
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
    await page.waitForSelector('.dms-body-row[role="row"]', { timeout: 15000 });
  });

  test('dividend deposits — slow scroll keeps header anchored under parent header', async ({
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
