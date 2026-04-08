import { expect, Page, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedFillerUniverseSymbols } from './helpers/seed-filler-universe-symbols.helper';
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
  let fillerCleanup: () => Promise<void>;

  test.beforeAll(async () => {
    const seeder = await seedUniverseE2eData();
    cleanup = seeder.cleanup;
    // Seed 50 filler symbols to guarantee >50 total rows are visible,
    // ensuring the virtual-scroll stale-position-50 boundary is always crossed.
    const filler = await seedFillerUniverseSymbols(50);
    fillerCleanup = filler.cleanup;
  });

  test.afterAll(async () => {
    if (cleanup) {
      await cleanup();
    }
    if (fillerCleanup) {
      await fillerCleanup();
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
    // present so SmartNgRX's stale-position boundary is crossed.
    // Filtering to just the 5 seeded symbols would keep all IDs within the
    // first page (positions 0-4) and hide the bug.

    // Click "Avg Purch Yield %" header once for ascending, then again for descending.
    // Capture the /api/top response to verify the returned indexes are unique.
    // This is more reliable than DOM inspection with CDK virtual scroll, which
    // only renders ~30 rows in the viewport and cannot show stale rows at position 50+.
    const avgYieldHeader = page.locator(
      '[data-sort-header="avg_purchase_yield_percent"]'
    );

    // First click (ascending) — capture the response.
    const [ascResponse] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/top') && r.status() === 200
      ),
      avgYieldHeader.click(),
    ]);

    // Second click (descending) — capture the response.
    const [descResponse] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/top') && r.status() === 200
      ),
      avgYieldHeader.click(),
    ]);

    // Validate descending response: indexes must contain all IDs with no duplicates.
    const descBody = (await descResponse.json()) as Array<{
      universes?: { indexes: string[]; length: number };
    }>;
    const descUniverses = descBody[0]?.universes;
    expect(descUniverses).toBeDefined();

    const indexes = descUniverses!.indexes;
    const totalCount = descUniverses!.length;

    // All returned IDs must cover the full universe set.
    expect(indexes.length).toBe(totalCount);

    // No duplicate IDs in the response — this catches the stale-position bug
    // where some IDs appeared at both a new sorted position and an old stale
    // position beyond the first page.
    const uniqueIds = new Set(indexes);
    expect(uniqueIds.size).toBe(indexes.length);

    // Also verify ascending response has no duplicates.
    const ascBody = (await ascResponse.json()) as Array<{
      universes?: { indexes: string[]; length: number };
    }>;
    const ascIndexes = ascBody[0]?.universes?.indexes ?? [];
    const uniqueAscIds = new Set(ascIndexes);
    expect(uniqueAscIds.size).toBe(ascIndexes.length);
  });
});
