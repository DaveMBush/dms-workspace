import { expect, Page, test } from 'playwright/test';

import { login } from './helpers/login.helper';

// Account UUID is set in beforeAll by creating a fresh test account via API
let testAccountId = '';
function getDivDepUrl(): string {
  return `/account/${testAccountId}/div-dep`;
}

async function navigateToDivDep(page: Page): Promise<void> {
  await page.goto(getDivDepUrl());
  await page.waitForLoadState('networkidle');
}

async function openAddDialog(page: Page): Promise<void> {
  const addButton = page.locator('[data-testid="add-new-position-button"]');
  await addButton.click();
  await expect(page.locator('dms-div-dep-modal')).toBeVisible({
    timeout: 5000,
  });
}

/**
 * Fill and submit a Deposit-type entry (no symbol required).
 * Uses "Deposit" type so the symbol field is not required.
 * After submit, reloads the page to clear SmartNgRX's in-memory cache and
 * force a fresh server fetch so the newly-persisted row is guaranteed to appear.
 * Auth cookies persist across reload so re-login is not needed.
 */
async function addDeposit(
  page: Page,
  date = '01/15/2025',
  amount = '75.50'
): Promise<void> {
  await openAddDialog(page);
  await page.locator('input[formControlName="date"]').fill(date);
  await page.locator('input[formControlName="date"]').blur();
  await page.locator('mat-select[formControlName="divDepositTypeId"]').click();
  await page
    .locator('mat-option')
    .filter({ hasText: 'Deposit' })
    .first()
    .click();
  await page.locator('input[formControlName="amount"]').fill(amount);
  const submitBtn = page.locator(
    'mat-dialog-actions button[mat-raised-button]'
  );
  await submitBtn.click();
  await expect(page.locator('dms-div-dep-modal')).not.toBeVisible({
    timeout: 5000,
  });
  // Reload the page to clear SmartNgRX's in-memory cache and force a fresh
  // server fetch. This ensures the persisted row is visible in the table.
  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(
    page
      .locator('tr[mat-row]')
      .filter({ hasText: `$${amount}` })
      .first()
  ).toBeVisible({ timeout: 10000 });
}

test.describe('Dividend Deposits', () => {
  test.beforeAll(async ({ request }) => {
    // Create a fresh test account via API so div-deposit CRUD operations have a valid accountId.
    // Uses a relative URL so Playwright's configured baseURL is respected.
    const response = await request.post('/api/accounts/add', {
      data: { name: `Test Div Deposits ${Date.now()}` },
    });
    if (!response.ok()) {
      throw new Error(`Failed to create test account: ${response.status()}`);
    }
    const accounts = (await response.json()) as Array<{ id: string }>;
    if (!accounts[0]?.id) {
      throw new Error('Created account has no id');
    }
    testAccountId = accounts[0].id;
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToDivDep(page);
  });

  // ─── Table Display ──────────────────────────────────────────────────────────

  test.describe('Table Display', () => {
    test('should display correct column headers', async ({ page }) => {
      await expect(
        page.getByRole('columnheader', { name: 'Symbol' })
      ).toBeVisible({ timeout: 5000 });
      await expect(
        page.getByRole('columnheader', { name: 'Date' })
      ).toBeVisible();
      await expect(
        page.getByRole('columnheader', { name: 'Amount' })
      ).toBeVisible();
      await expect(
        page.getByRole('columnheader', { name: 'Type' })
      ).toBeVisible();
    });

    test('should display Add Dividend Deposit button on div-dep tab', async ({
      page,
    }) => {
      const addButton = page.locator('[data-testid="add-new-position-button"]');
      await expect(addButton).toBeVisible({ timeout: 5000 });
    });
  });

  // ─── Add Dialog ─────────────────────────────────────────────────────────────

  test.describe('Add Dialog', () => {
    test('should open add dialog when + button clicked', async ({ page }) => {
      await openAddDialog(page);
      await expect(
        page.locator('h2').filter({ hasText: 'New Dividend or Deposit' })
      ).toBeVisible();
    });

    test('should show all required form fields in add dialog', async ({
      page,
    }) => {
      await openAddDialog(page);
      await expect(
        page.locator('mat-label').filter({ hasText: 'Symbol' })
      ).toBeVisible();
      await expect(
        page.locator('mat-label').filter({ hasText: 'Date' })
      ).toBeVisible();
      await expect(
        page.locator('mat-label').filter({ hasText: 'Amount' })
      ).toBeVisible();
      await expect(
        page.locator('mat-label').filter({ hasText: 'Type' })
      ).toBeVisible();
      // Add mode shows autocomplete input (not a readonly symbol input)
      await expect(page.locator('[data-testid="symbol-input"]')).toBeVisible();
    });

    test('should close dialog when Cancel clicked', async ({ page }) => {
      await openAddDialog(page);
      await page
        .locator('mat-dialog-actions button')
        .filter({ hasText: 'Cancel' })
        .click();
      await expect(page.locator('dms-div-dep-modal')).not.toBeVisible({
        timeout: 5000,
      });
    });

    test('should show date validation error when date field is blurred empty', async ({
      page,
    }) => {
      await openAddDialog(page);
      await page.locator('input[formControlName="date"]').click();
      await page.locator('input[formControlName="date"]').blur();
      await expect(
        page.locator('mat-error').filter({ hasText: 'Date is required' })
      ).toBeVisible({ timeout: 3000 });
    });

    test('should show symbol validation error when symbol field is blurred empty', async ({
      page,
    }) => {
      await openAddDialog(page);
      // Explicitly select a type that requires a symbol so the test does not
      // rely on the form's default empty-string state
      await page
        .locator('mat-select[formControlName="divDepositTypeId"]')
        .click();
      await page
        .locator('mat-option')
        .filter({ hasText: 'Dividend' })
        .first()
        .click();
      // Blur the symbol autocomplete input without entering a value
      await page.locator('[data-testid="symbol-input"]').click();
      await page.locator('[data-testid="symbol-input"]').blur();
      await expect(
        page
          .locator('.validation-error')
          .filter({ hasText: 'Symbol is required' })
      ).toBeVisible({ timeout: 3000 });
    });

    test('should not require symbol when type is Deposit', async ({ page }) => {
      await openAddDialog(page);
      await page
        .locator('mat-select[formControlName="divDepositTypeId"]')
        .click();
      await page
        .locator('mat-option')
        .filter({ hasText: 'Deposit' })
        .first()
        .click();
      // Blur the symbol input — should NOT show "Symbol is required"
      await page.locator('[data-testid="symbol-input"]').click();
      await page.locator('[data-testid="symbol-input"]').blur();
      await expect(
        page
          .locator('.validation-error')
          .filter({ hasText: 'Symbol is required' })
      ).not.toBeVisible({ timeout: 2000 });
    });

    test('should successfully add a deposit (Deposit type, no symbol)', async ({
      page,
    }) => {
      await openAddDialog(page);
      await page.locator('input[formControlName="date"]').fill('03/20/2025');
      await page.locator('input[formControlName="date"]').blur();
      await page
        .locator('mat-select[formControlName="divDepositTypeId"]')
        .click();
      await page
        .locator('mat-option')
        .filter({ hasText: 'Deposit' })
        .first()
        .click();
      await page.locator('input[formControlName="amount"]').fill('123.45');
      const submitBtn = page.locator(
        'mat-dialog-actions button[mat-raised-button]'
      );
      await expect(submitBtn).toBeEnabled();
      await submitBtn.click();
      // Dialog should close after successful submission
      await expect(page.locator('dms-div-dep-modal')).not.toBeVisible({
        timeout: 5000,
      });
    });
  });

  // ─── Edit Dialog ─────────────────────────────────────────────────────────────

  test.describe('Edit Dialog', () => {
    test('should open edit dialog when a row is clicked', async ({ page }) => {
      await addDeposit(page, '06/10/2025', '55.00');
      // Click the amount cell of the row (avoiding the delete button)
      const row = page
        .locator('tr[mat-row]')
        .filter({ hasText: '$55.00' })
        .first();
      await row.locator('.mat-column-amount').click();
      await expect(page.locator('dms-div-dep-modal')).toBeVisible({
        timeout: 5000,
      });
      await expect(
        page.locator('h2').filter({ hasText: 'Edit Dividend or Deposit' })
      ).toBeVisible();
    });

    test('edit dialog should be pre-populated with row data', async ({
      page,
    }) => {
      await addDeposit(page, '07/04/2025', '88.88');
      const row = page
        .locator('tr[mat-row]')
        .filter({ hasText: '$88.88' })
        .first();
      await row.locator('.mat-column-amount').click();
      await expect(page.locator('dms-div-dep-modal')).toBeVisible({
        timeout: 5000,
      });
      // Edit mode shows readonly symbol input
      await expect(
        page.locator('input[formControlName="symbol"]')
      ).toBeVisible();
      // Amount should be pre-populated
      const amountInput = page.locator('input[formControlName="amount"]');
      await expect(amountInput).toHaveValue('88.88');
    });

    test('should cancel edit dialog without making changes', async ({
      page,
    }) => {
      await addDeposit(page, '08/15/2025', '22.22');
      const row = page
        .locator('tr[mat-row]')
        .filter({ hasText: '$22.22' })
        .first();
      await row.locator('.mat-column-amount').click();
      await expect(page.locator('dms-div-dep-modal')).toBeVisible({
        timeout: 5000,
      });
      await page
        .locator('mat-dialog-actions button')
        .filter({ hasText: 'Cancel' })
        .click();
      await expect(page.locator('dms-div-dep-modal')).not.toBeVisible({
        timeout: 5000,
      });
      // Row should still exist with original amount
      await expect(
        page.locator('tr[mat-row]').filter({ hasText: '$22.22' }).first()
      ).toBeVisible();
    });

    test('should successfully update a deposit', async ({ page }) => {
      await addDeposit(page, '09/01/2025', '33.33');
      const row = page
        .locator('tr[mat-row]')
        .filter({ hasText: '$33.33' })
        .first();
      await row.locator('.mat-column-amount').click();
      await expect(page.locator('dms-div-dep-modal')).toBeVisible({
        timeout: 5000,
      });
      const amountInput = page.locator('input[formControlName="amount"]');
      await amountInput.fill('99.99');
      const submitBtn = page.locator(
        'mat-dialog-actions button[mat-raised-button]'
      );
      await expect(submitBtn).toBeEnabled();
      await submitBtn.click();
      // Dialog should close
      await expect(page.locator('dms-div-dep-modal')).not.toBeVisible({
        timeout: 5000,
      });
      // Success notification should appear
      await expect(
        page
          .locator('.mat-mdc-snack-bar-label')
          .filter({ hasText: 'Dividend updated successfully' })
          .first()
      ).toBeVisible({ timeout: 5000 });
    });
  });

  // ─── Delete ──────────────────────────────────────────────────────────────────

  test.describe('Delete', () => {
    test('should display a delete button for each row', async ({ page }) => {
      await addDeposit(page, '10/10/2025', '11.11');
      const deleteBtn = page
        .locator('tr[mat-row]')
        .filter({ hasText: '$11.11' })
        .first()
        .locator('[data-testid="delete-dividend-button"]');
      await expect(deleteBtn).toBeVisible({ timeout: 5000 });
    });

    test('should show confirmation dialog when delete button clicked', async ({
      page,
    }) => {
      await addDeposit(page, '11/11/2025', '44.44');
      const row = page
        .locator('tr[mat-row]')
        .filter({ hasText: '$44.44' })
        .first();
      await row.locator('[data-testid="delete-dividend-button"]').click();
      await expect(
        page.locator('h2').filter({ hasText: 'Delete Dividend' })
      ).toBeVisible({ timeout: 5000 });
      await expect(
        page
          .locator('mat-dialog-content p')
          .filter({ hasText: 'Are you sure you want to delete this dividend?' })
      ).toBeVisible();
    });

    test('should cancel delete when Cancel is clicked in confirmation', async ({
      page,
    }) => {
      await addDeposit(page, '12/12/2025', '66.66');
      const row = page
        .locator('tr[mat-row]')
        .filter({ hasText: '$66.66' })
        .first();
      await row.locator('[data-testid="delete-dividend-button"]').click();
      await expect(
        page.locator('h2').filter({ hasText: 'Delete Dividend' })
      ).toBeVisible({ timeout: 5000 });
      // Click Cancel in confirm dialog
      await page
        .locator('mat-dialog-actions button')
        .filter({ hasText: 'Cancel' })
        .click();
      // Confirm dialog should close
      await expect(
        page.locator('h2').filter({ hasText: 'Delete Dividend' })
      ).not.toBeVisible({ timeout: 3000 });
      // Row should still be in the table
      await expect(
        page.locator('tr[mat-row]').filter({ hasText: '$66.66' }).first()
      ).toBeVisible();
    });

    test('should successfully delete a deposit', async ({ page }) => {
      await addDeposit(page, '05/05/2025', '77.77');
      const row = page
        .locator('tr[mat-row]')
        .filter({ hasText: '$77.77' })
        .first();
      await row.locator('[data-testid="delete-dividend-button"]').click();
      await expect(
        page.locator('h2').filter({ hasText: 'Delete Dividend' })
      ).toBeVisible({ timeout: 5000 });
      // Click Delete to confirm
      await page
        .locator('mat-dialog-actions button[mat-raised-button]')
        .click();
      // Success notification should appear
      await expect(
        page
          .locator('.mat-mdc-snack-bar-label')
          .filter({ hasText: 'Dividend deleted' })
          .first()
      ).toBeVisible({ timeout: 5000 });
      // Row should no longer be visible
      await page.waitForTimeout(1000);
      await expect(
        page.locator('tr[mat-row]').filter({ hasText: '$77.77' })
      ).toHaveCount(0);
    });
  });
});
