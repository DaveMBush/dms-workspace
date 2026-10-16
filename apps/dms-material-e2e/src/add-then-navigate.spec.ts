import { expect, test } from 'playwright/test';
import { login } from './helpers/login.helper';
import { settle } from './helpers/settle.helper';

// Seeded account (tools/create-test-db.js) with universe symbols TESTEQ1/TESTIN1/TESTTF1
const ACCOUNT_UUID = '1677e04f-ef9b-4372-adb3-b740443088dc';

test.describe('Add then navigate (no console errors)', () => {
  let pageErrors: string[];
  let consoleErrors: string[];

  test.beforeEach(async ({ page }) => {
    // Capture uncaught page exceptions and browser console.error events for the
    // whole flow (login → add → navigate). Asserted empty at end of each test.
    pageErrors = [];
    consoleErrors = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await login(page);
  });

  test.afterEach(() => {
    expect(
      pageErrors,
      `Uncaught page errors during flow: ${pageErrors.join(' | ')}`,
    ).toEqual([]);
    expect(
      consoleErrors,
      `console.error events during flow: ${consoleErrors.join(' | ')}`,
    ).toEqual([]);
  });

  test('add position on Open Positions then navigate to Sold Positions', async ({
    page,
  }) => {
    await page.goto(`/account/${ACCOUNT_UUID}/open`);
    await page.waitForLoadState('networkidle');
    await settle(page, 2000); // Give time for universe data to load

    const table = page.locator('[data-testid="open-positions-table"]');
    await expect(table).toBeVisible({ timeout: 10000 });

    // Add a position via the dialog
    await page.locator('[data-testid="add-new-position-button"]').click();
    await expect(page.locator('[data-testid="dialog-title"]')).toBeVisible({
      timeout: 5000,
    });

    const symbolInput = page.locator(
      '[data-testid="symbol-autocomplete"] input',
    );
    await symbolInput.click();
    await symbolInput.fill('TESTEQ1'); // Seeded universe symbol
    await settle(page, 1000); // Give time for autocomplete search to complete
    const firstOption = page.locator('mat-option').first();
    await expect(firstOption).toBeVisible({ timeout: 5000 });
    await firstOption.click();

    await page.locator('[data-testid="quantity-input"]').fill('50');
    await page.locator('[data-testid="price-input"]').fill('123.45');

    const purchaseDateInput = page.locator(
      '[data-testid="purchase-date-input"]',
    );
    await purchaseDateInput.fill('06/01/2025');
    await purchaseDateInput.blur(); // Trigger validation

    const saveButton = page.locator('[data-testid="add-position-button"]');
    await expect(saveButton).toBeEnabled({ timeout: 2000 });
    await saveButton.click();

    // Dialog closes after successful submit
    await expect(page.locator('[data-testid="dialog-title"]')).not.toBeVisible({
      timeout: 10000,
    });

    // Added row is visible in the table before navigating away
    await settle(page, 1000); // Wait for table to update
    const addedRow = page
      .locator('.dms-body-row[role="row"]')
      .filter({ hasText: 'TESTEQ1' })
      .first();
    await expect(addedRow).toBeVisible({ timeout: 10000 });

    // Row survives a full page reload (server round-trip confirmed)
    await page.reload();
    await page.waitForLoadState('networkidle');
    await settle(page, 2000); // Give time for universe data to load
    const reloadedRow = page
      .locator('.dms-body-row[role="row"]')
      .filter({ hasText: 'TESTEQ1' })
      .first();
    await expect(reloadedRow).toBeVisible({ timeout: 10000 });

    // Navigate to Sold Positions — this is where the pre-fix state corruption
    // threw on route change
    await page.locator('[data-testid="account-tab-sold"]').click();
    await expect(page).toHaveURL(/\/sold$/);
    await settle(page, 1500);

    // Target route renders its table normally
    await expect(
      page.getByRole('columnheader', { name: 'Symbol' }),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole('columnheader', { name: 'Sell Date' }),
    ).toBeVisible();
  });

  test('add deposit on Dividend Deposits then navigate to Open Positions', async ({
    page,
    request,
  }) => {
    // Fresh account via API so the div-deposit add has a valid accountId
    const response = await request.post('/api/accounts/add', {
      data: { name: `Test Add Then Navigate ${Date.now()}` },
    });
    if (!response.ok()) {
      throw new Error(`Failed to create test account: ${response.status()}`);
    }
    const accounts = (await response.json()) as Array<{ id: string }>;
    if (!accounts[0]?.id) {
      throw new Error('Created account has no id');
    }

    await page.goto(`/account/${accounts[0].id}/div-dep`);
    await page.waitForLoadState('networkidle');
    await settle(page, 2000); // Give time for universe data to load

    // Add a deposit via the dialog (Deposit type — no symbol required)
    await page.locator('[data-testid="add-new-position-button"]').click();
    await expect(page.locator('dms-div-dep-modal')).toBeVisible({
      timeout: 5000,
    });

    await page.locator('input[formControlName="date"]').fill('07/04/2025');
    await page.locator('input[formControlName="date"]').blur();
    await page
      .locator('mat-select[formControlName="divDepositTypeId"]')
      .click();
    await page
      .locator('mat-option')
      .filter({ hasText: 'Deposit' })
      .first()
      .click();
    await page.locator('input[formControlName="amount"]').fill('678.90');

    const submitBtn = page.locator(
      'mat-dialog-actions button[mat-raised-button]',
    );
    await expect(submitBtn).toBeEnabled({ timeout: 2000 });
    await submitBtn.click();

    // Dialog closes after successful submit
    await expect(page.locator('dms-div-dep-modal')).not.toBeVisible({
      timeout: 5000,
    });

    // Added row is visible in the table before navigating away
    await settle(page, 1000); // Wait for table to update
    const addedRow = page
      .locator('.dms-body-row[role="row"]')
      .filter({ hasText: '$678.90' })
      .first();
    await expect(addedRow).toBeVisible({ timeout: 10000 });

    // Row survives a full page reload (server round-trip confirmed)
    await page.reload();
    await page.waitForLoadState('networkidle');
    await settle(page, 2000); // Give time for table data to load
    const reloadedRow = page
      .locator('.dms-body-row[role="row"]')
      .filter({ hasText: '$678.90' })
      .first();
    await expect(reloadedRow).toBeVisible({ timeout: 10000 });

    // Navigate to Open Positions — this is where the pre-fix state corruption
    // threw on route change
    await page.locator('[data-testid="account-tab-open"]').click();
    await expect(page).toHaveURL(/\/open$/);
    await settle(page, 1500);

    // Target route renders its table normally
    const table = page.locator('[data-testid="open-positions-table"]');
    await expect(table).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole('columnheader', { name: 'Symbol' }),
    ).toBeVisible();
  });
});
