import { expect, test } from 'playwright/test';
import { login } from './helpers/login.helper';
import { settle } from './helpers/settle.helper';

const ACCOUNT_UUID = '1677e04f-ef9b-4372-adb3-b740443088dc';

test.describe('Open Positions', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    // Navigate to open positions tab
    await page.goto(`/account/${ACCOUNT_UUID}/open`);

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    await settle(page, 2000); // Give time for universe data to load
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

    const buyHeader = page.locator('.dms-header-cell[data-column="buy"]');
    await expect(buyHeader).toBeVisible();

    const buyDateHeader = page.getByRole('columnheader', { name: 'Buy Date' });
    await expect(buyDateHeader).toBeVisible();

    const sellHeader = page.locator('.dms-header-cell[data-column="sell"]');
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

  // TODO(E82): blocked — requires universe data seeding in test database

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
      '[data-testid="symbol-autocomplete"] input',
    );
    await symbolInput.fill('AAPL');
    await settle(page, 500);
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

  // TODO(E82): blocked — requires universe data seeding in test database

  // TODO(E82): blocked — requires universe data seeding in test database

  // TODO(E82): blocked — requires universe data seeding in test database

  // TODO(E82): blocked — requires universe data seeding in test database

  // TODO(E82): blocked — requires universe data seeding in test database

  // TODO(E82): blocked — requires universe data seeding in test database

  test('should display table structure with column headers', async ({
    page,
  }) => {
    // Verify table structure exists
    const table = page.locator('[data-testid="open-positions-table"]');
    await expect(table).toBeVisible({ timeout: 10000 });

    // Verify column headers are present
    await expect(
      page.getByRole('columnheader', { name: 'Symbol' }),
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
