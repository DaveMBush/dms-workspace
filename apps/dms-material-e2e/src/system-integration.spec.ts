import path from 'path';

import { expect, test } from 'playwright/test';

import { login } from './helpers/login.helper';

const TARGET_SYMBOLS = ['OXLC', 'NHS', 'DHY', 'CIK', 'DMB'];

const FIXTURES_DIR = path.resolve(__dirname, '..', 'fixtures');

test.describe('System Integration — Epic 75', () => {
  let firstImportCount = 0;
  let secondImportCount = 0;

  test.beforeAll(async ({ request }) => {
    const response = await request.delete(
      'http://localhost:3000/api/test/reset'
    );
    if (!response.ok()) {
      throw new Error(
        `DB reset failed: ${response.status()} ${await response.text()}`
      );
    }

    // Ensure system test account exists (needed for Fidelity CSV import)
    const accountRes = await request.post(
      'http://localhost:3000/api/accounts/add',
      { data: { name: 'System E2E Test Account' } }
    );
    // Accept 200 (created) or 409 (already exists); throw on anything else
    if (!accountRes.ok() && accountRes.status() !== 409) {
      throw new Error(
        `Failed to create system test account: ${accountRes.status()}`
      );
    }
  });

  test('screener refresh populates the screener table', async ({ page }) => {
    await login(page);
    await page.goto('/global/screener');
    await page.waitForLoadState('networkidle');

    const button = page.locator('[data-testid="refresh-button"]');
    const overlay = page.locator('[data-testid="loading-overlay"]');

    await expect(button).toBeVisible();
    await button.click();

    // Overlay must appear quickly after click
    await expect(overlay).toBeVisible({ timeout: 10_000 });

    // Wait for CefConnect fetch to complete (live network — allow up to 2 min)
    await expect(overlay).toBeHidden({ timeout: 120_000 });

    // Assert at least one row is present in the screener table
    const rows = page.locator('.ag-row');
    await expect(rows.first()).toBeVisible({ timeout: 5_000 });
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('universe sync populates distributions_per_year for monthly payers', async ({
    page,
    request,
  }) => {
    await login(page);
    await page.goto('/global/universe');
    await page.waitForLoadState('networkidle');

    const button = page.locator('[data-testid="update-universe-button"]');
    const overlay = page.locator('[data-testid="loading-overlay"]');

    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
    await button.click();

    // Overlay must appear quickly after click
    await expect(overlay).toBeVisible({ timeout: 10_000 });

    // Wait for universe sync to complete — can take 60–90 s for a full universe
    await expect(overlay).toBeHidden({ timeout: 120_000 });

    // Assert at least one row is visible in the universe table
    const rows = page.locator('tr.mat-mdc-row');
    await expect(rows.first()).toBeVisible({ timeout: 5_000 });

    // Verify distributions_per_year via the API for known monthly payers
    const universeResponse = await request.get(
      'http://localhost:3000/api/universe'
    );
    expect(universeResponse.ok()).toBeTruthy();
    const universes = (await universeResponse.json()) as any[];

    const bySymbol = Object.fromEntries(universes.map((u) => [u.symbol, u]));
    for (const sym of TARGET_SYMBOLS) {
      expect(bySymbol[sym], `${sym} not found in universe`).toBeDefined();
      expect(
        bySymbol[sym].distributions_per_year,
        `${sym} distributions_per_year`
      ).toBe(12);
    }
  });

  test('imports system-fidelity-2025.csv without errors', async ({ page }) => {
    await login(page);
    await page.goto('/global/universe');
    await page.waitForLoadState('networkidle');

    const responsePromise = page.waitForResponse(
      (res) =>
        res.url().includes('/api/import/fidelity') &&
        res.request().method() === 'POST'
    );

    const importButton = page.locator(
      '[data-testid="import-transactions-button"]'
    );
    await expect(importButton).toBeVisible();
    await importButton.click();

    await expect(
      page.getByRole('heading', { name: 'Import Fidelity Transactions' })
    ).toBeVisible();

    const filePath = path.join(FIXTURES_DIR, 'system-fidelity-2025.csv');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);

    const uploadButton = page.locator('[data-testid="upload-button"]');
    await expect(uploadButton).toBeEnabled();
    await uploadButton.click();

    const response = await responsePromise;
    expect(response.status()).toBe(200);

    const body = (await response.json()) as {
      success: boolean;
      imported: number;
      errors: string[];
      warnings: string[];
    };
    expect(body.success).toBe(true);
    expect(body.errors).toHaveLength(0);
    expect(body.imported).toBeGreaterThan(0);

    const resultArea = page.locator('[data-testid="import-result"]');
    await expect(resultArea).toBeVisible({ timeout: 5_000 });
    await expect(resultArea).toContainText(String(body.imported));

    firstImportCount = body.imported;
  });

  test('imports system-fidelity-2026.csv without errors', async ({ page }) => {
    await login(page);
    await page.goto('/global/universe');
    await page.waitForLoadState('networkidle');

    const responsePromise = page.waitForResponse(
      (res) =>
        res.url().includes('/api/import/fidelity') &&
        res.request().method() === 'POST'
    );

    const importButton = page.locator(
      '[data-testid="import-transactions-button"]'
    );
    await expect(importButton).toBeVisible();
    await importButton.click();

    await expect(
      page.getByRole('heading', { name: 'Import Fidelity Transactions' })
    ).toBeVisible();

    const filePath = path.join(FIXTURES_DIR, 'system-fidelity-2026.csv');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);

    const uploadButton = page.locator('[data-testid="upload-button"]');
    await expect(uploadButton).toBeEnabled();
    await uploadButton.click();

    const response = await responsePromise;
    expect(response.status()).toBe(200);

    const body = (await response.json()) as {
      success: boolean;
      imported: number;
      errors: string[];
      warnings: string[];
    };
    expect(body.success).toBe(true);
    expect(body.errors).toHaveLength(0);
    expect(body.imported).toBeGreaterThan(0);

    const resultArea = page.locator('[data-testid="import-result"]');
    await expect(resultArea).toBeVisible({ timeout: 5_000 });
    await expect(resultArea).toContainText(String(body.imported));

    secondImportCount = body.imported;
  });

  test('both CSV imports persisted rows — trade count check', () => {
    expect(firstImportCount).toBeGreaterThanOrEqual(1);
    expect(secondImportCount).toBeGreaterThanOrEqual(1);
    expect(firstImportCount + secondImportCount).toBeGreaterThanOrEqual(2);
  });
});
