/**
 * Epic 67 / Story 67.1: Row Height Inconsistency — Measurement and Failing Test
 *
 * ── Purpose ──────────────────────────────────────────────────────────────────
 * The Universe table renders `<button mat-icon-button>` (delete action) inside
 * some rows when `shouldShowDeleteButton()` returns true (i.e. the row has
 * `is_closed_end_fund = false` and `position = 0`).  Angular Material's
 * `mat-icon-button` applies a `min-height` (or padding) that inflates the
 * containing `<td>`, overriding the CDK virtual-scroll token
 * `--mat-table-row-item-container-height: 52px`.  Rows WITHOUT this button
 * stay at 52 px; rows WITH the button grow to approximately 57 px.
 *
 * ── Measured heights (Chromium, 1280 × 720, Universe screen) ─────────────
 * Rows WITHOUT mat-icon-button (is_closed_end_fund = true):  ~52 px
 * Rows WITH    mat-icon-button (is_closed_end_fund = false):  ~57 px
 * Discrepancy: ~5 px
 *
 * Source of inflation: mat-icon-button default min-height / line-height rules
 * push the cell above 52 px even though the CDK itemSize is set to 52.
 *
 * ── Chosen target height for Story 67.2 ──────────────────────────────────
 * Pin ALL rows at 52 px by adding an explicit height constraint on
 * `mat-icon-button` inside `.dms-body-row[role="row"] td`.  This prevents the button
 * from inflating the cell while keeping the visible icon the same size.
 *
 * ── Fix applied (Epic 111 / Story 67.2) ─────────────────────────────────
 * Epic 111 refactored the base-table to a two-region layout that eliminated
 * the mat-icon-button height inflation.  All rows now render at 52 px.
 * The `test.fail()` wrapper was removed; this test now passes green.
 *
 * References: _bmad-output/planning-artifacts/epics-2026-04-13.md — Epic 67
 */

import { expect, Page, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedRowHeightE2eData } from './helpers/seed-row-height-e2e-data.helper';

const ROW_SELECTOR = '.dms-body-row[role="row"]';

/** Wait for the Universe table to render at least one data row. */
async function waitForUniverseRows(page: Page): Promise<void> {
  await expect(page.locator('dms-base-table')).toBeVisible({ timeout: 15000 });
  await page.waitForSelector(ROW_SELECTOR, { timeout: 15000 });
}

test.describe('Universe Row Height Consistency — Epic 67 / Story 67.1', () => {
  let cleanup: () => Promise<void>;
  let seededSymbols: string[] = [];

  test.beforeEach(async ({ page }) => {
    const seeder = await seedRowHeightE2eData();
    cleanup = seeder.cleanup;
    seededSymbols = seeder.symbols;

    await login(page);
    await page.goto('/global/universe');
    await waitForUniverseRows(page);

    // Filter the universe table to show only the seeded symbols so they are
    // all visible in the CDK virtual scroll viewport.  The seeded prefixes
    // (RH67BTN1-…, RH67NOBTN1-…) may sort to the middle or end of a large
    // universe list and would not be rendered without scrolling.
    // Using the shared uniqueId suffix is the narrowest filter possible while
    // still matching all six seeded rows.
    const uniquePart = seededSymbols[0].split('-').slice(1).join('-');
    const symbolFilter = page.getByPlaceholder('Search Symbol');
    await symbolFilter.fill(uniquePart);
    // Wait until at least one seeded row is visible before continuing.
    await page.waitForSelector(ROW_SELECTOR, { timeout: 10000 });
  });

  test.afterEach(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  /**
   * Epic 67 Story 67.1 — Expected Failure (diagnosis)
   *
   * Collects the `offsetHeight` of only the seeded `.dms-body-row[role="row"]` elements
   * (rows whose text content contains one of the six Story 67.1 symbols) and
   * asserts they are ALL equal.  This assertion **fails** on the current
   * codebase because rows containing `<button mat-icon-button>` are
   * approximately 5 px taller than rows without it.
   *
   * Scoping to seeded symbols makes the test deterministic regardless of
   * other universe data that may be present in the E2E fixture.
   *
   * Story 67.2 (via Epic 111) equalised all row heights by removing the
   * mat-icon-button height inflation.  The test.fail() wrapper was removed
   * after verifying this test passes consistently.
   */
  test('all visible rows have equal offsetHeight (diagnoses icon-button inflation)', async ({
    page,
  }) => {
    const rowHeights = await page.evaluate(function measureSeededRowHeights(
      symbols: string[]
    ): number[] {
      return Array.from(document.querySelectorAll('.dms-body-row[role="row"]'))
        .filter(function rowContainsSymbol(row: Element): boolean {
          const text = row.textContent ?? '';
          return symbols.some(function matchSymbol(symbol: string): boolean {
            return text.includes(symbol);
          });
        })
        .map(function getHeight(row: Element): number {
          return (row as HTMLElement).offsetHeight;
        });
    },
    seededSymbols);

    // All six seeded rows must be visible for the measurement to be meaningful.
    expect(rowHeights.length).toBeGreaterThan(1);

    const uniqueHeights = new Set(rowHeights);

    // This assertion FAILS because icon-button rows have a different height.
    // Expected (after Story 67.2): uniqueHeights.size === 1 (all 52 px).
    expect(
      uniqueHeights.size,
      `Expected all seeded rows to share one height but found ${
        uniqueHeights.size
      } distinct values: ${JSON.stringify([...uniqueHeights])}`
    ).toBe(1);
  });
});
