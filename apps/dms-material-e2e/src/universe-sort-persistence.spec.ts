import { expect, Page, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import {
  createDeletableUniverseSymbol,
  seedUniverseE2eData,
} from './helpers/seed-universe-e2e-data.helper';

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
    // Note: applyMultiColumnSort is called per-test so that tests (a) and (c)
    // can filter by symbol BEFORE the sort is applied. Without a sort active,
    // the full universe data is in the virtual-scroll cache, so the symbol
    // filter reliably finds the seeded row. Tests (b/d/e/f) apply the sort
    // themselves before their state-threatening interaction.
  });

  // ── Test (a): sort survives row edit ────────────────────────────────────────

  test('(a) sort state survives row edit', async ({ page }) => {
    // Filter to the seeded symbol BEFORE applying the sort so the table is
    // narrowed to the one seeded row before the multi-column sort fires.
    const targetRow = page
      .locator('.dms-body-row[role="row"]')
      .filter({ hasText: symbols[0] });

    // Wait for networkidle so the SmartNgRX cache is populated before the
    // symbol filter fires. Virtual scroll only renders visible viewport rows
    // so waiting for the specific row to be visible is unreliable on Firefox.
    await page
      .waitForLoadState('networkidle', { timeout: 15000 })
      .catch(() => {});

    const symbolFilter = page.getByPlaceholder('Search Symbol');
    await symbolFilter.fill('');
    await symbolFilter.fill(symbols[0]);
    await page.waitForTimeout(600);
    await expect(targetRow).toBeVisible({ timeout: 20000 });

    // Now apply the multi-column sort while the filter is still active.
    await applyMultiColumnSort(page);

    // Enter edit mode on the distribution cell of the (still filtered) first row.
    // [data-testid="distribution-cell-0"] IS the display-value span (role=button).
    // Clicking it directly enters edit mode; the input uses data-testid="distribution-input".
    const distCell = page.locator('[data-testid="distribution-cell-0"]');
    await distCell.click();
    const input = page.locator('input[data-testid="distribution-input"]');
    await expect(input).toBeVisible({ timeout: 5000 });
    await input.fill('1.5000');
    await input.press('Enter');
    await page.waitForTimeout(500);

    // Clear symbol filter and verify sort survived the edit
    await symbolFilter.fill('');
    await waitForTableRows(page);

    await assertSortSurvived(page);
  });

  // ── Test (b): sort survives row add ─────────────────────────────────────────

  test('(b) sort state survives row add', async ({ page }) => {
    // Apply multi-column sort before the add interaction.
    await applyMultiColumnSort(page);

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
    // Create a fresh deletable symbol for this test so it is fully retryable.
    // Playwright re-runs beforeEach (not beforeAll) on retry — if we deleted
    // symbols[4] from the shared seed, any retry would fail because the row
    // would not exist. A per-test symbol is created here and cleaned up in the
    // finally block whether or not the DELETE API call succeeds.
    const { symbol: noTradeSymbol, cleanup: cleanupDelete } =
      await createDeletableUniverseSymbol();

    // Wait for networkidle so the SmartNgRX cache is populated before the
    // symbol filter fires. Virtual scroll only renders visible viewport rows
    // so waiting for the specific row to be visible is unreliable on Firefox.
    const row = page
      .locator('.dms-body-row[role="row"]')
      .filter({ hasText: noTradeSymbol });

    try {
    await page
      .waitForLoadState('networkidle', { timeout: 15000 })
      .catch(() => {});

    const symbolFilter = page.getByPlaceholder('Search Symbol');
    await symbolFilter.fill('');
    await symbolFilter.fill(noTradeSymbol);
    await page.waitForTimeout(600);
    await expect(row).toBeVisible({ timeout: 20000 });

    // Apply multi-column sort while the filter is still active.
    await applyMultiColumnSort(page);

    // Wait for SmartNgRX to finish re-fetching the sorted data so that the
    // RowProxy at each index has a real delete() method (not a placeholder
    // no-op). Without this, findAndDeleteUniverseRow may silently do nothing.
    await page
      .waitForLoadState('networkidle', { timeout: 8000 })
      .catch(() => {
        /* ignore – background polling may keep the network busy */
      });

    const deleteButton = row.locator('[aria-label="Delete unused symbol"]');
    await expect(deleteButton).toBeVisible({ timeout: 15000 });

    // Intercept the DELETE API call to confirm SmartNgRX fires the request.
    const deleteApiResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/universe/') &&
        response.request().method() === 'DELETE',
      { timeout: 15000 }
    );

    await deleteButton.click();

    // Wait for the server to confirm the delete before asserting DOM state.
    await deleteApiResponsePromise;

    // Clear the symbol filter so the filter-header row no longer contains the
    // symbol text (avoiding locator ambiguity between the header and data rows).
    await symbolFilter.fill('');

    // The deleted row must no longer appear in the full (unfiltered) table.
    await expect(row).not.toBeVisible({ timeout: 10000 });
    await waitForTableRows(page);

    await assertSortSurvived(page);
    } finally {
      // If the DELETE API call already removed the row, deleteMany is a no-op.
      await cleanupDelete().catch(() => {
        /* row already deleted by the test — no action needed */
      });
    }
  });

  // ── Test (d): sort survives account filter change ───────────────────────────

  test('(d) sort state survives account filter change', async ({ page }) => {
    // Apply multi-column sort before switching accounts.
    await applyMultiColumnSort(page);

    const accountSelect = page.locator('.account-select mat-select');

    // Switch to first real account (index 1; index 0 = "All Accounts").
    // Wait for mat-option elements to be present in the DOM before clicking
    // to avoid element-detach flakiness caused by overlay animation timing.
    await accountSelect.click();
    await page.waitForSelector('mat-option', { timeout: 5000 });
    // Small stabilisation wait — Material overlay animation can detach/reattach
    // mat-option elements briefly after they appear in the DOM.
    await page.waitForTimeout(200);
    await page.locator('mat-option').nth(1).click();
    // Wait for the overlay to fully close before proceeding.
    // Without this, the closing animation backdrop can absorb the next click.
    await expect(page.locator('mat-option')).toHaveCount(0, { timeout: 3000 });
    await waitForTableRows(page);

    await assertSortSurvived(page);

    // Switch back to All Accounts (index 0)
    await accountSelect.click();
    await page.waitForSelector('mat-option', { timeout: 10000 });
    await page.waitForTimeout(200);
    await page.locator('mat-option').nth(0).click();
    // Wait for the overlay to fully close before asserting table state.
    await expect(page.locator('mat-option')).toHaveCount(0, { timeout: 3000 });
    await waitForTableRows(page);

    await assertSortSurvived(page);
  });

  // ── Test (e): sort survives navigate away and back ──────────────────────────

  test('(e) sort state survives navigate away and back', async ({ page }) => {
    // Apply multi-column sort before navigating away.
    await applyMultiColumnSort(page);

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
    // Apply multi-column sort before reloading.
    await applyMultiColumnSort(page);

    // Hard reload — component re-initialises sortColumns$ from localStorage
    await page.reload();
    await waitForTableRows(page);

    await assertSortSurvived(page);
  });
});
