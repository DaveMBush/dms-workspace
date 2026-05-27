/**
 * Epic 78 / Story 78.1 — Dist/Year Weekly Acceptance: Failing E2E Tests
 *
 * ── Purpose ──────────────────────────────────────────────────────────────────
 * TDD red phase: these tests confirm the bug where the Dist/Year
 * (distributions_per_year) field on the Universe screen has [max]="12"
 * hardcoded in the template.  For a symbol with weekly distribution frequency
 * (52 distributions per year), entering 52 incorrectly triggers the validation
 * error "Value must be at most 12".
 *
 * Both tests are EXPECTED TO FAIL against the current codebase.  They
 * become the definitive pass/fail gate for Story 78.2, which will fix the
 * hardcoded max to be dynamic based on distribution frequency.
 *
 * ── Bug location ─────────────────────────────────────────────────────────────
 * apps/dms-material/src/app/global/global-universe/global-universe.component.html
 * Line with: [max]="12"  ← hardcoded; should be dynamic per frequency
 *
 * ── Test data ────────────────────────────────────────────────────────────────
 * Uses the standard E2E test seed symbol TESTEQ1 (seeded by tools/create-test-db.js).
 * No custom seeding is required: the bug manifests for ANY symbol when the
 * user enters a value > 12 in the Dist/Year field.
 *
 * ── NOTE ─────────────────────────────────────────────────────────────────────
 * `pnpm all` will NOT pass after this story — that is expected and intentional.
 * These tests are restored to green by Story 78.2.
 * Do not skip or .skip() these tests.
 */

import { expect, test } from 'playwright/test';

import { login } from './helpers/login.helper';

/** Standard E2E seed symbol guaranteed to be in the test database. */
const TEST_SYMBOL = 'TESTEQ1';

/** Number of distributions per year for a weekly schedule. */
const WEEKLY_DIST_PER_YEAR = 52;

test.describe('Dist/Year Weekly Acceptance — Epic 78 / Story 78.1', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/global/universe');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('dms-base-table')).toBeVisible({
      timeout: 15000,
    });
    // Wait for at least one data row to render.
    await page.waitForSelector('.dms-body-row[role="row"]', { timeout: 15000 });

    // Filter to the known seed symbol so only one row is visible.
    const symbolInput = page.locator('input[placeholder="Search Symbol"]');
    await symbolInput.fill(TEST_SYMBOL);
    // Wait for the row to appear — Playwright retries until the table re-renders.
    // No fixed debounce sleep: we let the assertion itself act as the gate.
    await expect(
      page.locator('.dms-body-row[role="row"]', {
        has: page.locator(`text=${TEST_SYMBOL}`),
      })
    ).toBeVisible({ timeout: 10000 });
  });

  // NOTE: No afterEach teardown is needed.
  // Both tests are in the TDD-red phase: they FAIL because saveEdit() returns
  // early when numericValue > max (hardcoded [max]="12"), so the 52 value is
  // never persisted to the database.  The E2E test database is also rebuilt
  // from scratch at the start of every run (prepare-e2e-db target), so any
  // inadvertent mutation would be harmless across runs.

  // EXPECTED TO FAIL: Bug exists until Story 78.2 is implemented
  test('AC#1 — entering 52 in Dist/Year for a weekly symbol shows no validation error', async ({
    page,
  }) => {
    const row = page.locator('.dms-body-row[role="row"]', {
      has: page.locator(`text=${TEST_SYMBOL}`),
    });
    await expect(row).toBeVisible({ timeout: 10000 });

    // Click the Dist/Year display value to enter edit mode.
    const distPerYearTd = row.locator(
      '.dms-body-cell[data-column="distributions_per_year"]'
    );
    const distPerYearDisplay = distPerYearTd.locator('.display-value');
    await distPerYearDisplay.click();

    // Fill the input with 52 (weekly distributions per year).
    const distPerYearInput = distPerYearTd.locator('input[matinput]');
    await expect(distPerYearInput).toBeVisible({ timeout: 5000 });
    await distPerYearInput.fill(String(WEEKLY_DIST_PER_YEAR));

    // Blur the field to trigger saveEdit() and validation.
    await distPerYearInput.blur();

    // EXPECTED TO FAIL: 'Value must be at most 12' IS visible due to the
    // hardcoded [max]="12" in global-universe.component.html.
    // After Story 78.2 this assertion will PASS (no error for weekly symbols).
    await expect(page.getByText('Value must be at most 12')).not.toBeVisible();
  });

  // EXPECTED TO FAIL: Bug exists until Story 78.2 is implemented
  test('AC#2 — Dist/Year cell saves 52 and exits edit mode for a weekly symbol', async ({
    page,
  }) => {
    const row = page.locator('.dms-body-row[role="row"]', {
      has: page.locator(`text=${TEST_SYMBOL}`),
    });
    await expect(row).toBeVisible({ timeout: 10000 });

    // Click the Dist/Year display value to enter edit mode.
    const distPerYearTd = row.locator(
      '.dms-body-cell[data-column="distributions_per_year"]'
    );
    const distPerYearDisplay = distPerYearTd.locator('.display-value');
    await distPerYearDisplay.click();

    // Fill the input with 52 and press Enter to commit.
    const distPerYearInput = distPerYearTd.locator('input[matinput]');
    await expect(distPerYearInput).toBeVisible({ timeout: 5000 });
    await distPerYearInput.fill(String(WEEKLY_DIST_PER_YEAR));
    await distPerYearInput.press('Enter');

    // EXPECTED TO FAIL: The input remains visible because validation rejects 52
    // (saveEdit() returns early when numericValue > max, keeping isEditing$=true).
    // After Story 78.2 the input should be hidden (edit mode closed).
    await expect(distPerYearInput).not.toBeVisible({ timeout: 5000 });

    // EXPECTED TO FAIL: The display value should show 52 after a successful save.
    // Currently the value is never saved due to the hardcoded max constraint.
    await expect(distPerYearDisplay).toHaveText(String(WEEKLY_DIST_PER_YEAR));
  });
});
