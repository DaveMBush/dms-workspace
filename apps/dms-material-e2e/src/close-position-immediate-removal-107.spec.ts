import { expect, Page, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedClosePositionE2eData } from './helpers/seed-close-position-e2e-data.helper';

/**
 * Helper: wait for the Open Positions table and at least one data row.
 */
async function waitForOpenPositionsTable(page: Page): Promise<void> {
  await expect(
    page.locator('[data-testid="open-positions-table"]')
  ).toBeVisible({ timeout: 15000 });
  await page.waitForSelector('tr.mat-mdc-row', { timeout: 15000 });
}

/**
 * Helper: clear saved sort-filter state so a pre-existing symbol filter does
 * not hide the freshly-seeded row.
 */
async function clearSortFilterState(page: Page): Promise<void> {
  await page.evaluate(function removeSortFilterState(): void {
    localStorage.removeItem('dms-sort-filter-state');
  });
}

// ─── Close Position — Immediate Removal (Epic 107) ───────────────────────────

test.describe('Close Position — Immediate Removal (Epic 107)', () => {
  let cleanup: () => Promise<void>;
  let accountId: string;
  let symbols: string[];

  test.beforeAll(async () => {
    const seeder = await seedClosePositionE2eData();
    cleanup = seeder.cleanup;
    accountId = seeder.accountId;
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
    await page.goto(`/account/${accountId}/open`);
    await waitForOpenPositionsTable(page);
  });

  test(
    'closes a position and removes it from Open Positions without reload, then shows it on Sold Positions',
    async ({ page }) => {
      // Scope the row by unique symbol text — survives any row-ordering difference.
      const row = page
        .locator('[data-testid="open-positions-table"] tr.mat-mdc-row')
        .filter({ hasText: symbols[0] });
      await expect(row).toHaveCount(1);

      // ── Step 1: Edit sell date first ──────────────────────────────────────
      // Click the display cell (row-scoped), then fill the picker which may
      // render as a Material overlay outside the <tr>.
      const sellDateCell = row.locator('[data-testid="editable-sell-date"]');
      await sellDateCell.click();
      const sellDatePicker = page.locator(
        '[data-testid="editable-sell-date-picker"]'
      );
      await sellDatePicker.waitFor({ state: 'visible', timeout: 5000 });
      await sellDatePicker.fill('06/15/2026');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);

      // Row must still be visible after sell date alone (position not yet closed).
      await expect(row).toHaveCount(1);

      // ── Step 2: Edit sell price ───────────────────────────────────────────
      // editable-cell's startEdit() auto-focuses the native input via
      // setTimeout(0). The MDC input inside a table cell may be considered
      // "hidden" by Playwright's visibility heuristics due to table overflow
      // clipping. Rely on auto-focus and keyboard input instead.
      const sellPriceCell = row.locator('[data-testid="editable-sell-price"]');
      await sellPriceCell.scrollIntoViewIfNeeded();
      await sellPriceCell.click();
      // Wait for the edit container to appear in the DOM.
      await page.waitForSelector('[data-testid="editable-sell-price-input"]', {
        state: 'attached',
        timeout: 5000,
      });
      // Allow startEdit()'s setTimeout(0) focus call to complete.
      await page.waitForTimeout(150);
      await page.keyboard.press('Control+a');
      await page.keyboard.type('150.00');

      // Start listening for the PUT /api/trades response BEFORE pressing Enter,
      // so we don't miss it if it fires before the await resolves.
      const sellPutResponse = page.waitForResponse(
        (resp) =>
          resp.url().includes('/api/trades') &&
          resp.request().method() === 'PUT',
        { timeout: 5000 }
      );

      await page.keyboard.press('Enter');

      // Wait until the server has acknowledged the sell-price update.
      // This ensures sell=150 and sell_date are persisted before we navigate
      // away and reload.
      await sellPutResponse;

      // ── AC1: Row must be gone — no page.reload() or page.goto() ──────────
      await expect(row).toHaveCount(0, { timeout: 5000 });

      // Table itself must still be visible — row vanished because the store
      // dropped it, not because the entire screen re-rendered.
      await expect(
        page.locator('[data-testid="open-positions-table"]')
      ).toBeVisible();

      // ── AC2: Navigate to Sold Positions and assert the closed row appears ─
      await page.goto(`/account/${accountId}/sold`);
      // Reload to force SmartRocks to refetch soldTrades from the server,
      // since it only cached the initial empty list before the position was closed.

      // Capture the POST /api/accounts response BEFORE reload so we can
      // inspect what soldTrades.indexes the server returns.
      const accountsResponsePromise = page.waitForResponse(
        (resp) =>
          resp.url().includes('/api/accounts') &&
          resp.request().method() === 'POST',
        { timeout: 15000 }
      );

      await page.reload();

      const accountsResp = await accountsResponsePromise;
      const accountsBody = (await accountsResp.json()) as Array<{
        id: string;
        soldTrades?: { indexes: string[]; length: number };
      }>;
      const cpAccount = accountsBody.find((a) => a.id === accountId);
      // Fail fast with a meaningful message if the server returns no sold trades
      expect(
        cpAccount?.soldTrades?.length,
        `Server returned soldTrades.length=${String(cpAccount?.soldTrades?.length)} for account ${accountId}. PUT may not have set both sell and sell_date.`
      ).toBeGreaterThan(0);

      await expect(page.locator('dms-base-table')).toBeVisible({
        timeout: 15000,
      });
      await page.waitForSelector('tr.mat-mdc-row', { timeout: 15000 });

      const soldRow = page
        .locator('dms-base-table tr.mat-mdc-row')
        .filter({ hasText: symbols[0] });
      await expect(soldRow).toHaveCount(1, { timeout: 5000 });
      // Sell date rendered as M/D/YY — 06/15/2026 → 6/15/26
      await expect(soldRow).toContainText('6/15/26');
      // Sell price entered as 150.00
      await expect(soldRow).toContainText('150');
    }
  );
});
