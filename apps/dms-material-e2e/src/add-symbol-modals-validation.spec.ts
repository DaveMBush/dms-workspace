import { test, expect } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedAddSymbolModalsE2eData } from './helpers/seed-add-symbol-modals-e2e-data.helper';

test.describe.configure({ mode: 'serial' });

let accountId = '';
let universeInSymbol = '';
let universeOutSymbol = '';
let cleanup: () => Promise<void> = async function noopCleanup(): Promise<void> {
  return Promise.resolve();
};

test.beforeAll(async () => {
  const result = await seedAddSymbolModalsE2eData();
  accountId = result.accountId;
  universeInSymbol = result.universeInSymbol;
  universeOutSymbol = result.universeOutSymbol;
  cleanup = result.cleanup;
});

test.afterAll(async () => {
  await cleanup();
});

test.describe('Add-Symbol modals validation polarity', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('AC1 — Universe Add: NOT-in-universe symbol enables the submit button', async ({
    page,
  }) => {
    await page.goto('/global/universe');
    await expect(page.locator('button[mattooltip="Add Symbol"]')).toBeVisible({ timeout: 10000 });

    await page.locator('button[mattooltip="Add Symbol"]').click();
    await expect(
      page.locator('[data-testid="add-symbol-dialog"]')
    ).toBeVisible();

    // Type the out-of-universe symbol (free-text path — no autocomplete option click)
    const symbolInput = page.locator('dms-symbol-autocomplete input');
    await symbolInput.fill(universeOutSymbol);
    await symbolInput.press('Tab');

    // Select a Risk Group
    const riskGroupSelect = page.locator(
      'mat-dialog-container mat-form-field mat-select'
    );
    await riskGroupSelect.click();
    await page
      .locator('.cdk-overlay-container mat-option')
      .first()
      .click();

    // Submit button must be enabled (fix from Story 103.2)
    await expect(
      page.locator('[data-testid="submit-button"]')
    ).toBeEnabled({ timeout: 5000 });

    // No duplicate error visible
    await expect(
      page.locator('#symbol-errors mat-error', {
        hasText: 'Symbol already in universe',
      })
    ).not.toBeVisible();

    // Dialog still visible (no premature close)
    await expect(
      page.locator('[data-testid="add-symbol-dialog"]')
    ).toBeVisible();

    // Close dialog cleanly before AC2
    await page.locator('[data-testid="cancel-button"]').click();
    await expect(
      page.locator('[data-testid="add-symbol-dialog"]')
    ).not.toBeVisible();
  });

  test('AC2 — Universe Add: IN-universe symbol keeps submit button disabled and shows duplicate error', async ({
    page,
  }) => {
    await page.goto('/global/universe');
    await expect(page.locator('button[mattooltip="Add Symbol"]')).toBeVisible({ timeout: 10000 });

    await page.locator('button[mattooltip="Add Symbol"]').click();
    await expect(
      page.locator('[data-testid="add-symbol-dialog"]')
    ).toBeVisible();

    // Type the in-universe symbol (free-text, no autocomplete click needed)
    const symbolInput = page.locator('dms-symbol-autocomplete input');
    await symbolInput.fill(universeInSymbol);
    await symbolInput.press('Tab');

    // Select a Risk Group
    const riskGroupSelect = page.locator(
      'mat-dialog-container mat-form-field mat-select'
    );
    await riskGroupSelect.click();
    await page
      .locator('.cdk-overlay-container mat-option')
      .first()
      .click();

    // Submit button must be disabled (duplicate symbol in Universe)
    await expect(
      page.locator('[data-testid="submit-button"]')
    ).toBeDisabled({ timeout: 5000 });

    // Duplicate error must be visible
    await expect(
      page.locator('#symbol-errors mat-error', {
        hasText: 'Symbol already in universe',
      })
    ).toBeVisible({ timeout: 5000 });
  });

  test('AC3 — Open Positions Add: IN-universe symbol enables the save button (no regression)', async ({
    page,
  }) => {
    await page.goto(`/account/${accountId}/open`);

    const addButton = page.locator('[data-testid="add-new-position-button"]');
    await expect(addButton).toBeVisible({ timeout: 10000 });
    await addButton.click();

    const dialogTitle = page.locator('[data-testid="dialog-title"]');
    await expect(dialogTitle).toBeVisible({ timeout: 5000 });
    await expect(dialogTitle).toHaveText('Add New Position');

    // Type the in-universe symbol and click the autocomplete option
    // (Open Positions Add requires a real autocomplete pick to set selectedUniverseId)
    const symbolInput = page.locator(
      '[data-testid="symbol-autocomplete"] input'
    );
    await symbolInput.fill(universeInSymbol);

    const option = page.locator('mat-option', { hasText: universeInSymbol });
    await expect(option).toBeVisible({ timeout: 10000 });
    await option.click();

    await page.locator('[data-testid="quantity-input"]').fill('10');
    await page.locator('[data-testid="price-input"]').fill('123.45');
    const purchaseDateInput = page.locator(
      '[data-testid="purchase-date-input"]'
    );
    await purchaseDateInput.fill('1/15/2024');
    await purchaseDateInput.press('Tab');

    // Save button must be enabled and no invalid-symbol error
    await expect(
      page.locator('[data-testid="add-position-button"]')
    ).toBeEnabled({ timeout: 5000 });
    await expect(
      page.locator('[data-testid="symbol-invalid-error"]')
    ).not.toBeVisible();
  });

  test('AC4 — Open Positions Add: NOT-in-universe symbol keeps save button disabled and shows invalid error (no regression)', async ({
    page,
  }) => {
    await page.goto(`/account/${accountId}/open`);

    const addButton = page.locator('[data-testid="add-new-position-button"]');
    await expect(addButton).toBeVisible({ timeout: 10000 });
    await addButton.click();

    const dialogTitle = page.locator('[data-testid="dialog-title"]');
    await expect(dialogTitle).toBeVisible({ timeout: 5000 });

    // Type the out-of-universe symbol (will not match any universe entry)
    const symbolInput = page.locator(
      '[data-testid="symbol-autocomplete"] input'
    );
    await symbolInput.fill(universeOutSymbol);
    await symbolInput.press('Tab');

    // Save button must be disabled and invalid-symbol error must be visible
    await expect(
      page.locator('[data-testid="add-position-button"]')
    ).toBeDisabled({ timeout: 5000 });
    await expect(
      page.locator('[data-testid="symbol-invalid-error"]')
    ).toBeVisible({ timeout: 5000 });

    // Cancel dialog
    await page.keyboard.press('Escape');
  });
});
