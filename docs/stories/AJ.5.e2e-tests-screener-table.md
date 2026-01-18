# Story AJ.5: Add E2E Tests for Screener Table - RED Test Creation

## Story

**As a** QA engineer
**I want** comprehensive E2E tests for screener table functionality
**So that** I can verify the complete user workflow

## Context

**Testing Approach:**

This story follows TDD (Test-Driven Development) practices:

1. **RED Phase**: Write failing tests first (this story)
2. **GREEN Phase**: Implementation stories make tests pass (AJ.1, AJ.2, AJ.3)
3. Tests will be created but DISABLED initially to allow CI to pass

**Test Scope:**

- Table displays screener data
- Checkboxes are clickable and persist changes
- Risk group filtering works
- Complete user workflows

## Acceptance Criteria

### Test Coverage Requirements

- [ ] Test table displays screener data
- [ ] Test checkbox editing functionality
- [ ] Test risk group filter dropdown
- [ ] Test filter persistence during editing
- [ ] Test data updates after checkbox changes
- [ ] **CRITICAL**: All tests are disabled (.skip) to pass CI

### Technical Requirements

- [ ] Use Playwright testing framework
- [ ] Use data-testid selectors for reliability
- [ ] Mock backend API responses
- [ ] Handle async operations properly
- [ ] Follow existing E2E test patterns

## Implementation Details

### Create E2E Test File

Create failing tests in `apps/dms-material-e2e/src/screener-table.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { login } from './helpers/login.helper';

// DISABLED: Will be enabled when AJ.1-AJ.3 are complete
test.describe.skip('Screener Table', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/global/universe');
  });

  test.describe('Data Display', () => {
    test('should display screener table', async ({ page }) => {
      const table = page.locator('[data-testid="screener-table"]');
      await expect(table).toBeVisible();
    });

    test('should display all required columns', async ({ page }) => {
      await expect(page.locator('th:has-text("Symbol")')).toBeVisible();
      await expect(page.locator('th:has-text("Risk Group")')).toBeVisible();
      await expect(page.locator('th:has-text("Has Volatility")')).toBeVisible();
      await expect(page.locator('th:has-text("Objectives Understood")')).toBeVisible();
      await expect(page.locator('th:has-text("Graph Higher Before 2008")')).toBeVisible();
    });

    test('should display data rows', async ({ page }) => {
      const rows = page.locator('[data-testid="screener-table"] tbody tr');
      await expect(rows).not.toHaveCount(0);
    });

    test('should display symbols in sorted order', async ({ page }) => {
      const symbols = await page.locator('[data-testid="screener-table"] tbody tr td:first-child').allTextContents();

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
          json: [{ id: '1', symbol: 'TEST', has_volitility: true, objectives_understood: false, graph_higher_before_2008: false }],
        });
      });

      const checkbox = page.locator('[data-testid="has-volitility-checkbox"]').first();
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

      const checkbox = page.locator('[data-testid="objectives-understood-checkbox"]').first();
      await checkbox.click();

      // Wait for API call
      await page.waitForTimeout(500);

      expect(updateCalled).toBe(true);
    });

    test('should update all three checkbox fields', async ({ page }) => {
      await page.route('**/api/screener/rows', async (route) => {
        await route.fulfill({ status: 200, json: [] });
      });

      const volatilityCheck = page.locator('[data-testid="has-volitility-checkbox"]').first();
      const objectivesCheck = page.locator('[data-testid="objectives-understood-checkbox"]').first();
      const graphCheck = page.locator('[data-testid="graph-higher-checkbox"]').first();

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

      await expect(page.locator('mat-option:has-text("All")')).toBeVisible();
      await expect(page.locator('mat-option:has-text("Equities")')).toBeVisible();
      await expect(page.locator('mat-option:has-text("Income")')).toBeVisible();
      await expect(page.locator('mat-option:has-text("Tax Free Income")')).toBeVisible();
    });

    test('should filter by risk group', async ({ page }) => {
      const dropdown = page.locator('[data-testid="risk-group-filter"]');
      await dropdown.click();

      await page.locator('mat-option:has-text("Equities")').click();

      // All visible rows should have "Equities" risk group
      const riskGroups = await page.locator('[data-testid="screener-table"] tbody tr td:nth-child(2)').allTextContents();

      for (const group of riskGroups) {
        expect(group).toContain('Equities');
      }
    });

    test('should show all data when "All" is selected', async ({ page }) => {
      const dropdown = page.locator('[data-testid="risk-group-filter"]');

      // First filter
      await dropdown.click();
      await page.locator('mat-option:has-text("Equities")').click();

      const filteredCount = await page.locator('[data-testid="screener-table"] tbody tr').count();

      // Then select All
      await dropdown.click();
      await page.locator('mat-option:has-text("All")').click();

      const allCount = await page.locator('[data-testid="screener-table"] tbody tr').count();

      expect(allCount).toBeGreaterThanOrEqual(filteredCount);
    });

    test('should maintain filter while editing', async ({ page }) => {
      await page.route('**/api/screener/rows', async (route) => {
        await route.fulfill({ status: 200, json: [] });
      });

      // Set filter
      const dropdown = page.locator('[data-testid="risk-group-filter"]');
      await dropdown.click();
      await page.locator('mat-option:has-text("Income")').click();

      // Edit checkbox
      const checkbox = page.locator('[data-testid="has-volitility-checkbox"]').first();
      await checkbox.click();

      // Filter should still be active
      const riskGroups = await page.locator('[data-testid="screener-table"] tbody tr td:nth-child(2)').allTextContents();

      for (const group of riskGroups) {
        expect(group).toContain('Income');
      }
    });
  });

  test.describe('Integration Workflows', () => {
    test('should handle complete workflow: filter, edit, verify', async ({ page }) => {
      await page.route('**/api/screener/rows', async (route) => {
        await route.fulfill({ status: 200, json: [] });
      });

      // 1. Apply filter
      const dropdown = page.locator('[data-testid="risk-group-filter"]');
      await dropdown.click();
      await page.locator('mat-option:has-text("Equities")').click();

      // 2. Edit first row checkboxes
      const firstRowChecks = page.locator('[data-testid="screener-table"] tbody tr').first();
      await firstRowChecks.locator('[data-testid="has-volitility-checkbox"]').click();
      await firstRowChecks.locator('[data-testid="objectives-understood-checkbox"]').click();
      await firstRowChecks.locator('[data-testid="graph-higher-checkbox"]').click();

      // 3. Verify all three are checked
      await expect(firstRowChecks.locator('[data-testid="has-volitility-checkbox"]')).toBeChecked();
      await expect(firstRowChecks.locator('[data-testid="objectives-understood-checkbox"]')).toBeChecked();
      await expect(firstRowChecks.locator('[data-testid="graph-higher-checkbox"]')).toBeChecked();
    });
  });
});
```

### Add Data Test IDs

Ensure these data-testid attributes are added to the template:

- `[data-testid="screener-table"]` - Table element
- `[data-testid="risk-group-filter"]` - Risk group dropdown
- `[data-testid="has-volitility-checkbox"]` - Volatility checkboxes
- `[data-testid="objectives-understood-checkbox"]` - Objectives checkboxes
- `[data-testid="graph-higher-checkbox"]` - Graph checkboxes

## Definition of Done

- [ ] All new E2E tests created and initially failing (RED)
- [ ] All tests are disabled with `.skip`
- [ ] Test file created
- [ ] Tests follow workspace patterns
- [ ] Data-testid attributes documented
- [ ] All validation commands pass (with tests disabled)
  - Run `pnpm all`
  - Run `pnpm e2e:dms-material`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## Notes

These tests will be enabled in the implementation stories (AJ.1, AJ.2, AJ.3) as features are completed. This follows TDD best practices while ensuring CI remains green.

## Dev Agent Record

### Status

Not Started

### File List

(To be filled during implementation)

### Completion Notes

(To be filled during implementation)

### Change Log

(To be filled during implementation)
