/**
 * E2E Tests: CEF Symbol Added is Flagged Expired (Story 89.3)
 *
 * Verifies that a known Closed-End Fund (CEF) added manually via the "Add Symbol" UI
 * is persisted with expired: true and is_closed_end_fund: true in the universe API
 * response — ensuring the add path correctly flags CEF symbols as expired.
 */
import { expect, Page, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { initializePrismaClient } from './helpers/shared-prisma-client.helper';
import { createRiskGroups } from './helpers/shared-risk-groups.helper';

const CEF_SYMBOL = 'PDI';

async function cleanupTestData(): Promise<void> {
  const prisma = await initializePrismaClient();
  try {
    const existing = await prisma.universe.findFirst({
      where: { symbol: CEF_SYMBOL },
    });
    if (existing) {
      await prisma.trades.deleteMany({ where: { universeId: existing.id } });
      await prisma.universe.delete({ where: { id: existing.id } });
    }
  } finally {
    await prisma.$disconnect();
  }
}

async function seedTestData(): Promise<void> {
  const prisma = await initializePrismaClient();
  try {
    await createRiskGroups(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

async function navigateToUniverse(page: Page): Promise<void> {
  await page.goto('/global/universe');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('dms-base-table')).toBeVisible({ timeout: 15000 });
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

test.describe.configure({ mode: 'serial' });

test.describe('CEF Symbol Added is Flagged Expired', () => {
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

  test('should return expired:true and is_closed_end_fund:true when a CEF is added via + button', async ({
    page,
  }) => {
    await navigateToUniverse(page);

    // Open the add symbol dialog
    await page.locator('[data-testid="add-symbol-button"]').click();
    await expect(page.locator('[data-testid="add-symbol-dialog"]')).toBeVisible(
      { timeout: 5000 }
    );

    // Type CEF symbol and select from autocomplete
    await typeSymbolAndSelectAutocomplete(page, CEF_SYMBOL);
    await selectRiskGroupInDialog(page, 'Equities');

    // Register response listener BEFORE submit to avoid race condition
    const addResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/universe/add') &&
        response.status() === 200,
      { timeout: 30000 }
    );

    await page.locator('[data-testid="submit-button"]').click();
    await expect(
      page.locator('[data-testid="add-symbol-dialog"]')
    ).not.toBeVisible({ timeout: 30000 });

    // Assert the add-symbol API response contains expired: true and is_closed_end_fund: true
    const addResponse = await addResponsePromise;
    const body = (await addResponse.json()) as Record<string, unknown>;

    expect(body['expired']).toBe(true);
    expect(body['is_closed_end_fund']).toBe(true);
  });
});
