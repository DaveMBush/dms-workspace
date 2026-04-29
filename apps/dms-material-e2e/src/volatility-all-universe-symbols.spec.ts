import { expect, Page, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedVolatilityHeldAndUnheldData } from './helpers/seed-volatility-held-and-unheld.helper';

/**
 * Story 88.4 — E2E: Volatility Visible for Held and Unheld Universe Symbols
 *
 * Regression guard: proves the Universe screen renders a valid Vol/SVol icon
 * for BOTH a held symbol (open trade + divDeposits) and an unheld symbol
 * (no trades, no divDeposits) using pre-stored volatility values.
 *
 * TDD-red status (pre Stories 88.2+88.3):
 *   - heldSymbol assertions: pass (volatility was already stored for held)
 *   - unheldSymbol assertions: fail (volatility_long / volatility_short are
 *     NULL for unheld symbols before the Epic 88 fix)
 *
 * TDD-green status (after Stories 88.2+88.3 merged): both symbols pass.
 */

const VOL_CATEGORY_REGEX =
  /^Volatility: (steady|increasing|decreasing|volatile|flat|up-then-down|down-then-up|insufficient history)$/;
const SVOL_CATEGORY_REGEX =
  /^Short-Term Volatility: (steady|increasing|decreasing|volatile|flat|up-then-down|down-then-up|insufficient history)$/;

async function searchForSymbol(page: Page, symbol: string) {
  const searchInput = page.locator('input[placeholder="Search Symbol"]');
  const row = page.locator('tbody tr').filter({
    has: page.locator('td.mat-column-symbol', { hasText: symbol }),
  });

  await searchInput.fill(symbol);
  await expect(row).toHaveCount(1, { timeout: 10_000 });

  return row.first();
}

async function expectVolIconForSymbol(
  page: Page,
  symbol: string,
  column: 'svol' | 'vol',
  ariaLabelRegex: RegExp
): Promise<void> {
  const row = await searchForSymbol(page, symbol);
  const cell = row.locator(`td.mat-column-${column}`);
  const icon = cell.locator('mat-icon');

  await expect
    .poll(
      async () => {
        const label = await icon.getAttribute('aria-label').catch(() => null);
        return label;
      },
      {
        timeout: 10_000,
        message: `Expected ${column} icon for ${symbol} to have a valid aria-label`,
      }
    )
    .toMatch(ariaLabelRegex);
}

test.describe('Story 88.4 — Volatility for held and unheld universe symbols', function describe884() {
  let cleanup: (() => Promise<void>) | undefined;
  let heldSymbol: string;
  let unheldSymbol: string;

  test.beforeAll(async function seedData() {
    const result = await seedVolatilityHeldAndUnheldData();
    cleanup = result.cleanup;
    heldSymbol = result.heldSymbol;
    unheldSymbol = result.unheldSymbol;
  });

  test.afterAll(async function teardown() {
    if (cleanup !== undefined) {
      await cleanup();
    }
  });

  test.beforeEach(async function navigateToUniverse({ page }) {
    await login(page);
    await page.goto('/global/universe');
    await expect(page.locator('dms-base-table')).toBeVisible({
      timeout: 15_000,
    });
    await page.waitForSelector('tr.mat-mdc-row', { timeout: 15_000 });
  });

  test('Vol column shows a real category for both held and unheld symbols', async function volColumnShowsRealCategory({
    page,
  }) {
    await expectVolIconForSymbol(page, heldSymbol, 'vol', VOL_CATEGORY_REGEX);
    await expectVolIconForSymbol(page, unheldSymbol, 'vol', VOL_CATEGORY_REGEX);
  });

  test('SVol column shows a real category for both held and unheld symbols', async function svolColumnShowsRealCategory({
    page,
  }) {
    await expectVolIconForSymbol(page, heldSymbol, 'svol', SVOL_CATEGORY_REGEX);
    await expectVolIconForSymbol(
      page,
      unheldSymbol,
      'svol',
      SVOL_CATEGORY_REGEX
    );
  });
});
