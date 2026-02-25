import path from 'path';
import { expect, Page, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedImportData } from './helpers/seed-import-data.helper';

const FIXTURES_DIR = path.resolve(__dirname, '..', 'fixtures');

/**
 * Navigate to the global universe page and wait for it to load
 */
async function navigateToUniverse(page: Page): Promise<void> {
  await page.goto('/global/universe');
  await page.waitForLoadState('networkidle');
}

/**
 * Open the import dialog by clicking the import button
 */
async function openImportDialog(page: Page): Promise<void> {
  const importButton = page.locator(
    '[data-testid="import-transactions-button"]'
  );
  await expect(importButton).toBeVisible({ timeout: 10000 });
  await importButton.click();
  await expect(
    page.getByRole('heading', { name: 'Import Fidelity Transactions' })
  ).toBeVisible({ timeout: 5000 });
}

/**
 * Upload a file through the import dialog
 */
async function uploadFile(page: Page, filename: string): Promise<void> {
  const filePath = path.join(FIXTURES_DIR, filename);
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(filePath);
}

/**
 * Click the upload button and wait for the response
 */
async function clickUpload(page: Page): Promise<void> {
  const uploadButton = page.locator('[data-testid="upload-button"]');
  await expect(uploadButton).toBeEnabled({ timeout: 5000 });
  await uploadButton.click();
}

/**
 * Wait for the import result area to appear
 */
async function waitForImportResult(page: Page): Promise<void> {
  await expect(page.locator('[data-testid="import-result"]')).toBeVisible({
    timeout: 30000,
  });
}

let cleanupFn: (() => Promise<void>) | null = null;
let testAccountId: string | null = null;

test.describe('Fidelity Import E2E', () => {
  test.beforeAll(async ({ request }) => {
    // Create account via API (proven pattern from dividend-deposits-modal)
    const accountResponse = await request.post('/api/accounts/add', {
      data: { name: 'Import Test Account' },
    });
    if (!accountResponse.ok()) {
      throw new Error(
        `Failed to create test account: ${accountResponse.status()}`
      );
    }
    const accounts = (await accountResponse.json()) as Array<{ id: string }>;
    if (!accounts[0]?.id) {
      throw new Error('Created account has no id');
    }
    testAccountId = accounts[0].id;

    // Seed universe entry and risk groups via direct DB
    const seedResult = await seedImportData();
    cleanupFn = seedResult.cleanup;
  });

  test.afterAll(async ({ request }) => {
    if (cleanupFn) {
      await cleanupFn();
    }
    if (testAccountId) {
      await request.delete(`/api/accounts/${testAccountId}`);
    }
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToUniverse(page);
  });

  test.describe('Import Dialog', () => {
    test('should open import dialog when import button is clicked', async ({
      page,
    }) => {
      await openImportDialog(page);

      await expect(
        page.getByRole('heading', { name: 'Import Fidelity Transactions' })
      ).toBeVisible();
      await expect(
        page.getByText('Select a CSV file to import Fidelity transactions.')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="upload-button"]')
      ).toBeDisabled();
      await expect(page.locator('[data-testid="cancel-button"]')).toBeVisible();
    });

    test('should close dialog when cancel button is clicked', async ({
      page,
    }) => {
      await openImportDialog(page);
      await page.locator('[data-testid="cancel-button"]').click();
      await expect(
        page.getByRole('heading', { name: 'Import Fidelity Transactions' })
      ).not.toBeVisible({ timeout: 5000 });
    });

    test('should enable upload button when CSV file is selected', async ({
      page,
    }) => {
      await openImportDialog(page);
      await uploadFile(page, 'fidelity-valid.csv');
      await expect(page.locator('[data-testid="upload-button"]')).toBeEnabled({
        timeout: 5000,
      });
    });
  });

  test.describe('Successful Import', () => {
    test('should import valid CSV and show success message', async ({
      page,
    }) => {
      const responsePromise = page.waitForResponse(function matchImportApi(
        response
      ) {
        return response.url().includes('/api/import/fidelity');
      });

      await openImportDialog(page);
      await uploadFile(page, 'fidelity-valid.csv');
      await clickUpload(page);

      const response = await responsePromise;
      const responseBody = (await response.json()) as {
        success: boolean;
        imported: number;
        errors: string[];
      };

      // On success, dialog closes and notification appears
      expect(responseBody.success).toBe(true);
      expect(responseBody.imported).toBeGreaterThan(0);

      await expect(
        page.getByRole('heading', {
          name: 'Import Fidelity Transactions',
        })
      ).not.toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('File Upload Errors', () => {
    test('should keep upload disabled for non-CSV files', async ({ page }) => {
      await openImportDialog(page);

      // Set a non-CSV file
      await uploadFile(page, 'fidelity-not-a-csv.txt');

      // Upload button should remain disabled because selectedFile is null
      await expect(
        page.locator('[data-testid="upload-button"]')
      ).toBeDisabled();
    });
  });

  test.describe('Account Not Found', () => {
    test('should show error for non-existent account', async ({ page }) => {
      const responsePromise = page.waitForResponse(function matchImportApi(
        response
      ) {
        return response.url().includes('/api/import/fidelity');
      });

      await openImportDialog(page);
      await uploadFile(page, 'fidelity-invalid-account.csv');
      await clickUpload(page);

      const response = await responsePromise;
      const responseBody = (await response.json()) as {
        success: boolean;
        errors: string[];
      };

      // Wait for error response
      await waitForImportResult(page);

      // Should show error about account not found
      await expect(page.locator('.error-message')).toBeVisible({
        timeout: 10000,
      });

      // Verify error message content from actual API response
      expect(responseBody.success).toBe(false);
      expect(responseBody.errors.length).toBeGreaterThan(0);
      expect(
        responseBody.errors.some(function hasNotFound(e) {
          return e.toLowerCase().includes('not found');
        })
      ).toBe(true);

      // Dialog should stay open
      await expect(
        page.getByRole('heading', { name: 'Import Fidelity Transactions' })
      ).toBeVisible();
    });
  });

  test.describe('Validation Errors', () => {
    test('should show error for CSV with invalid data', async ({ page }) => {
      await openImportDialog(page);
      await uploadFile(page, 'fidelity-invalid-quantity.csv');
      await clickUpload(page);

      // Wait for error response
      await waitForImportResult(page);

      // Should show validation error
      await expect(page.locator('.error-message')).toBeVisible({
        timeout: 10000,
      });

      // Dialog should stay open
      await expect(
        page.getByRole('heading', { name: 'Import Fidelity Transactions' })
      ).toBeVisible();
    });
  });

  test.describe('Duplicate Transactions', () => {
    test('should handle duplicate import gracefully', async ({ page }) => {
      // First import
      const firstResponsePromise = page.waitForResponse(function matchFirst(
        response
      ) {
        return response.url().includes('/api/import/fidelity');
      });
      await openImportDialog(page);
      await uploadFile(page, 'fidelity-duplicates.csv');
      await clickUpload(page);

      const firstResponse = await firstResponsePromise;
      const firstBody = (await firstResponse.json()) as {
        success: boolean;
        imported: number;
        errors: string[];
      };

      // First import must succeed
      expect(firstBody.success).toBe(true);
      expect(firstBody.imported).toBeGreaterThan(0);
      await expect(
        page.getByRole('heading', {
          name: 'Import Fidelity Transactions',
        })
      ).not.toBeVisible({ timeout: 30000 });

      // Second import of same data
      const secondResponsePromise = page.waitForResponse(function matchSecond(
        response
      ) {
        return response.url().includes('/api/import/fidelity');
      });
      await openImportDialog(page);
      await uploadFile(page, 'fidelity-duplicates.csv');
      await clickUpload(page);

      const secondResponse = await secondResponsePromise;
      const secondBody = (await secondResponse.json()) as {
        success: boolean;
        imported: number;
      };

      // Duplicate detection: the import service handles duplicate records
      // Second import should succeed with same count (idempotent)
      expect(secondBody.success).toBe(true);
      expect(secondBody.imported).toBeLessThanOrEqual(firstBody.imported);
    });
  });

  test.describe('Partial Success', () => {
    test('should report errors for invalid rows while importing valid ones', async ({
      page,
    }) => {
      const responsePromise = page.waitForResponse(function matchImportApi(
        response
      ) {
        return response.url().includes('/api/import/fidelity');
      });

      await openImportDialog(page);
      await uploadFile(page, 'fidelity-mixed.csv');
      await clickUpload(page);

      const response = await responsePromise;
      const responseBody = (await response.json()) as {
        success: boolean;
        imported: number;
        errors: string[];
      };

      // The mixed file has a valid purchase and a sale with no matching open
      // trade (quantity 99). Must have both successes and failures.
      expect(responseBody.imported).toBeGreaterThan(0);
      expect(responseBody.errors.length).toBeGreaterThan(0);

      await waitForImportResult(page);
      await expect(page.locator('.error-message')).toBeVisible({
        timeout: 10000,
      });
    });
  });
});
