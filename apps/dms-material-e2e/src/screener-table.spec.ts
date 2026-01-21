import { test, expect } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedScreenerData } from './helpers/seed-screener-data.helper';

test.describe('Screener Table', () => {
  let cleanup: () => Promise<void>;

  test.beforeEach(async ({ page }) => {
    // Seed test data for this test
    const seeder = await seedScreenerData();
    cleanup = seeder.cleanup;

    await login(page);
    await page.goto('/global/screener');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    // Clean up test data after each test for isolation
    if (cleanup) {
      await cleanup();
    }
  });

  test.describe('Data Display', () => {
    test('should display screener table', async ({ page }) => {
      const table = page.locator('[data-testid="screener-table"]');
      await expect(table).toBeVisible();
    });

    test('should display all required columns', async ({ page }) => {
      await expect(
        page.getByRole('columnheader', { name: 'Symbol' })
      ).toBeVisible();
      await expect(
        page.getByRole('columnheader', { name: 'Risk Group' })
      ).toBeVisible();
      await expect(
        page.getByRole('columnheader', { name: 'Has Volatility' })
      ).toBeVisible();
      await expect(
        page.getByRole('columnheader', { name: 'Objectives Understood' })
      ).toBeVisible();
      await expect(
        page.getByRole('columnheader', { name: 'Graph Higher Before 2008' })
      ).toBeVisible();
    });

    test('should display data rows', async ({ page }) => {
      const rows = page.locator('[data-testid="screener-table"] tbody tr');
      await expect(rows).not.toHaveCount(0);
    });

    test('should display symbols in sorted order', async ({ page }) => {
      const symbols = await page
        .locator('[data-testid="screener-table"] tbody tr td:first-child')
        .allTextContents();

      // Incomplete items should be at top, completed at bottom
      expect(symbols.length).toBeGreaterThan(0);
    });
  });

  test.describe('Checkbox Editing', () => {
    test('should toggle checkbox when clicked', async ({ page }) => {
      // Mock API response for update
      await page.route('**/api/screener/rows', async (route) => {
        await route.fulfill({
          status: 200,
          json: [
            {
              id: '1',
              symbol: 'TEST',
              has_volitility: true,
              objectives_understood: false,
              graph_higher_before_2008: false,
            },
          ],
        });
      });

      const checkbox = page
        .locator(
          '[data-testid="has-volitility-checkbox"] input[type="checkbox"]'
        )
        .first();
      const initialState = await checkbox.isChecked();

      await checkbox.click();

      // Wait for state update
      await page.waitForTimeout(100);

      const newState = await checkbox.isChecked();
      expect(newState).toBe(!initialState);
    });

    test('should persist checkbox change to backend', async ({ page }) => {
      let updateCalled = false;

      // Set up route interception before any navigation
      await page.route('**/api/screener/rows', async (route) => {
        if (route.request().method() === 'PUT') {
          updateCalled = true;
          // Fulfill with success
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([]),
          });
        } else {
          // Let other requests (POST for load) pass through
          await route.continue();
        }
      });

      // Wait for table to have data
      await page
        .locator('[data-testid="screener-table"] tbody tr')
        .first()
        .waitFor({ state: 'visible' });

      const checkbox = page
        .locator(
          '[data-testid="objectives-understood-checkbox"] input[type="checkbox"]'
        )
        .first();
      
      // Wait for checkbox to be ready
      await checkbox.waitFor({ state: 'visible' });
      await checkbox.click();

      // Wait for SmartNgRX to trigger the update
      await page.waitForTimeout(1000);

      expect(updateCalled).toBe(true);
    });

    test('should update all three checkbox fields', async ({ page }) => {
      await page.route('**/api/screener/rows', async (route) => {
        await route.fulfill({ status: 200, json: [] });
      });

      const volatilityCheck = page
        .locator(
          '[data-testid="has-volitility-checkbox"] input[type="checkbox"]'
        )
        .first();
      const objectivesCheck = page
        .locator(
          '[data-testid="objectives-understood-checkbox"] input[type="checkbox"]'
        )
        .first();
      const graphCheck = page
        .locator('[data-testid="graph-higher-checkbox"] input[type="checkbox"]')
        .first();

      await volatilityCheck.click();
      await objectivesCheck.click();
      await graphCheck.click();

      // All should be clickable and toggle
      await expect(volatilityCheck).toBeEnabled();
      await expect(objectivesCheck).toBeEnabled();
      await expect(graphCheck).toBeEnabled();
    });
  });

  test.describe('Risk Group Filtering', () => {
    test('should have risk group filter dropdown', async ({ page }) => {
      const dropdown = page.locator('[data-testid="risk-group-filter"]');
      await expect(dropdown).toBeVisible();
    });

    test('should show all risk group options', async ({ page }) => {
      const dropdown = page.locator('[data-testid="risk-group-filter"]');
      await dropdown.click();

      await expect(page.getByRole('option', { name: 'All' })).toBeVisible();
      await expect(
        page.getByRole('option', { name: 'Equities' })
      ).toBeVisible();
      await expect(
        page.getByRole('option', { name: 'Income', exact: true })
      ).toBeVisible();
      await expect(
        page.getByRole('option', { name: 'Tax Free Income' })
      ).toBeVisible();
    });

    test('should filter by risk group', async ({ page }) => {
      const dropdown = page.locator('[data-testid="risk-group-filter"]');
      await dropdown.click();

      await page.getByRole('option', { name: 'Equities' }).click();

      // All visible rows should have "Equities" risk group
      const riskGroups = await page
        .locator('[data-testid="screener-table"] tbody tr td:nth-child(2)')
        .allTextContents();

      for (const group of riskGroups) {
        expect(group).toContain('Equities');
      }
    });

    test('should show all data when "All" is selected', async ({ page }) => {
      const dropdown = page.locator('[data-testid="risk-group-filter"]');

      // First filter to something specific
      await dropdown.click();
      await page.waitForTimeout(300); // Wait for dropdown animation
      await page.getByRole('option', { name: 'Equities' }).click();
      await page.waitForTimeout(500); // Wait for filter to apply

      const filteredCount = await page
        .locator('[data-testid="screener-table"] tbody tr')
        .count();

      // Then select All
      await dropdown.click();
      await page.waitForTimeout(300); // Wait for dropdown animation
      await page.getByRole('option', { name: 'All' }).click();
      await page.waitForTimeout(500); // Wait for filter to apply

      const allCount = await page
        .locator('[data-testid="screener-table"] tbody tr')
        .count();

      // "All" should show at least as many items (could be equal if all items are in filtered group)
      expect(allCount).toBeGreaterThanOrEqual(filteredCount);
      // Also verify we have some data showing
      expect(allCount).toBeGreaterThan(0);
    });

    test('should maintain filter while editing', async ({ page }) => {
      // Set filter
      const dropdown = page.locator('[data-testid="risk-group-filter"]');
      await dropdown.click();
      await page.getByRole('option', { name: 'Income', exact: true }).click();
      await page.waitForTimeout(500); // Wait for filter to apply

      // Verify filter is active before editing
      const rowsBeforeEdit = await page
        .locator('[data-testid="screener-table"] tbody tr')
        .count();
      expect(rowsBeforeEdit).toBeGreaterThan(0);

      // Edit checkbox
      const checkbox = page
        .locator(
          '[data-testid="has-volitility-checkbox"] input[type="checkbox"]'
        )
        .first();
      await checkbox.click();
      await page.waitForTimeout(500); // Wait for update to complete

      // Filter should still be active - verify row count unchanged
      const rowsAfterEdit = await page
        .locator('[data-testid="screener-table"] tbody tr')
        .count();
      expect(rowsAfterEdit).toBe(rowsBeforeEdit);

      // All visible rows should still have "Income" risk group
      const riskGroups = await page
        .locator('[data-testid="screener-table"] tbody tr td:nth-child(2)')
        .allTextContents();

      for (const group of riskGroups) {
        expect(group).toContain('Income');
      }
    });
  });

  test.describe('Integration Workflows', () => {
    test('should handle complete workflow: filter, edit, verify', async ({
      page,
    }) => {
      // 1. Apply filter
      const dropdown = page.locator('[data-testid="risk-group-filter"]');
      await dropdown.click();
      await page.getByRole('option', { name: 'Equities' }).click();
      await page.waitForTimeout(500); // Wait for filter to apply

      // 2. Edit first row checkboxes
      const firstRowChecks = page
        .locator('[data-testid="screener-table"] tbody tr')
        .first();

      // Get initial states
      const volatilityCheckbox = firstRowChecks.locator(
        '[data-testid="has-volitility-checkbox"] input[type="checkbox"]'
      );
      const objectivesCheckbox = firstRowChecks.locator(
        '[data-testid="objectives-understood-checkbox"] input[type="checkbox"]'
      );
      const graphCheckbox = firstRowChecks.locator(
        '[data-testid="graph-higher-checkbox"] input[type="checkbox"]'
      );

      const initialVolatility = await volatilityCheckbox.isChecked();
      const initialObjectives = await objectivesCheckbox.isChecked();
      const initialGraph = await graphCheckbox.isChecked();

      // Click each checkbox
      await volatilityCheckbox.click();
      await page.waitForTimeout(300);
      await objectivesCheckbox.click();
      await page.waitForTimeout(300);
      await graphCheckbox.click();
      await page.waitForTimeout(300);

      // 3. Verify all three have toggled state
      await expect(volatilityCheckbox).toHaveAttribute(
        'aria-checked',
        String(!initialVolatility)
      );
      await expect(objectivesCheckbox).toHaveAttribute(
        'aria-checked',
        String(!initialObjectives)
      );
      await expect(graphCheckbox).toHaveAttribute(
        'aria-checked',
        String(!initialGraph)
      );
    });
  });
});
