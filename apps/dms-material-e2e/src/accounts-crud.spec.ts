import { test, expect, Page } from 'playwright/test';

import { login } from './helpers/login.helper';

/**
 * Wait for accounts to load or empty state to appear
 */
async function waitForAccountsPanel(page: Page): Promise<void> {
  // Wait for accounts panel to be visible
  await expect(page.locator('[data-testid="accounts-panel"]')).toBeVisible({
    timeout: 15000,
  });

  // Wait for either accounts to load OR the panel to be stable (networkidle)
  await page.waitForLoadState('networkidle', { timeout: 30000 });

  // Ensure the panel has fully loaded its content
  // Wait for either account items OR add button to be present
  await Promise.race([
    page
      .locator('[data-testid="account-item"]')
      .first()
      .waitFor({ state: 'visible', timeout: 10000 })
      .catch(() => {}),
    page
      .locator('[data-testid="add-account-button"]')
      .waitFor({ state: 'visible', timeout: 10000 }),
  ]);
}

/**
 * Create a test account and return its name
 */
async function createTestAccount(
  page: Page,
  nameSuffix: string
): Promise<string> {
  const addButton = page.locator('[data-testid="add-account-button"]');
  await addButton.click();

  const input = page.locator('[data-testid="node-editor-input"]');
  const accountName = `Test Account ${nameSuffix} ${Date.now()}`;
  await input.fill(accountName);
  await input.press('Enter');

  // Wait for account to appear in list
  const newAccount = page
    .locator('[data-testid="account-item"]')
    .filter({ hasText: accountName });
  await expect(newAccount).toBeVisible({ timeout: 10000 });

  return accountName;
}

test.describe('Account CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await waitForAccountsPanel(page);
  });

  test.describe('Account List', () => {
    test('should display accounts panel', async ({ page }) => {
      const accountsPanel = page.locator('[data-testid="accounts-panel"]');
      await expect(accountsPanel).toBeVisible();
    });

    test('should display account list items or handle empty state', async ({
      page,
    }) => {
      // Create a test account first to ensure we have at least one
      await createTestAccount(page, 'List');

      const accountItems = page.locator('[data-testid="account-item"]');
      await expect(accountItems.first()).toBeVisible();
    });

    test('should have add account button', async ({ page }) => {
      const addButton = page.locator('[data-testid="add-account-button"]');
      await expect(addButton).toBeVisible();
    });

    test('should navigate to account on click', async ({ page }) => {
      // Create a test account first
      const accountName = await createTestAccount(page, 'Nav');

      // Find and click the account
      const testAccount = page
        .locator('[data-testid="account-item"]')
        .filter({ hasText: accountName });
      await testAccount.click();

      await expect(page).toHaveURL(/\/account\/.+/);
    });
  });

  test.describe('Add Account', () => {
    test('should add new account successfully', async ({ page }) => {
      const addButton = page.locator('[data-testid="add-account-button"]');
      await addButton.click();

      // Wait for node-editor to appear
      await page.waitForSelector('[data-testid="node-editor-input"]', {
        timeout: 5000,
      });

      // Type account name
      const input = page.locator('[data-testid="node-editor-input"]');
      const accountName = 'Test Account ' + Date.now();
      await input.fill(accountName);

      // Press Enter to save
      await input.press('Enter');

      // Verify account appears in list
      const newAccount = page
        .locator('[data-testid="account-item"]')
        .filter({ hasText: accountName });
      await expect(newAccount).toBeVisible({ timeout: 10000 });
    });

    test('should cancel add account', async ({ page }) => {
      const addButton = page.locator('[data-testid="add-account-button"]');
      await addButton.click();

      const input = page.locator('[data-testid="node-editor-input"]');
      await input.fill('Cancelled Account');

      // Press Escape to cancel
      await input.press('Escape');

      // Wait for editor to be hidden
      await expect(input).not.toBeVisible({ timeout: 5000 });
    });

    test('should not save empty account name', async ({ page }) => {
      const addButton = page.locator('[data-testid="add-account-button"]');
      await addButton.click();

      const input = page.locator('[data-testid="node-editor-input"]');
      await input.fill('');

      // Try to save with Enter
      await input.press('Enter');

      // Input should still be visible (validation failed)
      await expect(input).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Edit Account', () => {
    test('should edit account name successfully', async ({ page }) => {
      // Create a test account first
      const originalName = await createTestAccount(page, 'Edit');

      // Click edit button on the created account
      const accountItem = page
        .locator('[data-testid="account-item"]')
        .filter({ hasText: originalName });
      const editButton = accountItem.locator(
        '[data-testid="edit-account-button"]'
      );
      await editButton.click();

      // Wait for editor to appear
      await page.waitForSelector('[data-testid="node-editor-input"]', {
        timeout: 5000,
      });

      // Change name
      const input = page.locator('[data-testid="node-editor-input"]');
      const newName = 'Updated Account ' + Date.now();
      await input.fill(newName);

      // Save with Enter
      await input.press('Enter');

      // Wait for editor to close
      await expect(input).not.toBeVisible({ timeout: 5000 });

      // Verify name updated
      const updatedAccount = page
        .locator('[data-testid="account-item"]')
        .filter({ hasText: newName });
      await expect(updatedAccount).toBeVisible({ timeout: 10000 });
    });

    test('should cancel edit account', async ({ page }) => {
      // Create a test account first
      const originalName = await createTestAccount(page, 'EditCancel');

      const accountItem = page
        .locator('[data-testid="account-item"]')
        .filter({ hasText: originalName });

      const editButton = accountItem.locator(
        '[data-testid="edit-account-button"]'
      );
      await editButton.click();

      const input = page.locator('[data-testid="node-editor-input"]');
      await input.fill('Changed Name');

      // Cancel with Escape
      await input.press('Escape');

      // Wait for editor to close
      await expect(input).not.toBeVisible({ timeout: 5000 });

      // Verify name unchanged by checking the same account item
      await expect(
        accountItem.locator('[data-testid="account-name"]')
      ).toHaveText(originalName);
    });

    test('should not save empty account name on edit', async ({ page }) => {
      // Create a test account first
      const originalName = await createTestAccount(page, 'EditEmpty');

      const accountItem = page
        .locator('[data-testid="account-item"]')
        .filter({ hasText: originalName });

      const editButton = accountItem.locator(
        '[data-testid="edit-account-button"]'
      );
      await editButton.click();

      const input = page.locator('[data-testid="node-editor-input"]');
      await input.fill('');

      // Try to save
      await input.press('Enter');

      // Input should still be visible (validation failed)
      await expect(input).toBeVisible({ timeout: 3000 });

      // Cancel to restore state
      await input.press('Escape');

      // Wait for editor to close
      await expect(input).not.toBeVisible({ timeout: 5000 });

      // Name should be unchanged
      await expect(
        accountItem.locator('[data-testid="account-name"]')
      ).toHaveText(originalName);
    });
  });

  test.describe('Delete Account', () => {
    test('should delete account', async ({ page }) => {
      // Add test account first
      const addButton = page.locator('[data-testid="add-account-button"]');
      await addButton.click();

      const input = page.locator('[data-testid="node-editor-input"]');
      const testAccountName = 'Delete Test ' + Date.now();
      await input.fill(testAccountName);

      await input.press('Enter');

      // Find the test account
      const testAccount = page
        .locator('[data-testid="account-item"]')
        .filter({ hasText: testAccountName });
      await expect(testAccount).toBeVisible({ timeout: 10000 });

      // Click delete button
      const deleteButton = testAccount.locator(
        '[data-testid="delete-account-button"]'
      );
      await deleteButton.click();

      // Verify account removed
      await expect(testAccount).not.toBeVisible({ timeout: 10000 });
    });

    test('should delete account from side panel while on account page', async ({
      page,
    }) => {
      // Create a test account first
      const accountName = await createTestAccount(page, 'DeleteFromPage');

      // Navigate to the created account
      const testAccount = page
        .locator('[data-testid="account-item"]')
        .filter({ hasText: accountName });
      await testAccount.click();

      await expect(page).toHaveURL(/\/account\/.+/);

      // Delete the account from side panel
      const deleteButton = page
        .locator('[data-testid="accounts-panel"]')
        .locator('[data-testid="account-item"]')
        .filter({ hasText: accountName })
        .locator('[data-testid="delete-account-button"]');
      await deleteButton.click();

      // Verify account is removed from list
      const deletedAccount = page
        .locator('[data-testid="account-item"]')
        .filter({ hasText: accountName });
      await expect(deletedAccount).not.toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Data Persistence', () => {
    test('should persist new account across page reload', async ({ page }) => {
      test.setTimeout(90000); // Increase timeout for CI

      // Add account
      const addButton = page.locator('[data-testid="add-account-button"]');
      await addButton.click();

      const input = page.locator('[data-testid="node-editor-input"]');
      const accountName = 'Persist Test ' + Date.now();
      await input.fill(accountName);

      // Wait for the account save API call to complete
      const saveResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes('/api/accounts/add') &&
          response.request().method() === 'POST',
        { timeout: 20000 }
      );

      await input.press('Enter');

      // Ensure the save API call completed and was successful
      const saveResponse = await saveResponsePromise;
      if (!saveResponse.ok()) {
        const responseBody = await saveResponse
          .text()
          .catch(() => 'Unable to read response');
        throw new Error(
          `Account save failed: ${saveResponse.status()} - ${responseBody}`
        );
      }

      // Wait for account to appear in UI
      const newAccount = page
        .locator('[data-testid="account-item"]')
        .filter({ hasText: accountName });
      await expect(newAccount).toBeVisible({ timeout: 15000 });

      // Wait for database write to fully commit
      // (especially important in CI with potential SQLite locking)
      await page.waitForTimeout(1000);

      // Reload page and wait for accounts to load
      await page.reload();
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      await waitForAccountsPanel(page);

      // Give extra time for accounts list to populate in CI
      await page.waitForTimeout(500);

      // Verify account still exists with increased timeout for CI
      const persistedAccount = page
        .locator('[data-testid="account-item"]')
        .filter({ hasText: accountName });
      await expect(persistedAccount).toBeVisible({ timeout: 20000 });
    });
  });

  test.describe('Cross-Component Integration', () => {
    test('should maintain account selection across navigation', async ({
      page,
    }) => {
      test.setTimeout(90000); // Increase timeout for CI

      // Ensure at least one account exists
      await createTestAccount(page, 'Navigation');

      // Wait for accounts to be visible before clicking
      await page
        .locator('[data-testid="account-item"]')
        .first()
        .waitFor({ state: 'visible', timeout: 20000 });

      const accountItem = page.locator('[data-testid="account-item"]').first();
      await accountItem.click();

      // Wait for navigation to account page
      await expect(page).toHaveURL(/\/account\/.+/);

      // Save the account URL
      const accountUrl = page.url();
      expect(accountUrl).toMatch(/\/account\/.+/);

      // Navigate to global universe
      await page.locator('a', { hasText: 'Universe' }).click();
      await expect(page).toHaveURL(/\/global\/universe/);

      // Navigate back
      await page.goBack();
      await page.waitForLoadState('networkidle');

      // Should be back on same account page
      expect(page.url()).toBe(accountUrl);
    });
  });
});
