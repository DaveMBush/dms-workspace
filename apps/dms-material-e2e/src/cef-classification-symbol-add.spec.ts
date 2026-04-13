/**
 * E2E Tests: CEF Classification on Symbol Add (Story 66.4)
 *
 * Verifies that a known Closed-End Fund (CEF) is classified into the correct
 * Risk Group ("Income") regardless of the Risk Group the user selects in the
 * Add Symbol dialog, via both the + button flow and the CSV import flow.
 * Also verifies that a plain equity (AAPL) retains the "Equities" Risk Group.
 */
import path from 'path';
import { expect, Page, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { initializePrismaClient } from './helpers/shared-prisma-client.helper';
import { createRiskGroups } from './helpers/shared-risk-groups.helper';

const FIXTURES_DIR = path.resolve(__dirname, '..', 'fixtures');
const CEF_SYMBOL_BUTTON = 'OXLC';
const CEF_SYMBOL_CSV = 'ECC';
const EQUITY_SYMBOL = 'AAPL';
const TEST_SYMBOLS = [CEF_SYMBOL_BUTTON, CEF_SYMBOL_CSV, EQUITY_SYMBOL];
const CEF_IMPORT_ACCOUNT = 'CEF Import Test Account';

async function navigateToUniverse(page: Page): Promise<void> {
  await page.goto('/global/universe');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('dms-base-table')).toBeVisible({ timeout: 15000 });
}

async function cleanupTestData(): Promise<void> {
  const prisma = await initializePrismaClient();
  try {
    for (const symbol of TEST_SYMBOLS) {
      const existing = await prisma.universe.findFirst({
        where: { symbol },
      });
      if (existing) {
        await prisma.trades.deleteMany({ where: { universeId: existing.id } });
        await prisma.universe.delete({ where: { id: existing.id } });
      }
    }
    await prisma.accounts.deleteMany({ where: { name: CEF_IMPORT_ACCOUNT } });
  } finally {
    await prisma.$disconnect();
  }
}

async function seedTestData(): Promise<void> {
  const prisma = await initializePrismaClient();
  try {
    await createRiskGroups(prisma);
    const existing = await prisma.accounts.findFirst({
      where: { name: CEF_IMPORT_ACCOUNT },
    });
    if (!existing) {
      await prisma.accounts.create({ data: { name: CEF_IMPORT_ACCOUNT } });
    }
  } finally {
    await prisma.$disconnect();
  }
}

async function typeSymbolAndSelectAutocomplete(
  page: Page,
  symbol: string
): Promise<void> {
  await page.route('**/api/symbol/search**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ symbol, name: `${symbol} Corp` }]),
    });
  });
  const input = page.locator('[data-testid="symbol-input"]');
  await input.fill(symbol);
  await page.waitForTimeout(600);
  const firstOption = page
    .locator('.mat-option:visible, .mat-mdc-option:visible')
    .filter({ hasText: symbol })
    .first();
  await firstOption.waitFor({ state: 'visible', timeout: 10000 });
  await firstOption.click();
  await expect(input).toHaveValue(symbol);
}

async function selectRiskGroupInDialog(
  page: Page,
  groupName: string
): Promise<void> {
  await page.locator('mat-select[formcontrolname="riskGroupId"]').click();
  await page.waitForTimeout(300);
  const option = page
    .locator(
      '.cdk-overlay-container .mat-option, .cdk-overlay-container .mat-mdc-option'
    )
    .filter({ hasText: groupName })
    .first();
  await option.waitFor({ state: 'visible', timeout: 5000 });
  await option.click();
}

async function addSymbolViaButton(page: Page, symbol: string): Promise<void> {
  await page.locator('[data-testid="add-symbol-button"]').click();
  await expect(page.locator('[data-testid="add-symbol-dialog"]')).toBeVisible({
    timeout: 5000,
  });
  await typeSymbolAndSelectAutocomplete(page, symbol);
  await selectRiskGroupInDialog(page, 'Equities');
  // Register response listener BEFORE submit to avoid race condition
  const addResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/api/universe/add') && response.status() === 200,
    { timeout: 30000 }
  );
  await page.locator('[data-testid="submit-button"]').click();
  await expect(
    page.locator('[data-testid="add-symbol-dialog"]')
  ).not.toBeVisible({ timeout: 30000 });
  // Ensure add is fully committed (including CEF classification) before navigating
  await addResponsePromise;
  // Re-navigate so we see the server-persisted risk group
  await navigateToUniverse(page);
}

async function importCsvFile(page: Page, filename: string): Promise<void> {
  await page.locator('[data-testid="import-transactions-button"]').click();
  await expect(
    page.getByRole('heading', { name: 'Import Fidelity Transactions' })
  ).toBeVisible({ timeout: 5000 });
  await page
    .locator('input[type="file"]')
    .setInputFiles(path.join(FIXTURES_DIR, filename));
  const uploadButton = page.locator('[data-testid="upload-button"]');
  await expect(uploadButton).toBeEnabled({ timeout: 5000 });
  // Register response listener BEFORE upload click to avoid race condition
  const importResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/api/import/fidelity') &&
      response.status() === 200,
    { timeout: 30000 }
  );
  await uploadButton.click();
  await expect(
    page.getByRole('heading', { name: 'Import Fidelity Transactions' })
  ).not.toBeVisible({ timeout: 30000 });
  // Ensure import is fully committed before navigating
  await importResponsePromise;
  // Re-navigate so we see the server-persisted risk group
  await navigateToUniverse(page);
}

async function getRiskGroupForSymbol(
  page: Page,
  symbol: string
): Promise<string> {
  const row = page.locator('tr.mat-mdc-row').filter({ hasText: symbol });
  await expect(row).toBeVisible({ timeout: 15000 });
  return (await row.locator('td:nth-child(2)').textContent()) ?? '';
}

test.describe.configure({ mode: 'serial' });

test.describe('CEF Classification on Symbol Add', () => {
  test.beforeAll(async () => {
    await cleanupTestData();
    await seedTestData();
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should classify OXLC as Income Risk Group when added via + button', async ({
    page,
  }) => {
    await navigateToUniverse(page);
    await addSymbolViaButton(page, CEF_SYMBOL_BUTTON);
    const riskGroup = await getRiskGroupForSymbol(page, CEF_SYMBOL_BUTTON);
    expect(riskGroup.trim()).toContain('Income');
  });

  test('should classify ECC as Income Risk Group when added via CSV import', async ({
    page,
  }) => {
    await navigateToUniverse(page);
    await importCsvFile(page, 'fidelity-cef-ecc.csv');
    const riskGroup = await getRiskGroupForSymbol(page, CEF_SYMBOL_CSV);
    expect(riskGroup.trim()).toContain('Income');
  });

  test('should keep Equities Risk Group for non-CEF AAPL when added via + button', async ({
    page,
  }) => {
    await navigateToUniverse(page);
    await addSymbolViaButton(page, EQUITY_SYMBOL);
    const riskGroup = await getRiskGroupForSymbol(page, EQUITY_SYMBOL);
    expect(riskGroup.trim()).toContain('Equities');
  });
});
