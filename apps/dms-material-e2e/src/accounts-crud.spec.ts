import { test, expect, Page } from 'playwright/test';

import { login } from './helpers/login.helper';

/**
 * Wait for accounts to load with better error handling
 */
async function waitForAccounts(page: Page): Promise<void> {
  // Give Angular time to bootstrap
  await page.waitForTimeout(2000);

  // Wait for accounts panel to be visible
  await page.waitForSelector('[data-testid="accounts-panel"]', {
    timeout: 10000,
  });

  // Wait for accounts to load - may take time for API call
  await page
    .waitForSelector('[data-testid="account-item"]', { timeout: 30000 })
    .catch(async () => {
      // If no accounts found, wait for empty state
      await page
        .waitForSelector('text=No accounts found', { timeout: 5000 })
        .catch(() => null);
    });
}

test.describe('Account CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await waitForAccounts(page);
  });

  test.describe('Account List', () => {
    test('should display accounts panel', async ({ page }) => {
      const accountsPanel = page.locator('[data-testid="accounts-panel"]');
      await expect(accountsPanel).toBeVisible();
    });

    test('should display account list items', async ({ page }) => {
      const accountItems = page.locator('[data-testid="account-item"]');
      await expect(accountItems.first()).toBeVisible();
    });

    test('should have add account button', async ({ page }) => {
      const addButton = page.locator('[data-testid="add-account-button"]');
      await expect(addButton).toBeVisible();
    });

    test('should navigate to account on click', async ({ page }) => {
      const firstAccount = page.locator('[data-testid="account-item"]').first();
      const accountName = await firstAccount
        .locator('[data-testid="account-name"]')
        .textContent();

      await firstAccount.click();

      await expect(page).toHaveURL(/\/account\/.+/);
      // Verify we're on the account page (URL changed)
      expect(accountName).toBeTruthy();
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
      // Click edit button on first account
      const accountItem = page.locator('[data-testid="account-item"]').first();
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
      const accountItem = page.locator('[data-testid="account-item"]').first();
      const originalName = await accountItem
        .locator('[data-testid="account-name"]')
        .textContent();

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

      // Verify name unchanged
      const stillOriginalAccount = page
        .locator('[data-testid="account-item"]')
        .filter({ hasText: originalName || '' });
      await expect(stillOriginalAccount).toBeVisible();
    });

    test('should not save empty account name on edit', async ({ page }) => {
      const accountItem = page.locator('[data-testid="account-item"]').first();
      const originalName = await accountItem
        .locator('[data-testid="account-name"]')
        .textContent();

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
      const unchangedAccount = page
        .locator('[data-testid="account-item"]')
        .filter({ hasText: originalName || '' });
      await expect(unchangedAccount).toBeVisible();
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
      // Navigate to first account
      const firstAccount = page.locator('[data-testid="account-item"]').first();
      await firstAccount.click();

      await expect(page).toHaveURL(/\/account\/.+/);

      // Get account name before deletion
      const accountName = await page
        .locator('[data-testid="accounts-panel"]')
        .locator('[data-testid="account-item"]')
        .first()
        .locator('[data-testid="account-name"]')
        .textContent();

      // Delete the account from side panel
      const deleteButton = page
        .locator('[data-testid="accounts-panel"]')
        .locator('[data-testid="account-item"]')
        .first()
        .locator('[data-testid="delete-account-button"]');
      await deleteButton.click();

      // Verify account is removed from list
      const deletedAccount = page
        .locator('[data-testid="account-item"]')
        .filter({ hasText: accountName || '' });
      await expect(deletedAccount).not.toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Data Persistence', () => {
    test('should persist new account across page reload', async ({ page }) => {
      // Add account
      const addButton = page.locator('[data-testid="add-account-button"]');
      await addButton.click();

      const input = page.locator('[data-testid="node-editor-input"]');
      const accountName = 'Persist Test ' + Date.now();
      await input.fill(accountName);

      await input.press('Enter');

      // Wait for account to appear
      const newAccount = page
        .locator('[data-testid="account-item"]')
        .filter({ hasText: accountName });
      await expect(newAccount).toBeVisible({ timeout: 10000 });

      // Reload page
      await page.reload();
      await waitForAccounts(page);

      // Verify account still exists
      const persistedAccount = page
        .locator('[data-testid="account-item"]')
        .filter({ hasText: accountName });
      await expect(persistedAccount).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Cross-Component Integration', () => {
    test('should maintain account selection across navigation', async ({
      page,
    }) => {
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
