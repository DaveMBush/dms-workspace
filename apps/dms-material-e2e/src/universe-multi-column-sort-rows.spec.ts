import { expect, Page, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedUniverseE2eData } from './helpers/seed-universe-e2e-data.helper';

/**
 * Helper: collect text content from all visible cells in a given column index (1-based).
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

// ─── Stories 36.1 + 36.3: Multi-Column Sort Row Ordering & Refresh Persistence ─
//
// The existing multi-column-sort.spec.ts verifies that sort state is persisted
// in localStorage correctly. This file verifies that multi-column sort actually
// REORDERS ROWS in the DOM — the behaviour the buggy implementation fails to
// deliver — and that the sort state survives a page refresh (Story 36.3).
//
// Column positions (1-based) in Universe table:
//   1 → Symbol
//   2 → Risk Group
//   8 → Ex-Date
//
// Seeded data (from seedUniverseE2eData):
//   symbols[0] UAAA-<id>  Equities  ex_date = 2026-06-15  (June, later)
//   symbols[1] UBBB-<id>  Income    ex_date = 2026-03-01
//   symbols[2] UCCC-<id>  Tax-Free  ex_date = 2026-09-20
//   symbols[3] UDDD-<id>  Equities  ex_date ≈ today+30   (May, earlier)
//   symbols[4] UEEE-<id>  Income    ex_date ≈ today-30   (March, earlier)
//
// For AC #2 (secondary sort): within the Equities group, correct ex_date ASC
// ordering requires UDDD (May) before UAAA (June). The buggy implementation
// leaves them in default DB insertion order: UAAA then UDDD. So the assertion
// idxUDDD < idxUAAA FAILS against the current codebase (by design).

test.describe('Universe Screen - Multi-Column Sort Row Ordering & Refresh Persistence (Stories 36.1 + 36.3)', () => {
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

  // ─── AC #1: Primary sort orders rows correctly (PASSES) ───────────────────

  test('primary sort by Symbol ascending orders rows alphabetically (AC #1)', async ({
    page,
  }) => {
    // Filter to the 5 seeded rows using the shared unique-id portion.
    // All symbols share the same suffix: UAAA-<id>, UBBB-<id>, UCCC-<id> …
    const sharedSuffix = symbols[0].slice('UAAA-'.length);
    const symbolInput = page.locator('input[placeholder="Search Symbol"]');
    await symbolInput.fill(sharedSuffix);
    await page.waitForTimeout(800);
    await page.waitForLoadState('networkidle');

    // Click Symbol header to sort ascending (primary sort)
    const symbolHeader = page.getByRole('button', { name: 'Symbol' });
    await symbolHeader.click();
    await page.waitForTimeout(800);
    await page.waitForLoadState('networkidle');

    // Collect Symbol values after ascending sort
    const ascValues = await getColumnTexts(page, 1);
    expect(ascValues.length).toBe(5);

    // UAAA (symbols[0]) must appear before UEEE (symbols[4]) in ascending order
    const ascIdxUAAA = ascValues.indexOf(symbols[0]);
    const ascIdxUEEE = ascValues.indexOf(symbols[4]);
    expect(ascIdxUAAA).toBeGreaterThan(-1);
    expect(ascIdxUEEE).toBeGreaterThan(-1);
    expect(ascIdxUAAA).toBeLessThan(ascIdxUEEE);

    // Click Symbol header again to sort descending, proving the sort is live
    // (not just natural DB insertion order)
    await symbolHeader.click();
    await page.waitForTimeout(800);
    await page.waitForLoadState('networkidle');

    const descValues = await getColumnTexts(page, 1);
    expect(descValues.length).toBe(5);

    // In descending order UEEE must appear before UAAA — opposite of ascending
    const descIdxUAAA = descValues.indexOf(symbols[0]);
    const descIdxUEEE = descValues.indexOf(symbols[4]);
    expect(descIdxUEEE).toBeLessThan(descIdxUAAA);
  });

  // ─── Story 36.3: Sort state persists across page refresh ────────────────────
  //
  // AC #1: sort rank indicators visible on both sorted column headers after reload
  // AC #2: row order matches pre-reload order (server honours restored sort columns)
  // AC #3: this test is the regression-proof extension of Story 36.1 tests

  test('multi-column sort indicators and row order are preserved after page refresh (Story 36.3 AC #1, #2, #3)', async ({
    page,
  }) => {
    // Filter to the 5 seeded rows so assertions are deterministic.
    const sharedSuffix = symbols[0].slice('UAAA-'.length);
    const symbolInput = page.locator('input[placeholder="Search Symbol"]');
    await symbolInput.fill(sharedSuffix);
    await page.waitForTimeout(800);
    await page.waitForLoadState('networkidle');

    // Primary sort: Risk Group ascending
    const riskGroupHeader = page.getByRole('button', { name: 'Risk Group' });
    await riskGroupHeader.click();
    await page.waitForTimeout(800);
    await page.waitForLoadState('networkidle');

    // Secondary sort: Ex-Date ascending (Shift+click)
    const exDateHeader = page.getByRole('button', { name: 'Ex-Date' });
    await exDateHeader.click({ modifiers: ['Shift'] });
    await page.waitForTimeout(800);
    await page.waitForLoadState('networkidle');

    // Capture symbol order before reload — this is the ground truth.
    const symbolsBefore = await getColumnTexts(page, 1);
    expect(symbolsBefore.length).toBe(5);

    // ── Simulate browser refresh ──────────────────────────────────────────
    await page.reload();
    await waitForTableRows(page);
    await page.waitForTimeout(800);
    await page.waitForLoadState('networkidle');

    // AC #1: sort rank indicators must be visible on both sort columns.
    // BaseTableComponent renders [data-testid="sort-rank"] spans inside the
    // column header for every entry in sortRankMap — exactly one per sorted
    // column. Two sort columns → two indicators.
    const rankIndicators = page.locator('[data-testid="sort-rank"]');
    await expect(rankIndicators).toHaveCount(2);

    // AC #2: row order after refresh must match row order before refresh.
    // This confirms the server honoured the restored sort columns.
    const symbolsAfter = await getColumnTexts(page, 1);
    expect(symbolsAfter.length).toBe(5);
    expect(symbolsAfter).toEqual(symbolsBefore);
  });

  // ─── AC #2: Secondary sort reorders rows within the same primary group ────
  //
  // Currently fails — secondary sort bug (fixed in Story 36.2).
  //
  // Without the fix the server receives only the primary sort column in the
  // request, so rows within the Equities group remain in insertion order
  // (UAAA first, UDDD second). The assertion below expects the opposite
  // (UDDD first because its ex_date is earlier), and therefore FAILS.

  test('secondary sort by Ex-Date orders rows within same Risk Group ascending (AC #2)', async ({
    page,
  }) => {
    // Filter to the 5 seeded rows
    const sharedSuffix = symbols[0].slice('UAAA-'.length);
    const symbolInput = page.locator('input[placeholder="Search Symbol"]');
    await symbolInput.fill(sharedSuffix);
    await page.waitForTimeout(800);
    await page.waitForLoadState('networkidle');

    // Primary sort: Risk Group ascending
    const riskGroupHeader = page.getByRole('button', { name: 'Risk Group' });
    await riskGroupHeader.click();
    await page.waitForTimeout(800);
    await page.waitForLoadState('networkidle');

    // Secondary sort: Ex-Date ascending (Shift+click)
    // After this, within the Equities group:
    //   UDDD (ex_date 2026-04-15, April)  should appear before
    //   UAAA (ex_date 2026-06-15, June)
    const exDateHeader = page.getByRole('button', { name: 'Ex-Date' });
    await exDateHeader.click({ modifiers: ['Shift'] });
    await page.waitForTimeout(800);
    await page.waitForLoadState('networkidle');

    // Collect all displayed symbol values in DOM order
    const symbolValues = await getColumnTexts(page, 1);
    expect(symbolValues.length).toBe(5);

    // Identify positions of the two Equities rows
    const idxUAAA = symbolValues.indexOf(symbols[0]); // ex_date 2026-06-15 — later date
    const idxUDDD = symbolValues.indexOf(symbols[3]); // ex_date 2026-04-15 — earlier date

    expect(idxUAAA).toBeGreaterThan(-1);
    expect(idxUDDD).toBeGreaterThan(-1);

    // UDDD (earlier ex_date) MUST appear before UAAA (later ex_date)
    // within the shared Equities primary group.
    // This assertion FAILS against the current buggy implementation because
    // secondary sort has no effect on the actual rows returned by the server.
    expect(idxUDDD).toBeLessThan(idxUAAA);
  });
});
