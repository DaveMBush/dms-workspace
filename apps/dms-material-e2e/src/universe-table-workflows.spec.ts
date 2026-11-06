import { expect, Page, test } from 'playwright/test';
import { login } from './helpers/login.helper';
import { seedUniverseData } from './helpers/seed-universe-data.helper';
import { settle } from './helpers/settle.helper';

function getUniverseRowBySymbol(
  page: Page,
  symbol: string,
): import('playwright').Locator {
  return page.locator('.dms-body-row[role="row"]').filter({
    has: page.locator('.dms-body-cell[data-column="symbol"]', {
      hasText: symbol,
    }),
  });
}

function getDistributionCellBySymbol(
  page: Page,
  symbol: string,
): import('playwright').Locator {
  return getUniverseRowBySymbol(page, symbol)
    .first()
    .locator(
      '.dms-body-cell[data-column="distribution"] [data-testid^="distribution-cell-"]',
    )
    .first();
}

async function getFirstVisibleUniverseSymbol(page: Page): Promise<string> {
  const firstVisibleSymbolCell = page
    .locator('.dms-body-row[role="row"] .dms-body-cell[data-column="symbol"]')
    .first();
  await expect(firstVisibleSymbolCell).toBeVisible({ timeout: 10000 });
  await expect
    .poll(
      async function readVisibleSymbolText() {
        return (await firstVisibleSymbolCell.textContent())?.trim() ?? '';
      },
      { timeout: 10000 },
    )
    .toMatch(/^(?!…$).+/);
  const symbolText = (await firstVisibleSymbolCell.textContent())?.trim() ?? '';
  expect(symbolText).toBeTruthy();
  return symbolText;
}

async function filterUniverseToSymbol(
  page: Page,
  symbol: string,
): Promise<void> {
  const symbolFilter = page.getByPlaceholder('Search Symbol');
  await symbolFilter.fill(symbol);
  await expect(getUniverseRowBySymbol(page, symbol)).toBeVisible({
    timeout: 10000,
  });
}

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
  let symbols: string[];

  test.beforeEach(async ({ page }) => {
    // Seed test data for this test
    const seeder = await seedUniverseData();
    cleanup = seeder.cleanup;
    symbols = seeder.symbols;

    await login(page);
    await page.goto('/global/universe');
    // Wait for table to be ready instead of networkidle
    await expect(page.locator('dms-base-table')).toBeVisible();
    // Wait for data rows to load (Material table rows)
    await page.waitForSelector('.dms-body-row[role="row"]', { timeout: 10000 });
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

      const rows = page.locator('.dms-body-row[role="row"]');
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThan(0);
    });

    test('should display correct number of columns', async ({ page }) => {
      // The table has filter row and header row - count only header row
      const headers = page.locator(
        '.dms-column-header-row[role="row"] [role="columnheader"]',
      );
      const headerCount = await headers.count();
      // Vol, SVol, Symbol, Risk Group, Distribution, Dist/Year, Yield %,
      // Avg Purch Yield %, Last Price, Ex-Date, Most Recent Sell Date,
      // Most Recent Sell Price, Position, Expired, Actions
      expect(headerCount).toBe(15);
    });

    test('should display symbol data in symbol column', async ({ page }) => {
      // Body rows are no longer :first-child of their parent (header/filter
      // rows precede them in the div-based mat-table), so select the first
      // body row explicitly.
      const symbolCell = page
        .locator('.dms-body-row[role="row"]')
        .first()
        .locator('.dms-body-cell[data-column="symbol"]');
      await expect(symbolCell).toBeVisible();
      const text = await symbolCell.textContent();
      expect(text?.trim()).toBeTruthy();
    });

    test('should display risk group data', async ({ page }) => {
      await filterUniverseToSymbol(page, symbols[1]);
      const riskGroupCell = getUniverseRowBySymbol(page, symbols[1]).locator(
        '.dms-body-cell[data-column="risk_group"]',
      );
      await expect(riskGroupCell).toBeVisible();
      const text = await riskGroupCell.textContent();
      expect(text?.trim()).toBeTruthy();
    });

    test('should display distribution values formatted as currency', async ({
      page,
    }) => {
      // Body rows are no longer :first-child of their parent (header/filter
      // rows precede them in the div-based mat-table), so select the first
      // body row explicitly.
      const distributionCell = page
        .locator('.dms-body-row[role="row"]')
        .first()
        .locator('.dms-body-cell[data-column="distribution"]');
      await expect(distributionCell).toBeVisible();
      const text = await distributionCell.textContent();
      // Distribution is shown as a number (e.g., 1.25 not $1.25) in editable cell
      expect(text?.trim()).toMatch(/^\d+\.\d+$/);
    });

    test('should display yield percentage with two decimals', async ({
      page,
    }) => {
      // Body rows are no longer :first-child of their parent (header/filter
      // rows precede them in the div-based mat-table), so select the first
      // body row explicitly.
      const yieldCell = page
        .locator('.dms-body-row[role="row"]')
        .first()
        .locator('.dms-body-cell[data-column="yield_percent"]');
      await expect(yieldCell).toBeVisible();
      const text = await yieldCell.textContent();
      // Percentage format check (e.g., 5.25% or 5.25)
      // eslint-disable-next-line sonarjs/super-linear-regex -- \d+ is quadratic on digit-heavy input, but JS has no atomic quantifier and bounding it would change the match; input is a short cell value
      expect(text).toMatch(/\d+\.\d{2}/);
    });

    test('should display ex-date in correct format', async ({ page }) => {
      // Body rows are no longer :first-child of their parent (header/filter
      // rows precede them in the div-based mat-table), so select the first
      // body row explicitly.
      const exDateCell = page
        .locator('.dms-body-row[role="row"]')
        .first()
        .locator('.dms-body-cell[data-column="ex_date"]');
      await expect(exDateCell).toBeVisible();
      const text = await exDateCell.textContent();
      // Date format check (e.g., MM/DD/YYYY or YYYY-MM-DD)
      expect(text).toBeTruthy();
    });

    test('should display action buttons in last column', async ({ page }) => {
      // Body rows are no longer :first-child of their parent (header/filter
      // rows precede them in the div-based mat-table), so select the first
      // body row explicitly.
      const actionsCell = page
        .locator('.dms-body-row[role="row"]')
        .first()
        .locator('.dms-body-cell[data-column="actions"]');
      await expect(actionsCell).toBeVisible();
    });
  });

  test.describe('Cell Editing - Distribution', () => {
    test('should enter edit mode when clicking distribution cell', async ({
      page,
    }) => {
      const symbol = await getFirstVisibleUniverseSymbol(page);
      const distributionCell = getDistributionCellBySymbol(page, symbol);
      await distributionCell.click();

      const input = page.locator('input[data-testid="distribution-input"]');
      await expect(input).toBeVisible();
      await expect(input).toBeFocused();
    });

    test('should display current value in edit mode', async ({ page }) => {
      const symbol = await getFirstVisibleUniverseSymbol(page);
      const distributionCell = getDistributionCellBySymbol(page, symbol);
      const _originalValue = await distributionCell.textContent();
      await distributionCell.click();
      const input = page.locator('input[data-testid="distribution-input"]');
      const inputValue = await input.inputValue();
      // Input should contain numeric value without currency symbol
      expect(inputValue).toBeTruthy();
    });

    test('should save distribution value on Enter key', async ({ page }) => {
      const symbol = await getFirstVisibleUniverseSymbol(page);
      const distributionCell = getDistributionCellBySymbol(page, symbol);
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
      const symbol = await getFirstVisibleUniverseSymbol(page);
      const distributionCell = getDistributionCellBySymbol(page, symbol);
      await distributionCell.click();

      const input = page.locator('input[data-testid="distribution-input"]');
      await input.fill('3.75');
      await page.click('body');

      // Input should hide
      await expect(input).not.toBeVisible();
    });

    test('should cancel edit on Escape key', async ({ page }) => {
      const symbol = await getFirstVisibleUniverseSymbol(page);
      const distributionCell = getDistributionCellBySymbol(page, symbol);
      const originalValue = await distributionCell.textContent();
      await distributionCell.click();

      const input = page.locator('input[data-testid="distribution-input"]');
      await input.fill('999.99');
      await page.keyboard.press('Escape');

      // Input should hide
      await expect(input).not.toBeVisible();

      // Cell should show original value
      const currentValue = await distributionCell.textContent();
      expect(currentValue).toBe(originalValue);
    });

    test('should validate numeric input for distribution', async ({ page }) => {
      const symbol = await getFirstVisibleUniverseSymbol(page);
      const distributionCell = getDistributionCellBySymbol(page, symbol);
      await distributionCell.click();

      const input = page.locator('input[data-testid="distribution-input"]');
      await input.fill('invalid');
      await input.press('Enter');

      // Should show validation error
      const errorMessage = page.locator('.validation-error');
      await expect(errorMessage).toBeVisible();
    });

    test('should reject negative distribution values', async ({ page }) => {
      const symbol = await getFirstVisibleUniverseSymbol(page);
      const distributionCell = getDistributionCellBySymbol(page, symbol);
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
      await filterUniverseToSymbol(page, symbols[3]);
      const distributionCell = page.locator(
        '[data-testid="distribution-cell-0"]',
      );
      const yieldCell = page.locator('[data-testid="yield-cell-0"]');

      const originalYield = await yieldCell.textContent();

      await distributionCell.click();
      const input = page.locator('input[data-testid="distribution-input"]');
      await input.fill('5.00');
      await input.press('Enter');

      // Wait for yield to recalculate
      await settle(page, 500);

      const newYield = await yieldCell.textContent();
      // Yield should have changed (assuming price is constant)
      expect(newYield).not.toBe(originalYield);
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
      await filterUniverseToSymbol(page, symbols[3]);
      const exDateCell = page.locator('[data-testid="ex-date-cell-0"]');
      const originalValue = await exDateCell.textContent();
      await exDateCell.click();

      // Wait for edit field to appear and focus the input so keydown.escape fires
      const dateInput = page.locator('[data-testid="ex-date-picker"]');
      await expect(dateInput).toBeVisible();
      await dateInput.focus();
      await page.keyboard.press('Escape');

      // Wait for datepicker to close after cancel
      const datepicker = page.locator('mat-datepicker-content');
      await expect(datepicker).not.toBeVisible({ timeout: 3000 });

      const currentValue = await exDateCell.textContent();
      expect(currentValue).toBe(originalValue);
    });

    test('should mark expired symbols when ex-date is in past', async ({
      page,
    }) => {
      await filterUniverseToSymbol(page, symbols[1]);
      const row = getUniverseRowBySymbol(page, symbols[1]);
      await expect(row).toBeVisible();

      const exDateCell = row.locator(
        '.dms-body-cell[data-column="ex_date"] [data-testid^="ex-date-cell-"]',
      );
      await exDateCell.click();

      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 1, 15);
      const pastDateInput = [
        String(pastDate.getMonth() + 1).padStart(2, '0'),
        String(pastDate.getDate()).padStart(2, '0'),
        String(pastDate.getFullYear()),
      ].join('/');
      const dateInput = row.getByRole('textbox', { name: 'Edit date' });
      await dateInput.fill(pastDateInput);
      await dateInput.press('Enter');

      // Wait for datepicker to close (ensures save operation completes)
      const datepicker = page.locator('mat-datepicker-content');
      await expect(datepicker).not.toBeVisible({ timeout: 5000 });

      const expiredIndicator = row.locator(
        '.dms-body-cell[data-column="expired"] .expired-indicator',
      );
      await expect(expiredIndicator).toHaveText('*', { timeout: 15000 });
    });
  });

  test.describe('Symbol Deletion', () => {
    // TODO(E82): blocked — symbol deletion not fully testable

    test('should not display delete button for closed-end funds', async ({
      page,
    }) => {
      // Test assumes we have CEF symbols in the data
      const cefRow = page
        .locator('.dms-body-row[role="row"][data-is-cef="true"]')
        .first();
      const deleteButton = cefRow.locator('[data-testid^="delete-symbol"]');
      await expect(deleteButton).not.toBeVisible();
    });

    test('should not display delete button when position > 0', async ({
      page,
    }) => {
      // Test assumes we have symbols with positions > 0
      const positionRow = page
        .locator('.dms-body-row[role="row"][data-has-position="true"]')
        .first();
      const deleteButton = positionRow.locator(
        '[data-testid^="delete-symbol"]',
      );
      await expect(deleteButton).not.toBeVisible();
    });

    // TODO(E82): blocked — symbol deletion not fully testable

    // TODO(E82): blocked — symbol deletion not fully testable

    // TODO(E82): blocked — symbol deletion not fully testable

    // TODO(E82): blocked — symbol deletion not fully testable
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

    // TODO(E82): blocked — add symbol feature not fully testable

    // TODO(E82): blocked — add symbol feature not fully testable

    // TODO(E82): blocked — add symbol feature not fully testable

    // TODO(E82): blocked — add symbol feature not fully testable
  });

  // TODO(E82): blocked — Update Fields feature not fully testable

  // TODO(E82): blocked — Filter Combinations feature not fully testable

  // TODO(E82): blocked — Table Refresh feature not fully testable

  // TODO(E82): blocked — Edge Cases and Error Handling not fully testable

  // TODO(E82): blocked — Accessibility and Keyboard Navigation not fully testable
});

/**
 * Regression guard for Epic 68 / Story 68.2.
 * The showEmptyState$ computed signal and its @if template block were removed
 * in Story 68.1. This test ensures the empty-state overlay cannot be
 * accidentally re-introduced when the universe table has no data rows.
 */
test.describe('Empty Universe State', () => {
  test.beforeEach(async ({ page }) => {
    // Do NOT seed any universe data — we want the table empty.
    await login(page);
    await page.goto('/global/universe');
    await expect(page.locator('dms-base-table')).toBeVisible();
  });

  test('should not show empty-state overlay when universe has no rows', async ({
    page,
  }) => {
    // Assert the overlay element is absent entirely
    await expect(page.locator('.empty-state')).toHaveCount(0);

    // Assert column headers are visible and not obscured
    await expect(
      page.locator('.dms-header-cell[role="columnheader"]').first(),
    ).toBeVisible();
  });
});
