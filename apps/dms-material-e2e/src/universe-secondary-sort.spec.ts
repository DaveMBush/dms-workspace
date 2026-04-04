import { expect, Page, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedUniverseE2eData } from './helpers/seed-universe-e2e-data.helper';

/**
 * Helper: collect text content from all visible cells in a given column
 * index (1-based).
 */
async function getColumnTexts(page: Page, colIndex: number): Promise<string[]> {
  const cells = page.locator(`tr.mat-mdc-row td:nth-child(${colIndex})`);
  const count = await cells.count();
  const texts: string[] = [];
  for (let i = 0; i < count; i++) {
    const text = await cells.nth(i).textContent();
    texts.push((text ?? '').trim());
  }
  return texts;
}

/**
 * Helper: clear sort-filter state from localStorage before each test so sort
 * indicators and stored sort columns do not leak between tests.
 */
async function clearSortFilterState(page: Page): Promise<void> {
  await page.evaluate(function removeSortFilterState(): void {
    localStorage.removeItem('dms-sort-filter-state');
  });
}

/**
 * Helper: wait for the universe table to load rows into the DOM.
 */
async function waitForTableRows(page: Page): Promise<void> {
  await expect(page.locator('dms-base-table')).toBeVisible({ timeout: 15000 });
  await page.waitForSelector('tr.mat-mdc-row', { timeout: 15000 });
}

// ─── Story 43.2 – Secondary Sort E2E Tests ───────────────────────────────────
//
// These tests verify that multi-column sort on the Universe screen correctly
// sub-orders rows that share the same primary sort value by the secondary sort
// column (both ascending and descending directions).
//
// Depends on the Story 43.1 server-side secondary sort ORDER BY fix, which was
// merged to main at commit 5225e68 (PR #903).
//
// Seeded data via seedUniverseE2eData():
//   symbols[0] UAAA-<id>  Risk Group: Equities  ex_date = 2026-06-15 (later)
//   symbols[1] UBBB-<id>  Risk Group: Income    ex_date = 2026-03-01
//   symbols[2] UCCC-<id>  Risk Group: Tax-Free  ex_date = 2026-09-20
//   symbols[3] UDDD-<id>  Risk Group: Equities  ex_date = 2026-04-15 (earlier)
//   symbols[4] UEEE-<id>  Risk Group: Income    ex_date = 2026-01-15
//
// UAAA and UDDD share the same primary sort value (Risk Group = "Equities"),
// making them the ideal pair for asserting secondary sort ordering.
//
// Column positions (1-based) used in CSS :nth-child selectors:
//   1 → Symbol
//   2 → Risk Group
//   8 → Ex-Date
//
// Shift+click pattern (matching existing e2e conventions):
//   await header.click({ modifiers: ['Shift'] });

test.describe('Universe Screen - Secondary Sort (Story 43.2)', () => {
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
  });

  // ─── Descending secondary sort ───────────────────────────────────────────

  test('secondary sort by Ex-Date descending sub-orders rows within same Risk Group (AC #1)', async ({
    page,
  }) => {
    // Filter to only the 5 seeded rows using the shared unique-id suffix so
    // unrelated rows in the database do not pollute the assertion.
    const sharedSuffix = symbols[0].slice('UAAA-'.length);
    const symbolInput = page.locator('input[placeholder="Search Symbol"]');
    await symbolInput.fill(sharedSuffix);
    await page.waitForTimeout(800);
    await page.waitForLoadState('networkidle');

    // Primary sort: Risk Group ascending (single click)
    const riskGroupHeader = page.getByRole('button', { name: 'Risk Group' });
    await riskGroupHeader.click();
    await page.waitForTimeout(800);
    await page.waitForLoadState('networkidle');

    // Secondary sort: Ex-Date — first Shift+click sets it to ascending,
    // second Shift+click toggles it to descending.
    const exDateHeader = page.getByRole('button', { name: 'Ex-Date' });
    await exDateHeader.click({ modifiers: ['Shift'] }); // asc
    await page.waitForTimeout(800);
    await page.waitForLoadState('networkidle');
    await exDateHeader.click({ modifiers: ['Shift'] }); // desc
    await page.waitForTimeout(800);
    await page.waitForLoadState('networkidle');

    // Collect all symbol values in current DOM row order
    const symbolValues = await getColumnTexts(page, 1);
    expect(symbolValues.length).toBe(5);

    // Within the Equities group, descending Ex-Date means later date first:
    //   UAAA (2026-06-15, later)  → must appear BEFORE
    //   UDDD (2026-04-15, earlier)
    const idxUAAA = symbolValues.indexOf(symbols[0]); // ex_date 2026-06-15
    const idxUDDD = symbolValues.indexOf(symbols[3]); // ex_date 2026-04-15

    expect(idxUAAA).toBeGreaterThan(-1);
    expect(idxUDDD).toBeGreaterThan(-1);
    expect(idxUAAA).toBeLessThan(idxUDDD);
  });

  // ─── Ascending secondary sort ────────────────────────────────────────────

  test('secondary sort by Ex-Date ascending sub-orders rows within same Risk Group (AC #1)', async ({
    page,
  }) => {
    // Filter to only the 5 seeded rows using the shared unique-id suffix.
    const sharedSuffix = symbols[0].slice('UAAA-'.length);
    const symbolInput = page.locator('input[placeholder="Search Symbol"]');
    await symbolInput.fill(sharedSuffix);
    await page.waitForTimeout(800);
    await page.waitForLoadState('networkidle');

    // Primary sort: Risk Group ascending (single click)
    const riskGroupHeader = page.getByRole('button', { name: 'Risk Group' });
    await riskGroupHeader.click();
    await page.waitForTimeout(800);
    await page.waitForLoadState('networkidle');

    // Secondary sort: Ex-Date ascending (single Shift+click)
    const exDateHeader = page.getByRole('button', { name: 'Ex-Date' });
    await exDateHeader.click({ modifiers: ['Shift'] });
    await page.waitForTimeout(800);
    await page.waitForLoadState('networkidle');

    // Collect all symbol values in current DOM row order
    const symbolValues = await getColumnTexts(page, 1);
    expect(symbolValues.length).toBe(5);

    // Within the Equities group, ascending Ex-Date means earlier date first:
    //   UDDD (2026-04-15, earlier) → must appear BEFORE
    //   UAAA (2026-06-15, later)
    const idxUAAA = symbolValues.indexOf(symbols[0]); // ex_date 2026-06-15
    const idxUDDD = symbolValues.indexOf(symbols[3]); // ex_date 2026-04-15

    expect(idxUAAA).toBeGreaterThan(-1);
    expect(idxUDDD).toBeGreaterThan(-1);
    expect(idxUDDD).toBeLessThan(idxUAAA);
  });
});
