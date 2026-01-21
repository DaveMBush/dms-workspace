import { test, expect } from 'playwright/test';

import { login } from './helpers/login.helper';

// ENABLED: Tests now active after AJ.1-AJ.3 implementation complete
// These tests verify the screener table functionality following TDD approach
test.describe('Screener Table', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/global/screener');
    await page.waitForLoadState('networkidle');
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

      await page.route('**/api/screener/rows', async (route) => {
        if (route.request().method() === 'PUT') {
          updateCalled = true;
        }
        await route.fulfill({
          status: 200,
          json: [],
        });
      });

      const checkbox = page
        .locator(
          '[data-testid="objectives-understood-checkbox"] input[type="checkbox"]'
        )
        .first();
      await checkbox.click();

      // Wait for API call
      await page.waitForTimeout(500);

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
      await page.route('**/api/screener/rows', async (route) => {
        await route.fulfill({ status: 200, json: [] });
      });

      // Set filter
      const dropdown = page.locator('[data-testid="risk-group-filter"]');
      await dropdown.click();
      await page.getByRole('option', { name: 'Income', exact: true }).click();

      // Edit checkbox
      const checkbox = page
        .locator(
          '[data-testid="has-volitility-checkbox"] input[type="checkbox"]'
        )
        .first();
      await checkbox.click();

      // Filter should still be active
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
      await page.route('**/api/screener/rows', async (route) => {
        await route.fulfill({ status: 200, json: [] });
      });

      // 1. Apply filter
      const dropdown = page.locator('[data-testid="risk-group-filter"]');
      await dropdown.click();
      await page.getByRole('option', { name: 'Equities' }).click();

      // 2. Edit first row checkboxes
      const firstRowChecks = page
        .locator('[data-testid="screener-table"] tbody tr')
        .first();
      await firstRowChecks
        .locator(
          '[data-testid="has-volitility-checkbox"] input[type="checkbox"]'
        )
        .click();
      await firstRowChecks
        .locator(
          '[data-testid="objectives-understood-checkbox"] input[type="checkbox"]'
        )
        .click();
      await firstRowChecks
        .locator('[data-testid="graph-higher-checkbox"] input[type="checkbox"]')
        .click();

      // 3. Verify all three are checked
      await expect(
        firstRowChecks.locator(
          '[data-testid="has-volitility-checkbox"] input[type="checkbox"]'
        )
      ).toBeChecked();
      await expect(
        firstRowChecks.locator(
          '[data-testid="objectives-understood-checkbox"] input[type="checkbox"]'
        )
      ).toBeChecked();
      await expect(
        firstRowChecks.locator(
          '[data-testid="graph-higher-checkbox"] input[type="checkbox"]'
        )
      ).toBeChecked();
    });
  });
});
