import { expect, Page, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedUniverseE2eData } from './helpers/seed-universe-e2e-data.helper';

/**
 * Helper: collect text content from all visible cells matching a selector.
 */
async function getCellTexts(page: Page, selector: string): Promise<string[]> {
  const cells = page.locator(selector);
  const rawTexts = await cells.allTextContents();
  return rawTexts.map((text) => text.trim());
}

const SYMBOL_CELL_SELECTOR =
  '.dms-body-row[role="row"] .dms-body-cell[data-column="symbol"]';

/**
 * Helper: set Symbol ascending sort in localStorage.
 * Uses the SortColumn storage format: { column, direction }.
 */
async function setSymbolAscSort(page: Page): Promise<void> {
  await page.evaluate(function setSortState(): void {
    localStorage.setItem(
      'dms-sort-filter-state',
      JSON.stringify({
        universes: {
          sortColumns: [{ column: 'symbol', direction: 'asc' }],
        },
      })
    );
  });
}

// ─── Story 56.1: Empty Rows on Symbol Sort Bug ───────────────────────────────
//
// This test confirms a regression: when the Universe screen first loads with
// Symbol ascending sort applied, the visible rows initially have empty symbol
// cells — before SmartNgRX has fetched the actual row data from /api/universe.
//
// Mechanism:
//   1. The app reads Symbol-ascending sort from localStorage on navigation.
//   2. It calls /api/top to get the sorted list of universe IDs.
//   3. SmartNgRX owns an ArrayProxy. When CDK virtual scroll accesses the
//      proxy at positions 0–N, SmartNgRX immediately returns a `defaultRow`
//      object with `symbol: ''` for each un-fetched position and dispatches
//      a loadByIds request to /api/universe.
//   4. The DOM rows appear with empty symbol cells.
//   5. Once /api/universe responds, the cells are updated with real data.
//
// The test deliberately delays /api/universe responses to widen the window
// in which empty cells are observable. Without the delay the response
// arrives so quickly in CI that no empty cells are visible by the time
// Playwright reads the DOM.
//
// This is now a regression guard for the historical empty-symbol bug.
// Seeded data:
//   seedUniverseE2eData() — 5 named symbols (UAAA-… through UEEE-…)

test.describe('Universe Screen - Empty Rows on Symbol Sort Bug (Story 56.1)', () => {
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

  // ─── AC #1: First visible rows are NOT empty when sorted by Symbol asc ───

  test('first visible rows have non-empty symbol cells immediately on load with Symbol ascending sort', async ({
    page,
  }) => {
    await login(page);

    // Set Symbol ascending sort in localStorage BEFORE navigating so the
    // Universe screen initialises with this sort applied on first render.
    await setSymbolAscSort(page);

    // Delay ALL /api/universe POST responses by 6 seconds BEFORE navigating.
    // This widens the window in which SmartNgRX defaultRows (symbol:'') are
    // visible, making the empty-cell state reliably observable by Playwright.
    await page.route('**/api/universe', async (route) => {
      if (route.request().method() === 'POST') {
        await new Promise<void>(function delay(resolve) {
          setTimeout(resolve, 6000);
        });
      }
      await route.continue();
    });

    await page.goto('/global/universe');

    // Wait only for the first row to appear in the DOM.
    // CDK virtual scroll renders rows immediately using SmartNgRX defaultRows
    // (symbol:'') while the real data is still in-flight — do NOT wait for
    // data to load.
    const firstRow = page.locator('.dms-body-row[role="row"]').first();
    await firstRow.waitFor({ state: 'attached', timeout: 15000 });

    // Do NOT scroll — inspect the first visible symbol cells immediately.
    const symbolTexts = await getCellTexts(page, SYMBOL_CELL_SELECTOR);
    const firstThree = symbolTexts.slice(0, 3);

    // Assert every one of the first 3 rows has a non-empty symbol value.
    for (const symbolText of firstThree) {
      expect(
        symbolText,
        `Expected first visible symbol cell to be non-empty but got: "${symbolText}"`
      ).not.toBe('');
    }
  });
});
