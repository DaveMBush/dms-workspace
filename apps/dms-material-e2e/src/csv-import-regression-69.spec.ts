import path from 'path';
import { expect, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedImportData } from './helpers/seed-import-data.helper';

const FIXTURES_DIR = path.resolve(__dirname, '..', 'fixtures');

/**
 * CSV Import Regression Tests — Epic 69
 *
 * Story 69.1: Failing E2E test reproducing the 400 error on CSV import.
 * The server returns 400 Bad Request when uploading a valid Fidelity CSV
 * due to a regression introduced in Epics 63–66.
 */
test.describe('CSV Import Regression (Epic 69)', () => {
  let cleanupFn: (() => Promise<void>) | null = null;
  let testAccountId: string | null = null;

  test.beforeAll(async ({ request }) => {
    const accountResponse = await request.post('/api/accounts/add', {
      data: { name: 'Regression 69 Test Account' },
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

    const seedResult = await seedImportData('REGT');
    cleanupFn = seedResult.cleanup;
  });

  test.afterAll(async ({ request }) => {
    try {
      if (cleanupFn) {
        await cleanupFn();
      }
    } finally {
      if (testAccountId) {
        await request.delete(`/api/accounts/${testAccountId}`);
      }
    }
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/global/universe');
    await page.waitForLoadState('networkidle');
  });

  test('should import regression-69 CSV without 400 error', async ({
    page,
  }) => {
    const responsePromise = page.waitForResponse((response) => {
      return (
        response.url().includes('/api/import/fidelity') &&
        response.request().method() === 'POST'
      );
    });

    // Open import dialog
    const importButton = page.locator(
      '[data-testid="import-transactions-button"]'
    );
    await expect(importButton).toBeVisible({ timeout: 10000 });
    await importButton.click();
    await expect(
      page.getByRole('heading', { name: 'Import Fidelity Transactions' })
    ).toBeVisible({ timeout: 5000 });

    // Upload fixture CSV
    const filePath = path.join(FIXTURES_DIR, 'fidelity-regression-69.csv');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);

    // Click upload
    const uploadButton = page.locator('[data-testid="upload-button"]');
    await expect(uploadButton).toBeEnabled({ timeout: 5000 });
    await uploadButton.click();

    const response = await responsePromise;
    expect(response.status()).toBe(200);
    const responseBody = (await response.json()) as {
      success: boolean;
      imported: number;
      errors: string[];
    };

    expect(responseBody.success).toBe(true);
    expect(responseBody.imported).toBeGreaterThan(0);
  });
});
