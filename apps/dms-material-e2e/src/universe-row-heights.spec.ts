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
 * `mat-icon-button` inside `tr.mat-mdc-row td`.  This prevents the button
 * from inflating the cell while keeping the visible icon the same size.
 *
 * ── test.fail() rationale ────────────────────────────────────────────────
 * The assertion below (`uniqueHeights.size === 1`) FAILS on the current
 * codebase because icon-button rows are taller.  Wrapping it with
 * `test.fail()` marks this as an *expected* failure so CI stays green.
 *
 * When Story 67.2 pins the row height correctly this test will UNEXPECTEDLY
 * PASS, turning CI red and signalling that the `test.fail()` wrapper must be
 * removed.
 *
 * References: _bmad-output/planning-artifacts/epics-2026-04-13.md — Epic 67
 */

import { expect, Page, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedRowHeightE2eData } from './helpers/seed-row-height-e2e-data.helper';

const ROW_SELECTOR = 'tr.mat-mdc-row';

/** Wait for the Universe table to render at least one data row. */
async function waitForUniverseRows(page: Page): Promise<void> {
  await expect(page.locator('dms-base-table')).toBeVisible({ timeout: 15000 });
  await page.waitForSelector(ROW_SELECTOR, { timeout: 15000 });
}

test.describe('Universe Row Height Consistency — Epic 67 / Story 67.1', () => {
  let cleanup: () => Promise<void>;

  test.beforeEach(async ({ page }) => {
    const seeder = await seedRowHeightE2eData();
    cleanup = seeder.cleanup;

    await login(page);
    await page.goto('/global/universe');
    await waitForUniverseRows(page);
  });

  test.afterEach(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  /**
   * Epic 67 Story 67.1 — Expected Failure (diagnosis)
   *
   * Collects the `offsetHeight` of every visible `tr.mat-mdc-row` and asserts
   * they are ALL equal.  This assertion **fails** on the current codebase
   * because rows containing `<button mat-icon-button>` are approximately 5 px
   * taller than rows without it.
   *
   * Marked `test.fail()` so the suite remains green while the inconsistency
   * exists.  Remove the `test.fail()` call after Story 67.2 fixes the height.
   */
  test('all visible rows have equal offsetHeight (diagnoses icon-button inflation)', async ({
    page,
  }) => {
    // Mark as expected failure — remove this line after Story 67.2 fix.
    test.fail();

    const rowHeights = await page.evaluate(
      function measureRowHeights(): number[] {
        return Array.from(document.querySelectorAll('tr.mat-mdc-row')).map(
          function getHeight(r: Element): number {
            return (r as HTMLElement).offsetHeight;
          }
        );
      }
    );

    // At least some rows must be visible for the measurement to be meaningful.
    expect(rowHeights.length).toBeGreaterThan(1);

    // Log the distinct heights to make diagnosis easy when reviewing the report.
    const uniqueHeights = new Set(rowHeights);

    // This assertion FAILS because icon-button rows have a different height.
    // Expected (after Story 67.2): uniqueHeights.size === 1 (all 52 px).
    expect(
      uniqueHeights.size,
      `Expected all rows to share one height but found ${
        uniqueHeights.size
      } distinct values: ${JSON.stringify([...uniqueHeights])}`
    ).toBe(1);
  });
});
