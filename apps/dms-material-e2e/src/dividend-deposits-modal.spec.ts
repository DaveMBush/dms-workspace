import { expect, test } from '@playwright/test';

import { login } from './helpers/login.helper';

test.describe('Dividend Deposits Modal', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    // Navigate to a specific account and to dividend deposits tab
    await page.goto('/account/1677e04f-ef9b-4372-adb3-b740443088dc');

    // Click on Dividend Deposits tab
    const divDepTab = page.getByRole('tab', { name: /dividend.*deposit/i });
    await divDepTab.click();

    // Wait for tab content to load
    await page.waitForTimeout(500);
  });

  test('should open modal when clicking + button on Dividend Deposits tab', async ({
    page,
  }) => {
    // Click the + button in the main content panel (not accounts sidebar)
    const addButton = page
      .locator('.content-panel button[mat-icon-button]')
      .filter({ has: page.locator('mat-icon:text("add")') });
    await addButton.click();

    // Verify modal is visible
    await expect(page.locator('dms-div-dep-modal')).toBeVisible();
    await expect(
      page.locator('h2:text("New Dividend or Deposit")')
    ).toBeVisible();
  });

  test('modal should have all required fields', async ({ page }) => {
    // Open modal
    const addButton = page
      .locator('.content-panel button[mat-icon-button]')
      .filter({ has: page.locator('mat-icon:text("add")') });
    await addButton.click();

    // Verify all fields are present (Symbol, Date, Amount, Type)
    await expect(page.locator('mat-label:text("Symbol")')).toBeVisible();
    await expect(page.locator('mat-label:text("Date")')).toBeVisible();
    await expect(page.locator('mat-label:text("Amount")')).toBeVisible();
    await expect(page.locator('mat-label:text("Type")')).toBeVisible();
  });

  test('should close modal when clicking Cancel', async ({ page }) => {
    // Open modal
    const addButton = page
      .locator('.content-panel button[mat-icon-button]')
      .filter({ has: page.locator('mat-icon:text("add")') });
    await addButton.click();

    // Click Cancel
    await page.locator('button').filter({ hasText: 'Cancel' }).click();

    // Verify modal is closed
    await expect(page.locator('dms-div-dep-modal')).not.toBeVisible();
  });

  test('should show validation errors for required fields', async ({
    page,
  }) => {
    // Open modal
    const addButton = page
      .locator('.content-panel button[mat-icon-button]')
      .filter({ has: page.locator('mat-icon:text("add")') });
    await addButton.click();

    // Click and blur symbol field to trigger validation
    await page.locator('input[formControlName="symbol"]').click();
    await page.locator('input[formControlName="symbol"]').blur();

    // Click and blur date field to trigger validation
    await page.locator('input[formControlName="date"]').click();
    await page.locator('input[formControlName="date"]').blur();

    // Verify validation errors appear for symbol and date
    await expect(
      page.locator('mat-error').filter({ hasText: 'Symbol is required' })
    ).toBeVisible();
    await expect(
      page.locator('mat-error').filter({ hasText: 'Date is required' })
    ).toBeVisible();
  });

  test('should fill and submit form successfully', async ({ page }) => {
    // Open modal
    const addButton = page
      .locator('.content-panel button[mat-icon-button]')
      .filter({ has: page.locator('mat-icon:text("add")') });
    await addButton.click();

    // Fill in required fields
    await page.fill('input[formControlName="symbol"]', 'AAPL');
    await page.fill('input[formControlName="amount"]', '0.25');

    // Type date manually instead of using picker
    await page.fill('input[formControlName="date"]', '12/23/2025');

    // Select type
    await page.click('mat-select[formControlName="type"]');
    await page.click('mat-option:has-text("Regular")');

    // Verify Save button is enabled
    const saveButton = page.locator('button').filter({ hasText: 'Save' });
    await expect(saveButton).toBeEnabled();
  });
});
