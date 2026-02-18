import { test, expect } from 'playwright/test';

import { login } from './helpers/login.helper';

const ACCOUNT_UUID = '1677e04f-ef9b-4372-adb3-b740443088dc';

test.describe('Open Positions', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    // Navigate to open positions tab
    await page.goto(`/account/${ACCOUNT_UUID}/open`);

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Give time for universe data to load
  });

  test('should display open positions table', async ({ page }) => {
    const table = page.locator('[data-testid="open-positions-table"]');
    await expect(table).toBeVisible({ timeout: 10000 });
  });

  test('should display table columns', async ({ page }) => {
    // Check for specific column headers
    const symbolHeader = page.getByRole('columnheader', { name: 'Symbol' });
    await expect(symbolHeader).toBeVisible();

    const quantityHeader = page.getByRole('columnheader', { name: 'Quantity' });
    await expect(quantityHeader).toBeVisible();

    const buyHeader = page.locator('th.mat-column-buy');
    await expect(buyHeader).toBeVisible();

    const buyDateHeader = page.getByRole('columnheader', { name: 'Buy Date' });
    await expect(buyDateHeader).toBeVisible();

    const sellHeader = page.locator('th.mat-column-sell');
    await expect(sellHeader).toBeVisible();

    const sellDateHeader = page.getByRole('columnheader', {
      name: 'Sell Date',
    });
    await expect(sellDateHeader).toBeVisible();
  });

  test('should display add position button', async ({ page }) => {
    const addButton = page.locator('[data-testid="add-new-position-button"]');
    await expect(addButton).toBeVisible({ timeout: 10000 });
  });

  test('should open add position dialog when add button clicked', async ({
    page,
  }) => {
    const addButton = page.locator('[data-testid="add-new-position-button"]');
    await addButton.click();

    const dialogTitle = page.locator('[data-testid="dialog-title"]');
    await expect(dialogTitle).toBeVisible({ timeout: 5000 });
    await expect(dialogTitle).toHaveText('Add New Position');
  });

  test.skip('should add new position via dialog', async ({ page }) => {
    // SKIPPED: This test requires universe data to be loaded in the test database.
    // The symbol autocomplete needs universe data to show options. Need to add test data seeding.
    // See apps/server/prisma/seed.ts for data setup.
    // Get initial row count
    const table = page.locator('dms-base-table');
    const initialRows = await table.locator('.mat-mdc-row').count();

    // Open add position dialog
    const addButton = page.locator('[data-testid="add-new-position-button"]');
    await addButton.click();

    // Wait for dialog to be visible
    const dialogTitle = page.locator('[data-testid="dialog-title"]');
    await expect(dialogTitle).toBeVisible();

    // Fill in the form - type partial symbol to get autocomplete results
    const symbolInput = page.locator(
      '[data-testid="symbol-autocomplete"] input'
    );
    await symbolInput.click();
    await symbolInput.fill('AA'); // Type partial symbol to trigger autocomplete

    // Wait for and click first option from autocomplete
    await page.waitForTimeout(1000); // Give time for search to complete
    const firstOption = page.locator('mat-option').first();
    await expect(firstOption).toBeVisible({ timeout: 5000 });
    await firstOption.click();

    await page.waitForTimeout(500);

    const quantityInput = page.locator('[data-testid="quantity-input"]');
    await quantityInput.fill('100');

    const priceInput = page.locator('[data-testid="price-input"]');
    await priceInput.fill('150.50');

    // Type date directly into the input
    const purchaseDateInput = page.locator(
      '[data-testid="purchase-date-input"]'
    );
    await purchaseDateInput.fill('1/15/2024');
    await purchaseDateInput.blur(); // Trigger validation

    await page.waitForTimeout(500);

    // Submit the form - wait for button to be enabled
    const saveButton = page.locator('[data-testid="add-position-button"]');
    await expect(saveButton).toBeEnabled({ timeout: 2000 });
    await saveButton.click();

    // Wait for dialog to close
    await expect(dialogTitle).not.toBeVisible({ timeout: 10000 });

    // Verify row count increased
    await page.waitForTimeout(1000); // Wait for table to update
    const newRows = await table.locator('.mat-mdc-row').count();
    expect(newRows).toBeGreaterThan(initialRows);
  });

  test('should validate required fields in add position dialog', async ({
    page,
  }) => {
    // Open add position dialog
    const addButton = page.locator('[data-testid="add-new-position-button"]');
    await addButton.click();

    // Try to submit without filling fields
    const saveButton = page.locator('[data-testid="add-position-button"]');
    // Button should be disabled
    await expect(saveButton).toBeDisabled();

    // Fill only symbol and quantity
    const symbolInput = page.locator(
      '[data-testid="symbol-autocomplete"] input'
    );
    await symbolInput.fill('AAPL');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');

    const quantityInput = page.locator('[data-testid="quantity-input"]');
    await quantityInput.fill('100');

    // Button should still be disabled (price and date missing)
    await expect(saveButton).toBeDisabled();
  });

  test('should validate quantity must be at least 1', async ({ page }) => {
    // Open add position dialog
    const addButton = page.locator('[data-testid="add-new-position-button"]');
    await addButton.click();

    const quantityInput = page.locator('[data-testid="quantity-input"]');
    await quantityInput.fill('0');
    await quantityInput.blur();

    // Check for validation error
    const error = page.locator('[data-testid="quantity-min-error"]');
    await expect(error).toBeVisible({ timeout: 3000 });
  });

  test('should filter non-digit characters from quantity input', async ({
    page,
  }) => {
    // Open add position dialog
    const addButton = page.locator('[data-testid="add-new-position-button"]');
    await addButton.click();

    // Try to enter a decimal - it should be filtered out by the input handler
    const quantityInput = page.locator('[data-testid="quantity-input"]');
    await quantityInput.click();
    await quantityInput.fill('10.5abc');
    const value = await quantityInput.inputValue();
    expect(value).toBe('105');
  });

  test('should filter negative sign from price input', async ({ page }) => {
    // Open add position dialog
    const addButton = page.locator('[data-testid="add-new-position-button"]');
    await addButton.click();

    // Try to enter a negative price - the minus sign should be filtered out
    const priceInput = page.locator('[data-testid="price-input"]');
    await priceInput.click();
    await priceInput.fill('-10');

    // The input handler should remove the minus, resulting in "10"
    const value = await priceInput.inputValue();
    expect(value).toBe('10');
  });

  test('should cancel add position dialog', async ({ page }) => {
    // Open add position dialog
    const addButton = page.locator('[data-testid="add-new-position-button"]');
    await addButton.click();

    // Fill some fields
    const quantityInput = page.locator('[data-testid="quantity-input"]');
    await quantityInput.fill('100');

    // Click cancel
    const cancelButton = page.locator('[data-testid="cancel-button"]');
    await cancelButton.click();

    // Dialog should be closed
    const dialogTitle = page.locator('[data-testid="dialog-title"]');
    await expect(dialogTitle).not.toBeVisible();
  });

  test.skip('should edit quantity inline', async ({ page }) => {
    // SKIPPED: Requires universe data in test database. Need to add test data seeding.
    // First, add a position so we have something to edit
    const addButton = page.locator('[data-testid="add-new-position-button"]');
    await addButton.click();

    const symbolInput = page.locator(
      '[data-testid="symbol-autocomplete"] input'
    );
    await symbolInput.fill('MSFT');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');

    await page.locator('[data-testid="quantity-input"]').fill('50');
    await page.locator('[data-testid="price-input"]').fill('200.00');

    const purchaseDateInput = page.locator(
      '[data-testid="purchase-date-input"]'
    );
    await purchaseDateInput.click();
    await purchaseDateInput.fill('01/15/2024');
    await purchaseDateInput.press('Enter');
    await page.waitForTimeout(300);

    const saveButton = page.locator('[data-testid="add-position-button"]');
    await expect(saveButton).toBeEnabled({ timeout: 2000 });
    await saveButton.click();

    const dialogTitle = page.locator('[data-testid="dialog-title"]');
    await expect(dialogTitle).not.toBeVisible({ timeout: 10000 });

    // Now test inline editing
    const table = page.locator('dms-base-table');
    await table.waitFor({ state: 'visible', timeout: 10000 });

    // Get the first editable quantity cell
    const quantityCell = page
      .locator('[data-testid="editable-quantity"]')
      .first();
    await quantityCell.waitFor({ state: 'visible', timeout: 5000 });

    // Get original value
    const originalValue = await quantityCell.textContent();

    // Click to edit
    await quantityCell.click();

    // Wait for input to appear
    const input = page
      .locator('[data-testid="editable-quantity-input"]')
      .first();
    await input.waitFor({ state: 'visible', timeout: 5000 });

    // Clear and enter new value
    await input.fill('999');
    await page.keyboard.press('Enter');

    // Wait for save
    await page.waitForTimeout(1000);

    // Verify value changed
    const newValue = await quantityCell.textContent();
    expect(newValue).not.toBe(originalValue);
    expect(newValue).toContain('999');
  });

  test.skip('should edit buy price inline', async ({ page }) => {
    // SKIPPED: Requires universe data in test database. Need to add test data seeding.
    // First, add a position so we have something to edit
    const addButton = page.locator('[data-testid="add-new-position-button"]');
    await addButton.click();

    const symbolInput = page.locator(
      '[data-testid="symbol-autocomplete"] input'
    );
    await symbolInput.fill('TSLA');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');

    await page.locator('[data-testid="quantity-input"]').fill('25');
    await page.locator('[data-testid="price-input"]').fill('300.00');

    const purchaseDateInput = page.locator(
      '[data-testid="purchase-date-input"]'
    );
    await purchaseDateInput.click();
    await purchaseDateInput.fill('01/15/2024');
    await purchaseDateInput.press('Enter');
    await page.waitForTimeout(300);

    const saveButton = page.locator('[data-testid="add-position-button"]');
    await expect(saveButton).toBeEnabled({ timeout: 2000 });
    await saveButton.click();

    const dialogTitle = page.locator('[data-testid="dialog-title"]');
    await expect(dialogTitle).not.toBeVisible({ timeout: 10000 });

    // Now test inline editing
    const table = page.locator('dms-base-table');
    await table.waitFor({ state: 'visible', timeout: 10000 });

    // Get the first editable buy price cell
    const buyPriceCell = page
      .locator('[data-testid="editable-buy-price"]')
      .first();
    await buyPriceCell.waitFor({ state: 'visible', timeout: 5000 });

    // Click to edit
    await buyPriceCell.click();

    // Wait for input to appear
    const input = page
      .locator('[data-testid="editable-buy-price-input"]')
      .first();
    await input.waitFor({ state: 'visible', timeout: 5000 });

    // Enter new value
    await input.fill('123.45');
    await page.keyboard.press('Enter');

    // Wait for save
    await page.waitForTimeout(1000);

    // Verify value changed
    const newValue = await buyPriceCell.textContent();
    expect(newValue).toContain('123.45');
  });

  test.skip('should edit buy date inline', async ({ page }) => {
    // SKIPPED: Requires universe data in test database. Need to add test data seeding.
    // First, add a position so we have something to edit
    const addButton = page.locator('[data-testid="add-new-position-button"]');
    await addButton.click();

    const symbolInput = page.locator(
      '[data-testid="symbol-autocomplete"] input'
    );
    await symbolInput.fill('GOOGL');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');

    await page.locator('[data-testid="quantity-input"]').fill('15');
    await page.locator('[data-testid="price-input"]').fill('120.00');

    const purchaseDateInput = page.locator(
      '[data-testid="purchase-date-input"]'
    );
    await purchaseDateInput.click();
    await purchaseDateInput.fill('01/15/2024');
    await purchaseDateInput.press('Enter');
    await page.waitForTimeout(300);

    const saveButton = page.locator('[data-testid="add-position-button"]');
    await expect(saveButton).toBeEnabled({ timeout: 2000 });
    await saveButton.click();

    const dialogTitle = page.locator('[data-testid="dialog-title"]');
    await expect(dialogTitle).not.toBeVisible({ timeout: 10000 });

    // Now test inline editing
    const table = page.locator('dms-base-table');
    await table.waitFor({ state: 'visible', timeout: 10000 });

    // Get the first editable buy date cell
    const buyDateCell = page
      .locator('[data-testid="editable-buy-date"]')
      .first();
    await buyDateCell.waitFor({ state: 'visible', timeout: 5000 });

    // Click to edit
    await buyDateCell.click();

    // Wait for datepicker input to appear
    const input = page
      .locator('[data-testid="editable-buy-date-picker"]')
      .first();
    await input.waitFor({ state: 'visible', timeout: 5000 });

    // Enter new date
    await input.fill('02/14/2024');
    await page.keyboard.press('Enter');

    // Wait for save
    await page.waitForTimeout(1000);

    // Verify date changed
    const newValue = await buyDateCell.textContent();
    expect(newValue).toContain('2/14/24');
  });

  test.skip('should cancel inline edit with escape key', async ({ page }) => {
    // SKIPPED: Requires universe data in test database. Need to add test data seeding.
    // First, add a position so we have something to edit
    const addButton = page.locator('[data-testid="add-new-position-button"]');
    await addButton.click();

    const symbolInput = page.locator(
      '[data-testid="symbol-autocomplete"] input'
    );
    await symbolInput.fill('AMZN');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');

    await page.locator('[data-testid="quantity-input"]').fill('30');
    await page.locator('[data-testid="price-input"]').fill('140.00');

    const purchaseDateInput = page.locator(
      '[data-testid="purchase-date-input"]'
    );
    await purchaseDateInput.click();
    await purchaseDateInput.fill('01/15/2024');
    await purchaseDateInput.press('Enter');
    await page.waitForTimeout(300);

    const saveButton = page.locator('[data-testid="add-position-button"]');
    await expect(saveButton).toBeEnabled({ timeout: 2000 });
    await saveButton.click();

    const dialogTitle = page.locator('[data-testid="dialog-title"]');
    await expect(dialogTitle).not.toBeVisible({ timeout: 10000 });

    // Now test canceling inline edit
    const table = page.locator('dms-base-table');
    await table.waitFor({ state: 'visible', timeout: 10000 });

    // Get the first editable quantity cell
    const quantityCell = page
      .locator('[data-testid="editable-quantity"]')
      .first();
    await quantityCell.waitFor({ state: 'visible', timeout: 5000 });

    // Get original value
    const originalValue = await quantityCell.textContent();

    // Click to edit
    await quantityCell.click();

    // Wait for input to appear
    const input = page
      .locator('[data-testid="editable-quantity-input"]')
      .first();
    await input.waitFor({ state: 'visible', timeout: 5000 });

    // Enter new value but press escape
    await input.fill('999');
    await page.keyboard.press('Escape');

    // Wait for cancel
    await page.waitForTimeout(500);

    // Verify value didn't change
    const newValue = await quantityCell.textContent();
    expect(newValue).toBe(originalValue);
  });

  test.skip('should filter positions by symbol', async ({ page }) => {
    // SKIPPED: Requires universe data in test database. Need to add test data seeding.
    // First, add two different positions
    // Add AAPL
    let addButton = page.locator('[data-testid="add-new-position-button"]');
    await addButton.click();
    let symbolInput = page.locator('[data-testid="symbol-autocomplete"] input');
    await symbolInput.fill('AAPL');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.locator('[data-testid="quantity-input"]').fill('10');
    await page.locator('[data-testid="price-input"]').fill('150.00');
    let purchaseDateInput = page.locator('[data-testid="purchase-date-input"]');
    await purchaseDateInput.click();
    await purchaseDateInput.fill('01/15/2024');
    await purchaseDateInput.press('Enter');
    await page.waitForTimeout(300);
    let saveButton = page.locator('[data-testid="add-position-button"]');
    await expect(saveButton).toBeEnabled({ timeout: 2000 });
    await saveButton.click();
    let dialogTitle = page.locator('[data-testid="dialog-title"]');
    await expect(dialogTitle).not.toBeVisible({ timeout: 10000 });

    // Add MSFT
    addButton = page.locator('[data-testid="add-new-position-button"]');
    await addButton.click();
    symbolInput = page.locator('[data-testid="symbol-autocomplete"] input');
    await symbolInput.fill('MSFT');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.locator('[data-testid="quantity-input"]').fill('20');
    await page.locator('[data-testid="price-input"]').fill('200.00');
    purchaseDateInput = page.locator('[data-testid="purchase-date-input"]');
    await purchaseDateInput.click();
    await purchaseDateInput.fill('01/15/2024');
    await purchaseDateInput.press('Enter');
    await page.waitForTimeout(300);
    saveButton = page.locator('[data-testid="add-position-button"]');
    await expect(saveButton).toBeEnabled({ timeout: 2000 });
    await saveButton.click();
    dialogTitle = page.locator('[data-testid="dialog-title"]');
    await expect(dialogTitle).not.toBeVisible({ timeout: 10000 });

    // Now test filtering
    await page.waitForTimeout(2000);

    // Get initial row count
    const table = page.locator('dms-base-table');
    const initialRows = await table.locator('.mat-mdc-row').count();

    // Type in symbol search
    const searchInput = page.locator('[data-testid="symbol-search-input"]');
    await searchInput.fill('A');

    // Wait for filter to apply
    await page.waitForTimeout(1000);

    // Get filtered row count
    const filteredRows = await table.locator('.mat-mdc-row').count();

    // Filtered count should be less than or equal to initial count
    expect(filteredRows).toBeLessThanOrEqual(initialRows);

    // If there are rows, they should contain 'A'
    if (filteredRows > 0) {
      const firstSymbol = await table
        .locator('.mat-mdc-row')
        .first()
        .locator('td')
        .first()
        .textContent();
      expect(firstSymbol?.toUpperCase()).toContain('A');
    }
  });

  test.skip('should delete position', async ({ page }) => {
    // SKIPPED: Requires universe data in test database. Need to add test data seeding.
    // First, add a position so we have something to delete
    const addButton = page.locator('[data-testid="add-new-position-button"]');
    await addButton.click();

    const symbolInput = page.locator(
      '[data-testid="symbol-autocomplete"] input'
    );
    await symbolInput.fill('NFLX');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');

    await page.locator('[data-testid="quantity-input"]').fill('40');
    await page.locator('[data-testid="price-input"]').fill('250.00');

    const purchaseDateInput = page.locator(
      '[data-testid="purchase-date-input"]'
    );
    await purchaseDateInput.click();
    await purchaseDateInput.fill('01/15/2024');
    await purchaseDateInput.press('Enter');
    await page.waitForTimeout(300);

    const saveButton = page.locator('[data-testid="add-position-button"]');
    await expect(saveButton).toBeEnabled({ timeout: 2000 });
    await saveButton.click();

    const dialogTitle = page.locator('[data-testid="dialog-title"]');
    await expect(dialogTitle).not.toBeVisible({ timeout: 10000 });

    // Now test deletion
    const table = page.locator('dms-base-table');
    await table.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(2000);

    // Get initial row count
    const initialRows = await table.locator('.mat-mdc-row').count();

    // Click delete button on first row
    const deleteButton = page
      .locator('[data-testid="delete-position-button"]')
      .first();
    await deleteButton.click();

    // Wait for deletion
    await page.waitForTimeout(1000);

    // Verify row count decreased
    const newRows = await table.locator('.mat-mdc-row').count();
    expect(newRows).toBe(initialRows - 1);
  });

  test('should display table structure with column headers', async ({
    page,
  }) => {
    // Verify table structure exists
    const table = page.locator('[data-testid="open-positions-table"]');
    await expect(table).toBeVisible({ timeout: 10000 });

    // Verify column headers are present
    await expect(
      page.getByRole('columnheader', { name: 'Symbol' })
    ).toBeVisible();
  });

  test('should navigate to open positions tab from account summary', async ({
    page,
  }) => {
    // Navigate to account base (summary tab)
    await page.goto(`/account/${ACCOUNT_UUID}`);

    // Click on Open Positions tab
    const openTab = page.getByRole('tab', { name: 'Open Positions' });
    await openTab.click();

    // Verify navigation
    await expect(page).toHaveURL(/\/open$/);

    // Verify table loads
    const table = page.locator('[data-testid="open-positions-table"]');
    await expect(table).toBeVisible({ timeout: 10000 });
  });
});
