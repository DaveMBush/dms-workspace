import { test, expect, Page } from 'playwright/test';

import { login } from './helpers/login.helper';

const BASE_API = 'http://localhost:3001/api/admin/cusip-cache';
const TEST_CUSIP = 'E2ETEST01';
const TEST_SYMBOL = 'E2ETEST';

async function seedTestMapping(page: Page): Promise<void> {
  const response = await page.request.post(`${BASE_API}/add`, {
    data: {
      cusip: TEST_CUSIP,
      symbol: TEST_SYMBOL,
      source: 'THIRTEENF',
      reason: 'E2E test seed',
    },
  });
  if (!response.ok()) {
    throw new Error(`Failed to seed test mapping: ${response.status()}`);
  }
}

async function cleanupTestMapping(page: Page): Promise<void> {
  const searchResponse = await page.request.get(
    `${BASE_API}/search?cusip=${TEST_CUSIP}`
  );
  if (!searchResponse.ok()) {
    throw new Error(
      `Failed to search test mapping: ${searchResponse.status()}`
    );
  }
  const searchData = (await searchResponse.json()) as {
    entries: Array<{ id: string }>;
  };
  for (const entry of searchData.entries) {
    const deleteResponse = await page.request.delete(`${BASE_API}/${entry.id}`);
    if (!deleteResponse.ok()) {
      throw new Error(
        `Failed to delete test mapping ${entry.id}: ${deleteResponse.status()}`
      );
    }
  }
}

test.describe('CUSIP Cache Admin UI', function describeCusipCache() {
  test.beforeEach(async function beforeEach({ page }) {
    await login(page);
    await cleanupTestMapping(page);
    await page.goto('/global/cusip-cache');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async function afterEach({ page }) {
    await cleanupTestMapping(page);
  });

  test.describe('Navigation & Dashboard Display', function describeNav() {
    test('should navigate to cusip cache page', async function shouldNavigate({
      page,
    }) {
      await expect(
        page.locator('[data-testid="cusip-cache-page"]')
      ).toBeVisible({ timeout: 10000 });
    });

    test('should display stats card', async function shouldDisplayStats({
      page,
    }) {
      await expect(page.locator('[data-testid="stats-card"]')).toBeVisible({
        timeout: 10000,
      });
    });

    test('should display total entries count', async function shouldShowTotal({
      page,
    }) {
      await expect(page.locator('[data-testid="total-entries"]')).toBeVisible();
    });

    test('should display search card', async function shouldDisplaySearch({
      page,
    }) {
      await expect(page.locator('[data-testid="search-card"]')).toBeVisible();
    });

    test('should display audit card', async function shouldDisplayAudit({
      page,
    }) {
      await expect(page.locator('[data-testid="audit-card"]')).toBeVisible();
    });

    test('should have refresh button', async function shouldHaveRefresh({
      page,
    }) {
      await expect(
        page.locator('[data-testid="refresh-button"]')
      ).toBeVisible();
    });

    test('should navigate from sidebar', async function shouldNavFromSidebar({
      page,
    }) {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      const navLink = page.locator('[data-testid="cusip-cache-nav"]');
      await navLink.click();

      await page.waitForURL('**/global/cusip-cache', { timeout: 10000 });
      await expect(
        page.locator('[data-testid="cusip-cache-page"]')
      ).toBeVisible();
    });
  });

  test.describe('Search Functionality', function describeSearch() {
    test.beforeEach(async function seedData({ page }) {
      await seedTestMapping(page);
      await page.reload();
      await page.waitForLoadState('networkidle');
    });

    test('should search by CUSIP and find results', async function shouldSearchCusip({
      page,
    }) {
      await page.locator('[data-testid="search-input"]').fill(TEST_CUSIP);
      await page.locator('[data-testid="search-button"]').click();

      await expect(
        page.locator('[data-testid="search-results-table"]')
      ).toBeVisible({ timeout: 10000 });

      const firstRow = page.locator(
        '[data-testid="search-results-table"] tr.mat-mdc-row'
      );
      await expect(firstRow.first()).toContainText(TEST_CUSIP);
    });

    test('should show no results for non-existent CUSIP', async function shouldShowNoResults({
      page,
    }) {
      await page.locator('[data-testid="search-input"]').fill('ZZZZZZ999');
      await page.locator('[data-testid="search-button"]').click();

      await expect(page.locator('[data-testid="no-results"]')).toBeVisible({
        timeout: 10000,
      });
    });

    test('should search by symbol', async function shouldSearchSymbol({
      page,
    }) {
      const typeSelect = page.locator('[data-testid="search-type-select"]');
      await typeSelect.click();
      await page.locator('mat-option:has-text("Symbol")').click();

      await page.locator('[data-testid="search-input"]').fill(TEST_SYMBOL);
      await page.locator('[data-testid="search-button"]').click();

      await expect(
        page.locator('[data-testid="search-results-table"]')
      ).toBeVisible({ timeout: 10000 });
    });

    test('should clear search results', async function shouldClearSearch({
      page,
    }) {
      await page.locator('[data-testid="search-input"]').fill(TEST_CUSIP);
      await page.locator('[data-testid="search-button"]').click();

      await expect(
        page.locator('[data-testid="search-results-table"]')
      ).toBeVisible({ timeout: 10000 });

      await page.locator('[data-testid="clear-search-button"]').click();

      await expect(
        page.locator('[data-testid="search-results-table"]')
      ).not.toBeVisible();
    });
  });

  test.describe('Add Mapping', function describeAdd() {
    test('should open add dialog', async function shouldOpenDialog({ page }) {
      await page.locator('[data-testid="add-mapping-button"]').click();

      await expect(
        page.locator('[data-testid="dialog-cusip-input"]')
      ).toBeVisible({ timeout: 5000 });
    });

    test('should add new mapping successfully', async function shouldAddMapping({
      page,
    }) {
      await page.locator('[data-testid="add-mapping-button"]').click();

      await page.locator('[data-testid="dialog-cusip-input"]').fill(TEST_CUSIP);
      await page
        .locator('[data-testid="dialog-symbol-input"]')
        .fill(TEST_SYMBOL);

      const sourceSelect = page.locator('[data-testid="dialog-source-select"]');
      await sourceSelect.click();
      await page.locator('mat-option:has-text("THIRTEENF")').click();

      await page
        .locator('[data-testid="dialog-reason-input"]')
        .fill('E2E test add');
      await page.locator('[data-testid="dialog-submit-button"]').click();

      // Verify dialog closes
      await expect(
        page.locator('[data-testid="dialog-cusip-input"]')
      ).not.toBeVisible({ timeout: 5000 });

      // Verify the entry was actually created by searching for it
      await page.locator('[data-testid="search-input"]').fill(TEST_CUSIP);
      await page.locator('[data-testid="search-button"]').click();

      await expect(
        page.locator('[data-testid="search-results-table"]')
      ).toBeVisible({ timeout: 10000 });

      const firstRow = page.locator(
        '[data-testid="search-results-table"] tr.mat-mdc-row'
      );
      await expect(firstRow.first()).toContainText(TEST_CUSIP);
    });

    test('should validate CUSIP format', async function shouldValidateCusip({
      page,
    }) {
      await page.locator('[data-testid="add-mapping-button"]').click();

      await page.locator('[data-testid="dialog-cusip-input"]').fill('BAD');
      await page.locator('[data-testid="dialog-symbol-input"]').fill('TEST');

      // Touch the field to trigger validation
      await page.locator('[data-testid="dialog-cusip-input"]').blur();

      const submitButton = page.locator('[data-testid="dialog-submit-button"]');
      await expect(submitButton).toBeDisabled();
    });

    test('should cancel add dialog', async function shouldCancelDialog({
      page,
    }) {
      await page.locator('[data-testid="add-mapping-button"]').click();

      await expect(
        page.locator('[data-testid="dialog-cusip-input"]')
      ).toBeVisible({ timeout: 5000 });

      await page.locator('[data-testid="dialog-cancel-button"]').click();

      await expect(
        page.locator('[data-testid="dialog-cusip-input"]')
      ).not.toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Edit Mapping', function describeEdit() {
    test.beforeEach(async function seedData({ page }) {
      await seedTestMapping(page);
      await page.reload();
      await page.waitForLoadState('networkidle');
    });

    test('should open edit dialog with pre-filled data', async function shouldOpenEdit({
      page,
    }) {
      // Search for the entry first
      await page.locator('[data-testid="search-input"]').fill(TEST_CUSIP);
      await page.locator('[data-testid="search-button"]').click();

      await expect(
        page.locator('[data-testid="search-results-table"]')
      ).toBeVisible({ timeout: 10000 });

      // Click edit on first result
      await page.locator('[data-testid="edit-button"]').first().click();

      await expect(
        page.locator('[data-testid="dialog-cusip-input"]')
      ).toBeVisible({ timeout: 5000 });

      // CUSIP should be pre-filled and disabled in edit mode
      await expect(
        page.locator('[data-testid="dialog-cusip-input"]')
      ).toBeDisabled();
    });
  });

  test.describe('Delete Mapping', function describeDelete() {
    test.beforeEach(async function seedData({ page }) {
      await seedTestMapping(page);
      await page.reload();
      await page.waitForLoadState('networkidle');
    });

    test('should show confirmation and delete entry', async function shouldConfirm({
      page,
    }) {
      await page.locator('[data-testid="search-input"]').fill(TEST_CUSIP);
      await page.locator('[data-testid="search-button"]').click();

      await expect(
        page.locator('[data-testid="search-results-table"]')
      ).toBeVisible({ timeout: 10000 });

      await page.locator('[data-testid="delete-button"]').first().click();

      // Confirm dialog should appear
      await expect(page.locator('mat-dialog-container')).toBeVisible({
        timeout: 5000,
      });

      // Click confirm/delete button in the confirmation dialog
      const confirmButton = page.locator(
        'mat-dialog-container button:has-text("Delete")'
      );
      await confirmButton.click();

      // Verify the entry is removed by searching again
      await page.waitForTimeout(500);
      await page.locator('[data-testid="search-input"]').fill(TEST_CUSIP);
      await page.locator('[data-testid="search-button"]').click();

      await expect(page.locator('[data-testid="no-results"]')).toBeVisible({
        timeout: 10000,
      });
    });
  });

  test.describe('Refresh', function describeRefresh() {
    test('should refresh data on button click', async function shouldRefresh({
      page,
    }) {
      await expect(page.locator('[data-testid="stats-card"]')).toBeVisible({
        timeout: 10000,
      });

      // Click refresh
      await page.locator('[data-testid="refresh-button"]').click();

      // Stats should still be visible after refresh
      await expect(page.locator('[data-testid="stats-card"]')).toBeVisible({
        timeout: 10000,
      });
    });
  });

  test.describe('Recent Activity', function describeActivity() {
    test('should display audit entries after seeding', async function shouldDisplayAudit({
      page,
    }) {
      // Seed data to create audit entries
      await seedTestMapping(page);
      await page.reload();
      await page.waitForLoadState('networkidle');

      await expect(page.locator('[data-testid="audit-card"]')).toBeVisible({
        timeout: 10000,
      });

      // Audit table should be visible (seeding creates an audit entry)
      await expect(page.locator('[data-testid="audit-table"]')).toBeVisible({
        timeout: 10000,
      });

      // Should have at least one audit row with the seeded CUSIP
      const auditRows = page.locator(
        '[data-testid="audit-table"] tr.mat-mdc-row'
      );
      await expect(auditRows.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Error Handling', function describeErrors() {
    test('should display loading spinner during slow API calls', async function shouldShowLoading({
      page,
    }) {
      // Slow down the API to catch the loading state
      await page.route(
        '**/api/admin/cusip-cache/stats',
        async function onRoute(route) {
          await new Promise(function delay(resolve) {
            setTimeout(resolve, 1000);
          });
          await route.continue();
        }
      );

      await page.goto('/global/cusip-cache');

      const spinner = page.locator('[data-testid="loading-spinner"]');
      await expect(spinner).toBeVisible({ timeout: 5000 });

      // Wait for the spinner to disappear once data loads
      await expect(spinner).not.toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Responsive Layout', function describeLayout() {
    test('should render on desktop', async function shouldRenderDesktop({
      page,
    }) {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(300);

      await expect(
        page.locator('[data-testid="cusip-cache-page"]')
      ).toBeVisible();
    });

    test('should render on tablet', async function shouldRenderTablet({
      page,
    }) {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(300);

      await expect(
        page.locator('[data-testid="cusip-cache-page"]')
      ).toBeVisible();
    });
  });
});
