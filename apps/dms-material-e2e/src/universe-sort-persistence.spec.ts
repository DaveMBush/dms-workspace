import { expect, Page, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedUniverseE2eData } from './helpers/seed-universe-e2e-data.helper';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Clear sort-filter state from localStorage so each test starts clean.
 */
async function clearSortFilterState(page: Page): Promise<void> {
  await page.evaluate(function removeSortFilterState(): void {
    localStorage.removeItem('dms-sort-filter-state');
  });
}

/**
 * Wait for dms-base-table and at least one data row.
 */
async function waitForTableRows(page: Page): Promise<void> {
  await expect(page.locator('dms-base-table')).toBeVisible({ timeout: 15000 });
  await page.waitForSelector('.dms-body-row[role="row"]', { timeout: 15000 });
}

/**
 * Read sortColumns state from localStorage for the given table key.
 */
async function getSortColumnsState(
  page: Page,
  table: string
): Promise<{ column: string; direction: string }[] | null> {
  return page.evaluate(function readSortColumnsState(
    t: string
  ): { column: string; direction: string }[] | null {
    const raw = localStorage.getItem('dms-sort-filter-state');
    if (raw === null) {
      return null;
    }
    const state = JSON.parse(raw) as Record<
      string,
      { sortColumns?: { column: string; direction: string }[] }
    >;
    return state[t]?.sortColumns ?? null;
  },
  table);
}

/**
 * Apply a known multi-column sort to the Universe screen:
 *   primary  — Symbol ascending
 *   secondary — Yield% descending
 * After this call the localStorage sort state equals the EXPECTED_SORT_STATE
 * constant and the visual sort indicators are active.
 */
async function applyMultiColumnSort(page: Page): Promise<void> {
  const symbolHeader = page.locator('.dms-header-cell[data-column="symbol"]');
  await symbolHeader.click();
  // Wait for primary sort indicator to appear
  await expect(symbolHeader).toHaveAttribute('aria-sort', 'ascending', {
    timeout: 5000,
  });

  const yieldHeader = page.locator(
    '.dms-header-cell[data-column="yield_percent"]'
  );
  // First Shift+click: add Yield% as secondary sort ascending
  await yieldHeader.click({ modifiers: ['Shift'] });
  await page.waitForTimeout(300);
  // Second Shift+click: toggle Yield% secondary sort to descending
  await yieldHeader.click({ modifiers: ['Shift'] });
  await page.waitForTimeout(300);
}

// Expected sort state after applyMultiColumnSort().
const EXPECTED_SORT_STATE: { column: string; direction: string }[] = [
  { column: 'symbol', direction: 'asc' },
  { column: 'yield_percent', direction: 'desc' },
];

/**
 * Assert that the multi-column sort survived the preceding interaction by
 * checking (1) the localStorage sort state, (2) the visual aria-sort indicator
 * on the primary column, and (3) the presence of two sort-rank indicators.
 */
async function assertSortSurvived(page: Page): Promise<void> {
  // Ground-truth check: localStorage contains expected sort columns
  const cols = await getSortColumnsState(page, 'universes');
  expect(cols).toEqual(EXPECTED_SORT_STATE);

  // Visual check: primary sort column has aria-sort="ascending"
  const symbolHeader = page.locator('.dms-header-cell[data-column="symbol"]');
  await expect(symbolHeader).toHaveAttribute('aria-sort', 'ascending');

  // Visual check: two sort-rank superscript indicators are present
  // (one for each sorted column in multi-column sort mode)
  const rankIndicators = page.locator('[data-testid="sort-rank"]');
  await expect(rankIndicators).toHaveCount(2);
}

// ─── Story 113.3: Universe Sort State Persistence — Regression Suite ──────────
//
// These tests lock in the fix introduced in Story 113.2 by asserting that the
// multi-column sort state (localStorage + visual indicators) survives each of the
// six state-threatening interactions on the Universe screen.
//
// Seeded symbols (seedUniverseE2eData):
//   symbols[0] UAAA-<id>  Risk Group: Equities  — has trades
//   symbols[1] UBBB-<id>  Risk Group: Income    — has trades
//   symbols[2] UCCC-<id>  Risk Group: Tax-Free  — no trades
//   symbols[3] UDDD-<id>  Risk Group: Equities  — has trades
//   symbols[4] UEEE-<id>  Risk Group: Income    — no trades (used for delete)
//
// Two seeded accounts (E2E-Acct1-<id>, E2E-Acct2-<id>) are used for the
// account-filter-change test.

test.describe('Universe Sort State Persistence (Story 113.3)', () => {
  let cleanup: () => Promise<void>;
  let symbols: string[];

  test.beforeAll(async () => {
    const seeder = await seedUniverseE2eData();
    cleanup = seeder.cleanup;
    symbols = seeder.symbols;
  });

  test.afterAll(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await clearSortFilterState(page);
    await page.goto('/global/universe');
    await waitForTableRows(page);
    await applyMultiColumnSort(page);
  });

  // ── Test (a): sort survives row edit ────────────────────────────────────────

  test('(a) sort state survives row edit', async ({ page }) => {
    // Filter to a seeded symbol so that distribution-cell-0 is the target row
    const symbolFilter = page.getByPlaceholder('Search Symbol');
    await symbolFilter.fill(symbols[0]);
    await expect(
      page.locator('.dms-body-row[role="row"]').filter({ hasText: symbols[0] })
    ).toBeVisible({ timeout: 10000 });

    // Enter edit mode on the distribution cell of the first visible row
    const distCell = page.locator('[data-testid="distribution-cell-0"]');
    const displayValue = distCell.locator('.display-value');
    await displayValue.click();
    const input = distCell.locator('input[matInput]');
    await expect(input).toBeVisible({ timeout: 5000 });
    await input.fill('1.5000');
    await input.press('Enter');
    await page.waitForTimeout(500);

    // Clear symbol filter
    await symbolFilter.fill('');
    await waitForTableRows(page);

    await assertSortSurvived(page);
  });

  // ── Test (b): sort survives row add ─────────────────────────────────────────

  test('(b) sort state survives row add', async ({ page }) => {
    // Mock the universe-add POST so no real DB row is created.
    // The mock returns 200 so the dialog closes successfully.
    await page.route('**/api/universe/add', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
        return;
      }
      await route.continue();
    });

    // Mock the symbol-search autocomplete to return a predictable result.
    // ZZZZZ is not in the universe so duplicate-check will pass.
    await page.route('**/api/symbol/search**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ symbol: 'ZZZZZ', name: 'Test Symbol Z' }]),
      });
    });

    // Open the add-symbol dialog
    await page.locator('button[mattooltip="Add Symbol"]').click();
    await expect(
      page.locator('[data-testid="add-symbol-dialog"]')
    ).toBeVisible();

    // Wait for existing-symbols GET to complete (isLoading → false)
    await page.waitForTimeout(600);

    // Type the symbol to trigger autocomplete
    const symbolInput = page.locator('dms-symbol-autocomplete input');
    await symbolInput.fill('ZZZZZ');
    await page.waitForTimeout(400);

    // Pick from the autocomplete overlay
    const autocompleteOption = page
      .locator('.cdk-overlay-container mat-option')
      .filter({ hasText: 'ZZZZZ' });
    await expect(autocompleteOption).toBeVisible({ timeout: 5000 });
    await autocompleteOption.click();

    // Select a risk group
    const riskGroupSelect = page.locator(
      'mat-dialog-container mat-form-field mat-select'
    );
    await riskGroupSelect.click();
    await page.locator('.cdk-overlay-container mat-option').first().click();

    // Submit and wait for dialog to close
    const submitButton = page.locator('[data-testid="submit-button"]');
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
    await submitButton.click();
    await expect(
      page.locator('[data-testid="add-symbol-dialog"]')
    ).not.toBeVisible({ timeout: 10000 });

    await assertSortSurvived(page);
  });

  // ── Test (c): sort survives row delete ──────────────────────────────────────

  test('(c) sort state survives row delete', async ({ page }) => {
    // symbols[4] (UEEE) has no trades so its delete button is visible under
    // the All Accounts filter (default view).
    const noTradeSymbol = symbols[4];

    const symbolFilter = page.getByPlaceholder('Search Symbol');
    await symbolFilter.fill(noTradeSymbol);

    const row = page
      .locator('.dms-body-row[role="row"]')
      .filter({ hasText: noTradeSymbol });
    await expect(row).toBeVisible({ timeout: 10000 });

    const deleteButton = row.locator('[aria-label="Delete unused symbol"]');
    await expect(deleteButton).toBeVisible({ timeout: 10000 });
    await deleteButton.click();

    // Row disappears after SmartNgRX processes the delete
    await expect(row).not.toBeVisible({ timeout: 10000 });

    // Clear filter and wait for remaining rows
    await symbolFilter.fill('');
    await waitForTableRows(page);

    await assertSortSurvived(page);
  });

  // ── Test (d): sort survives account filter change ───────────────────────────

  test('(d) sort state survives account filter change', async ({ page }) => {
    const accountSelect = page.locator('.account-select mat-select');

    // Switch to first real account (index 1; index 0 = "All Accounts")
    await accountSelect.click();
    await page.locator('mat-option').nth(1).click();
    await waitForTableRows(page);

    await assertSortSurvived(page);

    // Switch back to All Accounts (index 0)
    await accountSelect.click();
    await page.locator('mat-option').nth(0).click();
    await waitForTableRows(page);

    await assertSortSurvived(page);
  });

  // ── Test (e): sort survives navigate away and back ──────────────────────────

  test('(e) sort state survives navigate away and back', async ({ page }) => {
    // Navigate away via Angular SPA routing
    await page.click('[data-testid="global-nav-screener"]');
    await expect(page).toHaveURL(/screener/, { timeout: 10000 });

    // Navigate back — GlobalUniverseComponent is re-created and reads sort
    // state from localStorage via the sortColumns$ signal initialiser.
    await page.click('[data-testid="global-nav-universe"]');
    await waitForTableRows(page);

    await assertSortSurvived(page);
  });

  // ── Test (f): sort survives page reload ─────────────────────────────────────

  test('(f) sort state survives page reload', async ({ page }) => {
    // Hard reload — component re-initialises sortColumns$ from localStorage
    await page.reload();
    await waitForTableRows(page);

    await assertSortSurvived(page);
  });
});
