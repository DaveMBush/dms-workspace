import { expect, Page, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedUniverseE2eData } from './helpers/seed-universe-e2e-data.helper';

/**
 * Helper: collect text content from all visible cells in a given column index (1-based).
 */
async function getColumnTexts(page: Page, colIndex: number): Promise<string[]> {
  const cells = page.locator(`tr.mat-mdc-row td:nth-child(${colIndex})`);
  const rawTexts = await cells.allTextContents();
  return rawTexts.map((text) => text.trim());
}

/**
 * Helper: clear sort-filter state from localStorage.
 */
async function clearSortFilterState(page: Page): Promise<void> {
  await page.evaluate(function removeSortFilterState(): void {
    localStorage.removeItem('dms-sort-filter-state');
  });
}

/**
 * Helper: wait for the universe table rows to appear.
 */
async function waitForTableRows(page: Page): Promise<void> {
  await expect(page.locator('dms-base-table')).toBeVisible({ timeout: 15000 });
  await page.waitForSelector('tr.mat-mdc-row', { timeout: 15000 });
}

// ─── Story 55.1: Duplicate Universe Symbols Bug ──────────────────────────────
//
// This test confirms a regression: when the Universe screen is sorted by
// "Avg Purch Yield %" descending, some symbols appear more than once in the
// rendered table. The assertion below is expected to FAIL against the current
// codebase (red test), acting as a guard for Story 55.2.
//
// Root cause: SmartNgRX pre-loads index positions near the page boundary (≈50)
// via the virtual-scroll buffer trigger.  When the sort changes to a computed
// field, the server returns a NEW page of IDs at positions 0-49.  SmartNgRX
// updates positions 0-49 but the pre-loaded stale IDs at positions 50-51
// remain.  Any symbol whose ID exists at both a new sorted position (0-49) AND
// a stale pre-sorted position (50-51) is rendered twice in the virtual-scroll
// table.
//
// The test DOES NOT filter by symbol so the full universe list (>50 rows) is
// visible and the stale-position boundary is crossed.  Seeding data with trades
// (via seedUniverseE2eData) ensures meaningful avg_purchase_yield_percent
// values contribute to the sort, matching the production trigger condition.
//
// Seeded data (from seedUniverseE2eData):
//   symbols[0] — UAAA-<id>  4 trades (2 per account × 2 accounts)
//   symbols[1] — UBBB-<id>  2 trades (1 per account × 2 accounts)
//   symbols[2] — UCCC-<id>  0 trades
//   symbols[3] — UDDD-<id>  0 trades
//   symbols[4] — UEEE-<id>  0 trades
//
// Column positions (1-based) in Universe table:
//   1 → Symbol
//   6 → Avg Purch Yield %

test.describe('Universe Screen - Duplicate Symbols Bug (Story 55.1)', () => {
  let cleanup: () => Promise<void>;

  test.beforeAll(async () => {
    const seeder = await seedUniverseE2eData();
    cleanup = seeder.cleanup;
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
  });

  // ─── AC #1: No duplicate symbols when sorted by Avg Purch Yield % desc ───
  //
  // This test is CURRENTLY FAILING because the bug exists. It will be fixed
  // in Story 55.2 and then this test will pass.

  test('no duplicate symbols appear when sorted by Avg Purch Yield % descending (currently FAILS — confirms bug)', async ({
    page,
  }) => {
    // Do NOT filter by symbol — the full universe list (>50 rows) must be
    // visible so the stale-position-50 boundary is crossed and duplicates
    // surface.  Filtering to just the 5 seeded symbols would keep all IDs
    // within the first page (positions 0-4) and hide the bug.

    // Click "Avg Purch Yield %" header once for ascending, then again for descending.
    const avgYieldHeader = page.locator(
      '[data-sort-header="avg_purchase_yield_percent"]'
    );
    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/universe') && r.status() === 200
      ),
      avgYieldHeader.click(),
    ]);

    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/universe') && r.status() === 200
      ),
      avgYieldHeader.click(),
    ]);

    // Collect all visible symbol cell values (column 1).
    const symbolTexts = await getColumnTexts(page, 1);

    // Exclude placeholder (empty) rows that SmartNgRX renders for not-yet-loaded
    // positions.
    const nonEmpty = symbolTexts.filter(function isNonEmpty(s) {
      return s.length > 0;
    });

    // Assert no duplicates.  This assertion currently FAILS because some symbols
    // at the stale boundary position appear at both their new sorted position
    // (0-49) and their old pre-sort position (≈50), causing them to be rendered
    // twice.
    const uniqueCount = new Set(nonEmpty).size;
    expect(uniqueCount).toBe(nonEmpty.length);
  });
});
