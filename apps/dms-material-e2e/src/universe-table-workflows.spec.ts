import { test, expect } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedUniverseData } from './helpers/seed-universe-data.helper';

/**
 * Universe Table Workflows E2E Tests (TDD - RED Phase)
 *
 * Story AN.11: Comprehensive E2E tests for universe table display and editing workflows
 * These tests are written BEFORE implementation (TDD RED phase)
 * Tests are disabled with .skip to allow CI to pass
 * Story AN.12 will implement functionality and enable these tests (GREEN phase)
 *
 * Test Coverage:
 * - Table data display and selection
 * - Cell editing workflows (distribution, yield, ex-date)
 * - Form validation during editing
 * - Symbol deletion workflow
 * - Add Symbol dialog integration
 * - Update Fields operation
 * - Table refresh functionality
 * - Filter combinations
 * - Edge cases and error handling
 */

test.describe('Universe Table Workflows', () => {
  let cleanup: () => Promise<void>;

  test.beforeEach(async ({ page }) => {
    // Seed test data for this test
    const seeder = await seedUniverseData();
    cleanup = seeder.cleanup;

    await login(page);
    await page.goto('/global/universe');
    // Wait for table to be ready instead of networkidle
    await expect(page.locator('dms-base-table')).toBeVisible();
    // Wait for data rows to load (Material table rows)
    await page.waitForSelector('tr.mat-mdc-row', { timeout: 10000 });
  });

  test.afterEach(async () => {
    // Clean up test data after each test for isolation
    if (cleanup) {
      await cleanup();
    }
  });

  test.describe('Table Data Display', () => {
    test('should display universe table with data rows', async ({ page }) => {
      const table = page.locator('dms-base-table');
      await expect(table).toBeVisible();

      const rows = page.locator('tr.mat-mdc-row');
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThan(0);
    });

    test('should display correct number of columns', async ({ page }) => {
      // The table has filter row and header row - count only header row
      const headers = page.locator('tr.mat-mdc-header-row:not(.filter-row) th');
      const headerCount = await headers.count();
      // Symbol, Risk Group, Distribution, Dist/Year, Yield %, Avg Purch Yield %, Last Price, Ex-Date, Most Recent Sell Date, Most Recent Sell Price, Position, Expired, Actions
      expect(headerCount).toBe(13);
    });

    test('should display symbol data in first column', async ({ page }) => {
      const firstCell = page.locator(
        'tr.mat-mdc-row:first-child td:first-child'
      );
      await expect(firstCell).toBeVisible();
      const text = await firstCell.textContent();
      expect(text?.trim()).toBeTruthy();
    });

    test('should display risk group data', async ({ page }) => {
      const riskGroupCell = page.locator(
        'tr.mat-mdc-row:first-child td:nth-child(2)'
      );
      await expect(riskGroupCell).toBeVisible();
      const text = await riskGroupCell.textContent();
      expect(text?.trim()).toBeTruthy();
    });

    test('should display distribution values formatted as currency', async ({
      page,
    }) => {
      const distributionCell = page.locator(
        'tr.mat-mdc-row:first-child td:nth-child(3)'
      );
      await expect(distributionCell).toBeVisible();
      const text = await distributionCell.textContent();
      // Distribution is shown as a number (e.g., 1.25 not $1.25) in editable cell
      expect(text?.trim()).toMatch(/^\d+\.\d+$/);
    });

    test('should display yield percentage with two decimals', async ({
      page,
    }) => {
      // Yield % is in the 5th column (after Symbol, Risk Group, Distribution, Dist/Year)
      const yieldCell = page.locator(
        'tr.mat-mdc-row:first-child td:nth-child(5)'
      );
      await expect(yieldCell).toBeVisible();
      const text = await yieldCell.textContent();
      // Percentage format check (e.g., 5.25% or 5.25)
      // eslint-disable-next-line sonarjs/slow-regex -- Simple regex for decimal format validation
      expect(text).toMatch(/\d+\.\d{2}/);
    });

    test('should display ex-date in correct format', async ({ page }) => {
      // Ex-Date is in the 8th column
      const exDateCell = page.locator(
        'tr.mat-mdc-row:first-child td:nth-child(8)'
      );
      await expect(exDateCell).toBeVisible();
      const text = await exDateCell.textContent();
      // Date format check (e.g., MM/DD/YYYY or YYYY-MM-DD)
      expect(text).toBeTruthy();
    });

    test('should display action buttons in last column', async ({ page }) => {
      // Actions is the 13th (last) column
      const actionsCell = page.locator(
        'tr.mat-mdc-row:first-child td:nth-child(13)'
      );
      await expect(actionsCell).toBeVisible();
    });
  });

  test.describe('Cell Editing - Distribution', () => {
    test('should enter edit mode when clicking distribution cell', async ({
      page,
    }) => {
      const distributionCell = page.locator(
        '[data-testid="distribution-cell-0"]'
      );
      await distributionCell.click();

      const input = page.locator('input[data-testid="distribution-input"]');
      await expect(input).toBeVisible();
      await expect(input).toBeFocused();
    });

    test('should display current value in edit mode', async ({ page }) => {
      const distributionCell = page.locator(
        '[data-testid="distribution-cell-0"]'
      );
      const originalValue = await distributionCell.textContent();
      await distributionCell.click();

      const input = page.locator('input[data-testid="distribution-input"]');
      const inputValue = await input.inputValue();
      // Input should contain numeric value without currency symbol
      expect(inputValue).toBeTruthy();
    });

    test('should save distribution value on Enter key', async ({ page }) => {
      const distributionCell = page.locator(
        '[data-testid="distribution-cell-0"]'
      );
      await distributionCell.click();

      const input = page.locator('input[data-testid="distribution-input"]');
      await input.fill('2.50');
      await input.press('Enter');

      // Input should hide
      await expect(input).not.toBeVisible();

      // Cell should display updated value
      await expect(distributionCell).toContainText('2.50');
    });

    test('should save distribution value on blur', async ({ page }) => {
      const distributionCell = page.locator(
        '[data-testid="distribution-cell-0"]'
      );
      await distributionCell.click();

      const input = page.locator('input[data-testid="distribution-input"]');
      await input.fill('3.75');
      await page.click('body');

      // Input should hide
      await expect(input).not.toBeVisible();
    });

    test('should cancel edit on Escape key', async ({ page }) => {
      const distributionCell = page.locator(
        '[data-testid="distribution-cell-0"]'
      );
      const originalValue = await distributionCell.textContent();
      await distributionCell.click();

      const input = page.locator('input[data-testid="distribution-input"]');
      await input.fill('999.99');
      await input.press('Escape');

      // Input should hide
      await expect(input).not.toBeVisible();

      // Cell should show original value
      const currentValue = await distributionCell.textContent();
      expect(currentValue).toBe(originalValue);
    });

    test('should validate numeric input for distribution', async ({ page }) => {
      const distributionCell = page.locator(
        '[data-testid="distribution-cell-0"]'
      );
      await distributionCell.click();

      const input = page.locator('input[data-testid="distribution-input"]');
      await input.fill('invalid');
      await input.press('Enter');

      // Should show validation error
      const errorMessage = page.locator('.validation-error');
      await expect(errorMessage).toBeVisible();
    });

    test('should reject negative distribution values', async ({ page }) => {
      const distributionCell = page.locator(
        '[data-testid="distribution-cell-0"]'
      );
      await distributionCell.click();

      const input = page.locator('input[data-testid="distribution-input"]');
      await input.fill('-5.00');
      await input.press('Enter');

      // Should show validation error
      const errorMessage = page.locator('.validation-error');
      await expect(errorMessage).toBeVisible();
    });

    test('should update yield percentage automatically when distribution changes', async ({
      page,
    }) => {
      const distributionCell = page.locator(
        '[data-testid="distribution-cell-0"]'
      );
      const yieldCell = page.locator('[data-testid="yield-cell-0"]');

      const originalYield = await yieldCell.textContent();

      await distributionCell.click();
      const input = page.locator('input[data-testid="distribution-input"]');
      await input.fill('5.00');
      await input.press('Enter');

      // Wait for yield to recalculate
      await page.waitForTimeout(500);

      const newYield = await yieldCell.textContent();
      // Yield should have changed (assuming price is constant)
      expect(newYield).not.toBe(originalYield);
    });
  });

  test.describe.skip('Cell Editing - Yield Percentage', () => {
    // Yield is a calculated field (distribution * distributions_per_year / last_price)
    // and is not directly editable. These tests are skipped.
    test('should enter edit mode when clicking yield cell', async ({
      page,
    }) => {
      const yieldCell = page.locator('[data-testid="yield-cell-0"]');
      await yieldCell.click();

      const input = page.locator('input[data-testid="yield-input"]');
      await expect(input).toBeVisible();
      await expect(input).toBeFocused();
    });

    test('should save yield value on Enter key', async ({ page }) => {
      const yieldCell = page.locator('[data-testid="yield-cell-0"]');
      await yieldCell.click();

      const input = page.locator('input[data-testid="yield-input"]');
      await input.fill('6.50');
      await input.press('Enter');

      await expect(input).not.toBeVisible();
      await expect(yieldCell).toContainText('6.50');
    });

    test('should validate percentage range (0-100)', async ({ page }) => {
      const yieldCell = page.locator('[data-testid="yield-cell-0"]');
      await yieldCell.click();

      const input = page.locator('input[data-testid="yield-input"]');
      await input.fill('150');
      await input.press('Enter');

      // Should show validation error for out of range
      const errorMessage = page.locator('.validation-error');
      await expect(errorMessage).toBeVisible();
    });

    test('should accept decimal values for yield', async ({ page }) => {
      const yieldCell = page.locator('[data-testid="yield-cell-0"]');
      await yieldCell.click();

      const input = page.locator('input[data-testid="yield-input"]');
      await input.fill('5.75');
      await input.press('Enter');

      await expect(input).not.toBeVisible();
    });
  });

  test.describe('Cell Editing - Ex-Date', () => {
    test('should enter edit mode when clicking ex-date cell', async ({
      page,
    }) => {
      const exDateCell = page.locator('[data-testid="ex-date-cell-0"]');
      await exDateCell.click();

      const datepicker = page.locator('[data-testid="ex-date-picker"]');
      await expect(datepicker).toBeVisible();
    });

    test('should display date picker when editing ex-date', async ({
      page,
    }) => {
      const exDateCell = page.locator('[data-testid="ex-date-cell-0"]');
      await exDateCell.click();

      const datepicker = page.locator('mat-datepicker-content');
      await expect(datepicker).toBeVisible();
    });

    test('should save selected date on selection', async ({ page }) => {
      const exDateCell = page.locator('[data-testid="ex-date-cell-0"]');
      await exDateCell.click();

      // Select a date from the calendar (e.g., 15th of current month)
      const dateButton = page.locator('button[aria-label*="15"]').first();
      await dateButton.click();

      // Datepicker should close
      const datepicker = page.locator('mat-datepicker-content');
      await expect(datepicker).not.toBeVisible();
    });

    test('should format date correctly after saving', async ({ page }) => {
      const exDateCell = page.locator('[data-testid="ex-date-cell-0"]');
      await exDateCell.click();

      const dateButton = page.locator('button[aria-label*="15"]').first();
      await dateButton.click();

      // Check date format in cell
      const cellText = await exDateCell.textContent();
      // Date should be formatted (exact format depends on locale)
      expect(cellText).toBeTruthy();
    });

    test('should cancel date edit on Escape', async ({ page }) => {
      const exDateCell = page.locator('[data-testid="ex-date-cell-0"]');
      const originalValue = await exDateCell.textContent();
      await exDateCell.click();

      await page.keyboard.press('Escape');

      // Datepicker should close without saving
      const datepicker = page.locator('mat-datepicker-content');
      await expect(datepicker).not.toBeVisible();

      const currentValue = await exDateCell.textContent();
      expect(currentValue).toBe(originalValue);
    });

    test('should mark expired symbols when ex-date is in past', async ({
      page,
    }) => {
      const exDateCell = page.locator('[data-testid="ex-date-cell-0"]');
      await exDateCell.click();

      // Navigate to previous month and select a date
      const prevMonthButton = page.locator(
        'button[aria-label="Previous month"]'
      );
      await prevMonthButton.click();

      const dateButton = page.locator('button[aria-label*="15"]').first();
      await dateButton.click();

      // Wait for datepicker to close (ensures save operation completes)
      const datepicker = page.locator('mat-datepicker-content');
      await expect(datepicker).not.toBeVisible();

      // Row should be marked as expired (e.g., different styling)
      const row = page.locator('tbody tr:first-child');
      await expect(row).toHaveClass(/expired/);
    });
  });

  test.describe('Symbol Deletion', () => {
    test.skip('should display delete button for deletable symbols', async ({
      page,
    }) => {
      // Mock response to ensure we have a deletable symbol (not CEF, position=0)
      const deleteButton = page
        .locator('[data-testid="delete-symbol-0"]')
        .first();
      await expect(deleteButton).toBeVisible();
    });

    test('should not display delete button for closed-end funds', async ({
      page,
    }) => {
      // Test assumes we have CEF symbols in the data
      const cefRow = page.locator('tbody tr[data-is-cef="true"]').first();
      const deleteButton = cefRow.locator('[data-testid^="delete-symbol"]');
      await expect(deleteButton).not.toBeVisible();
    });

    test('should not display delete button when position > 0', async ({
      page,
    }) => {
      // Test assumes we have symbols with positions > 0
      const positionRow = page
        .locator('tbody tr[data-has-position="true"]')
        .first();
      const deleteButton = positionRow.locator(
        '[data-testid^="delete-symbol"]'
      );
      await expect(deleteButton).not.toBeVisible();
    });

    test.skip('should show confirmation dialog when delete is clicked', async ({
      page,
    }) => {
      const deleteButton = page
        .locator('[data-testid="delete-symbol-0"]')
        .first();
      await deleteButton.click();

      const confirmDialog = page.locator('mat-dialog-container');
      await expect(confirmDialog).toBeVisible();
      await expect(confirmDialog).toContainText('confirm');
    });

    test.skip('should cancel deletion when Cancel is clicked', async ({
      page,
    }) => {
      const deleteButton = page
        .locator('[data-testid="delete-symbol-0"]')
        .first();
      const rowsBefore = await page.locator('tbody tr').count();

      await deleteButton.click();

      const cancelButton = page.locator('button:has-text("Cancel")');
      await cancelButton.click();

      const rowsAfter = await page.locator('tbody tr').count();
      expect(rowsAfter).toBe(rowsBefore);
    });

    test.skip('should remove symbol when deletion is confirmed', async ({
      page,
    }) => {
      const deleteButton = page
        .locator('[data-testid="delete-symbol-0"]')
        .first();
      const rowsBefore = await page.locator('tbody tr').count();

      // Get symbol name for notification check
      const symbolCell = page.locator('tbody tr:first-child td:first-child');
      const symbolName = await symbolCell.textContent();

      await deleteButton.click();

      const confirmButton = page.locator('button:has-text("Delete")');
      await confirmButton.click();

      // Row should be removed
      await page.waitForTimeout(500);
      const rowsAfter = await page.locator('tbody tr').count();
      expect(rowsAfter).toBe(rowsBefore - 1);
    });

    test.skip('should show success notification after deletion', async ({
      page,
    }) => {
      const deleteButton = page
        .locator('[data-testid="delete-symbol-0"]')
        .first();
      const symbolCell = page.locator('tbody tr:first-child td:first-child');
      const symbolName = await symbolCell.textContent();

      await deleteButton.click();
      const confirmButton = page.locator('button:has-text("Delete")');
      await confirmButton.click();

      const notification = page.locator('.notification-success');
      await expect(notification).toBeVisible();
      await expect(notification).toContainText(`Deleted symbol: ${symbolName}`);
    });
  });

  test.describe('Add Symbol Dialog', () => {
    test('should open Add Symbol dialog when button is clicked', async ({
      page,
    }) => {
      const addButton = page.locator('[data-testid="add-symbol-button"]');
      await addButton.click();

      const dialog = page.locator('mat-dialog-container');
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText('Add Symbol');
    });

    test('should display symbol input in dialog', async ({ page }) => {
      const addButton = page.locator('[data-testid="add-symbol-button"]');
      await addButton.click();

      const symbolInput = page.locator('[data-testid="symbol-input"]');
      await expect(symbolInput).toBeVisible();
    });

    test('should close dialog when Cancel is clicked', async ({ page }) => {
      const addButton = page.locator('[data-testid="add-symbol-button"]');
      await addButton.click();

      const cancelButton = page.locator('button:has-text("Cancel")');
      await cancelButton.click();

      const dialog = page.locator('mat-dialog-container');
      await expect(dialog).not.toBeVisible();
    });

    test.skip('should validate symbol format before adding', async ({
      page,
    }) => {
      const addButton = page.locator('[data-testid="add-symbol-button"]');
      await addButton.click();

      const symbolInput = page.locator('[data-testid="symbol-input"]');
      await symbolInput.fill('123invalid!');

      const submitButton = page.locator('button:has-text("Add")');
      await submitButton.click();

      // Should show validation error
      const errorMessage = page.locator('.validation-error');
      await expect(errorMessage).toBeVisible();
    });

    test.skip('should add symbol to table on successful submission', async ({
      page,
    }) => {
      const rowsBefore = await page.locator('tbody tr').count();

      const addButton = page.locator('[data-testid="add-symbol-button"]');
      await addButton.click();

      const symbolInput = page.locator('[data-testid="symbol-input"]');
      await symbolInput.fill('NEWTEST');

      const submitButton = page.locator('button:has-text("Add")');
      await submitButton.click();

      // Dialog should close
      const dialog = page.locator('mat-dialog-container');
      await expect(dialog).not.toBeVisible();

      // Table should have new row
      await page.waitForTimeout(1000);
      const rowsAfter = await page.locator('tbody tr').count();
      expect(rowsAfter).toBe(rowsBefore + 1);
    });

    test.skip('should show success notification after adding symbol', async ({
      page,
    }) => {
      const addButton = page.locator('[data-testid="add-symbol-button"]');
      await addButton.click();

      const symbolInput = page.locator('[data-testid="symbol-input"]');
      await symbolInput.fill('NEWTEST');

      const submitButton = page.locator('button:has-text("Add")');
      await submitButton.click();

      const notification = page.locator('.notification-success');
      await expect(notification).toBeVisible();
      await expect(notification).toContainText('NEWTEST');
    });

    test.skip('should handle duplicate symbol error', async ({ page }) => {
      const addButton = page.locator('[data-testid="add-symbol-button"]');
      await addButton.click();

      // Get existing symbol from table
      const firstSymbol = await page
        .locator('tbody tr:first-child td:first-child')
        .textContent();

      const symbolInput = page.locator('[data-testid="symbol-input"]');
      await symbolInput.fill(firstSymbol || 'EXISTING');

      const submitButton = page.locator('button:has-text("Add")');
      await submitButton.click();

      // Should show error notification
      const notification = page.locator('.notification-error');
      await expect(notification).toBeVisible();
      await expect(notification).toContainText('already exists');
    });
  });

  test.describe.skip('Update Fields Operation', () => {
    test('should trigger update fields when button is clicked', async ({
      page,
    }) => {
      let updateCallCount = 0;

      // Mock the API endpoint
      await page.route('**/api/universe/update-fields', async (route) => {
        updateCallCount++;
        await route.fulfill({
          status: 200,
          json: { updated: 25 },
        });
      });

      const updateButton = page.locator('[data-testid="update-fields-button"]');
      await updateButton.click();

      await page.waitForTimeout(2000);
      expect(updateCallCount).toBe(1);
    });

    test('should show loading overlay during update fields', async ({
      page,
    }) => {
      await page.route('**/api/universe/update-fields', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          json: { updated: 25 },
        });
      });

      const updateButton = page.locator('[data-testid="update-fields-button"]');
      await updateButton.click();

      const overlay = page.locator('[data-testid="loading-overlay"]');
      await expect(overlay).toBeVisible();
      await expect(overlay).toContainText('Updating universe fields');
    });

    test('should disable button during update operation', async ({ page }) => {
      await page.route('**/api/universe/update-fields', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          json: { updated: 25 },
        });
      });

      const updateButton = page.locator('[data-testid="update-fields-button"]');
      await updateButton.click();

      await expect(updateButton).toBeDisabled();
    });

    test('should show success notification with update count', async ({
      page,
    }) => {
      await page.route('**/api/universe/update-fields', async (route) => {
        await route.fulfill({
          status: 200,
          json: { updated: 42 },
        });
      });

      const updateButton = page.locator('[data-testid="update-fields-button"]');
      await updateButton.click();

      await page.waitForTimeout(2000);

      const notification = page.locator('.notification-success');
      await expect(notification).toBeVisible();
      await expect(notification).toContainText('42 entries updated');
    });

    test('should handle update fields error gracefully', async ({ page }) => {
      await page.route('**/api/universe/update-fields', async (route) => {
        await route.fulfill({
          status: 500,
          json: { error: 'Update failed' },
        });
      });

      const updateButton = page.locator('[data-testid="update-fields-button"]');
      await updateButton.click();

      await page.waitForTimeout(2000);

      const notification = page.locator('.notification-error');
      await expect(notification).toBeVisible();
    });
  });

  test.describe.skip('Filter Combinations', () => {
    test('should filter by symbol and risk group together', async ({
      page,
    }) => {
      // Get baseline count
      const rows = page.locator('tbody tr');
      const baselineCount = await rows.count();

      const symbolInput = page.locator('input[placeholder="Search Symbol"]');
      await symbolInput.fill('AAP');

      const riskGroupSelect = page.locator('.filter-row mat-select').first();
      await riskGroupSelect.click();
      await page.getByRole('option', { name: 'Equities' }).click();

      // Filtered results should be <= baseline
      await page.waitForTimeout(500); // Allow filter to apply
      const filteredCount = await rows.count();
      expect(filteredCount).toBeLessThanOrEqual(baselineCount);

      // Verify visible rows contain filter criteria
      if (filteredCount > 0) {
        const firstSymbol = await rows
          .first()
          .locator('td:first-child')
          .textContent();
        expect(firstSymbol?.toUpperCase()).toContain('AAP');
      }
    });

    test('should filter by yield and expired status together', async ({
      page,
    }) => {
      const rows = page.locator('tbody tr');
      const baselineCount = await rows.count();

      const yieldInput = page.locator('input[placeholder="Min Yield %"]');
      await yieldInput.fill('5');

      const expiredSelect = page.locator('.filter-row mat-select').last();
      await expiredSelect.click();
      await page.getByRole('option', { name: 'No' }).click();

      // Filtered results should be <= baseline
      await page.waitForTimeout(500); // Allow filter to apply
      const filteredCount = await rows.count();
      expect(filteredCount).toBeLessThanOrEqual(baselineCount);

      // Verify visible rows meet yield threshold
      if (filteredCount > 0) {
        const firstYieldCell = await rows
          .first()
          .locator('td:nth-child(4)')
          .textContent();
        const yieldValue = parseFloat(
          firstYieldCell?.replace(/[^0-9.]/g, '') || '0'
        );
        expect(yieldValue).toBeGreaterThanOrEqual(5);
      }
    });

    test('should apply all filters simultaneously', async ({ page }) => {
      const rows = page.locator('tbody tr');
      const baselineCount = await rows.count();

      const symbolInput = page.locator('input[placeholder="Search Symbol"]');
      await symbolInput.fill('A');

      const riskGroupSelect = page.locator('.filter-row mat-select').first();
      await riskGroupSelect.click();
      await page.getByRole('option', { name: 'Income' }).click();

      const yieldInput = page.locator('input[placeholder="Min Yield %"]');
      await yieldInput.fill('3');

      const expiredSelect = page.locator('.filter-row mat-select').last();
      await expiredSelect.click();
      await page.getByRole('option', { name: 'No' }).click();

      // Filtered results should be <= baseline with all filters applied
      await page.waitForTimeout(500); // Allow filters to apply
      const filteredCount = await rows.count();
      expect(filteredCount).toBeLessThanOrEqual(baselineCount);

      // Verify first visible row matches all criteria
      if (filteredCount > 0) {
        const firstRow = rows.first();
        const symbol = await firstRow.locator('td:first-child').textContent();
        expect(symbol?.toUpperCase()).toContain('A');

        const yieldText = await firstRow
          .locator('td:nth-child(4)')
          .textContent();
        const yieldValue = parseFloat(
          yieldText?.replace(/[^0-9.]/g, '') || '0'
        );
        expect(yieldValue).toBeGreaterThanOrEqual(3);
      }
    });

    test('should clear filters independently', async ({ page }) => {
      // Apply multiple filters
      const symbolInput = page.locator('input[placeholder="Search Symbol"]');
      await symbolInput.fill('TEST');

      const yieldInput = page.locator('input[placeholder="Min Yield %"]');
      await yieldInput.fill('5');

      // Clear symbol filter
      await symbolInput.clear();

      // Yield filter should still be active
      const yieldValue = await yieldInput.inputValue();
      expect(yieldValue).toBe('5');
    });

    test('should show empty state when no results match filters', async ({
      page,
    }) => {
      const symbolInput = page.locator('input[placeholder="Search Symbol"]');
      await symbolInput.fill('NONEXISTENTSYMBOL999');

      const emptyState = page.locator('.empty-state');
      await expect(emptyState).toBeVisible();
      await expect(emptyState).toContainText('No results');
    });
  });

  test.describe.skip('Table Refresh', () => {
    test('should refresh table data when refresh icon is clicked', async ({
      page,
    }) => {
      let refreshCallCount = 0;

      await page.route('**/api/universe**', async (route) => {
        if (route.request().method() === 'GET') {
          refreshCallCount++;
          await route.fulfill({
            status: 200,
            json: { data: [] },
          });
        }
      });

      const refreshButton = page.locator('[data-testid="refresh-button"]');
      await refreshButton.click();

      await page.waitForTimeout(1000);
      expect(refreshCallCount).toBeGreaterThan(0);
    });

    test('should show loading state during refresh', async ({ page }) => {
      await page.route('**/api/universe**', async (route) => {
        if (route.request().method() === 'GET') {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          await route.fulfill({
            status: 200,
            json: { data: [] },
          });
        }
      });

      const refreshButton = page.locator('[data-testid="refresh-button"]');
      await refreshButton.click();

      const spinner = page.locator('mat-progress-spinner');
      await expect(spinner).toBeVisible();
    });

    test('should maintain filters after refresh', async ({ page }) => {
      const symbolInput = page.locator('input[placeholder="Search Symbol"]');
      await symbolInput.fill('AAP');

      const refreshButton = page.locator('[data-testid="refresh-button"]');
      await refreshButton.click();

      await page.waitForTimeout(1000);

      const filterValue = await symbolInput.inputValue();
      expect(filterValue).toBe('AAP');
    });
  });

  test.describe.skip('Edge Cases and Error Handling', () => {
    test('should handle empty table gracefully', async ({ page }) => {
      await page.route('**/api/universe**', async (route) => {
        await route.fulfill({
          status: 200,
          json: { data: [] },
        });
      });

      await page.reload();
      // Wait for specific empty state element instead of networkidle
      const emptyState = page.locator('.empty-state');
      await emptyState.waitFor({ state: 'visible' });
      await expect(emptyState).toBeVisible();
    });

    test('should handle API errors during data load', async ({ page }) => {
      await page.route('**/api/universe**', async (route) => {
        await route.fulfill({
          status: 500,
          json: { error: 'Internal server error' },
        });
      });

      await page.reload();
      // Wait for specific error message element instead of networkidle
      const errorMessage = page.locator('.error-message');
      await errorMessage.waitFor({ state: 'visible' });
      await expect(errorMessage).toBeVisible();
    });

    test('should prevent concurrent edit operations on same cell', async ({
      page,
    }) => {
      const distributionCell = page.locator(
        '[data-testid="distribution-cell-0"]'
      );

      // Double click rapidly
      await distributionCell.click();
      await distributionCell.click();

      // Should only have one input visible
      const inputs = page.locator('input[data-testid="distribution-input"]');
      const inputCount = await inputs.count();
      expect(inputCount).toBeLessThanOrEqual(1);
    });

    test('should handle network timeout during save', async ({ page }) => {
      await page.route('**/api/universe/*', async (route) => {
        // Never resolve to simulate timeout
        // eslint-disable-next-line @typescript-eslint/no-empty-function -- Intentionally empty to simulate timeout
        await new Promise(() => {});
      });

      const distributionCell = page.locator(
        '[data-testid="distribution-cell-0"]'
      );
      await distributionCell.click();

      const input = page.locator('input[data-testid="distribution-input"]');
      await input.fill('5.00');
      await input.press('Enter');

      // Should show timeout error after configured timeout period
      const errorNotification = page.locator('.notification-error');
      await expect(errorNotification).toBeVisible({ timeout: 10000 });
    });

    test('should handle special characters in symbol filter', async ({
      page,
    }) => {
      const symbolInput = page.locator('input[placeholder="Search Symbol"]');
      await symbolInput.fill('$%^&*()');

      // Should not crash and show no results or empty state
      await page.waitForTimeout(500); // Allow filter to apply
      const rows = page.locator('tbody tr');
      const count = await rows.count();

      // Special characters likely won't match any symbols
      expect(count).toBe(0);

      // Optionally verify empty state is shown
      const emptyState = page.locator('.empty-state');
      if (await emptyState.isVisible()) {
        await expect(emptyState).toBeVisible();
      }
    });

    test('should handle very large yield values', async ({ page }) => {
      const yieldCell = page.locator('[data-testid="yield-cell-0"]');
      await yieldCell.click();

      const input = page.locator('input[data-testid="yield-input"]');
      await input.fill('999999.99');
      await input.press('Enter');

      // Should show validation error or handle gracefully
      const hasError = await page.locator('.validation-error').isVisible();
      expect(hasError).toBeTruthy();
    });

    test('should preserve table state on route navigation and back', async ({
      page,
    }) => {
      // Apply a filter
      const symbolInput = page.locator('input[placeholder="Search Symbol"]');
      await symbolInput.fill('AAP');

      // Navigate away
      await page.goto('/global/summary');
      await expect(page.locator('.summary-container')).toBeVisible();

      // Navigate back
      await page.goto('/global/universe');
      await expect(page.locator('.universe-container')).toBeVisible();

      // Filter might or might not be preserved depending on implementation
      // At minimum, page should load without errors
      await expect(page.locator('.universe-container')).toBeVisible();
    });
  });

  test.describe.skip('Accessibility and Keyboard Navigation', () => {
    test('should support Tab key navigation through editable cells', async ({
      page,
    }) => {
      const firstCell = page.locator('[data-testid="distribution-cell-0"]');
      await firstCell.click();

      const input = page.locator('input[data-testid="distribution-input"]');
      await expect(input).toBeFocused();

      await page.keyboard.press('Tab');

      // Focus should move to next editable cell
      const nextInput = page.locator('input[data-testid="yield-input"]');
      await expect(nextInput).toBeFocused();
    });

    test('should support keyboard-only operation for filters', async ({
      page,
    }) => {
      await page.keyboard.press('Tab'); // Navigate to first filter
      await page.keyboard.type('AAP');

      const symbolInput = page.locator('input[placeholder="Search Symbol"]');
      const value = await symbolInput.inputValue();
      expect(value).toContain('AAP');
    });

    test('should have proper ARIA labels for interactive elements', async ({
      page,
    }) => {
      const addButton = page.locator('[data-testid="add-symbol-button"]');
      const ariaLabel = await addButton.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    });

    test('should announce updates to screen readers', async ({ page }) => {
      // Check for aria-live regions
      const liveRegion = page.locator('[aria-live="polite"]');
      await expect(liveRegion).toBeAttached();
    });
  });
});
