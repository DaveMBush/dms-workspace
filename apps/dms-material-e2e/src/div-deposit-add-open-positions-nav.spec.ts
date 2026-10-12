import { expect, test } from 'playwright/test';
import { login } from './helpers/login.helper';
import { seedOpenPositionsE2eData } from './helpers/seed-open-positions-e2e-data.helper';
import { settle } from './helpers/settle.helper';
import { initializePrismaClient } from './helpers/shared-prisma-client.helper';

/**
 * Regression: adding a dividend deposit then navigating (in-app, NO page reload)
 * to the Open Positions tab must not throw.
 *
 * Root cause (fixed in smart-core): SmartArray.add()/addToStore() rewrote the
 * parent account's virtual array contents as { indexes, length } — dropping the
 * `startIndex` field. Navigating to a sibling screen re-evaluated a computed
 * signal that read `.startIndex` off an undefined object:
 *   TypeError: Cannot read properties of undefined (reading 'startIndex')
 *
 * The existing dividend-deposits-modal.spec.ts masks this by calling page.reload()
 * after submit, which clears the corrupted in-memory state. This spec deliberately
 * does NOT reload — it clicks the "Open Positions" tab (routerLink SPA nav) to hit
 * the exact crash path reported: add div deposit → click open positions tab.
 */
test.describe('Div-deposit add → Open Positions navigation (no reload)', () => {
  let seeder: Awaited<ReturnType<typeof seedOpenPositionsE2eData>>;

  test.beforeAll(async () => {
    // Seed an account with real open trades so the target screen has data.
    seeder = await seedOpenPositionsE2eData();
  });

  test.afterAll(async () => {
    // The test adds a div-deposit via the UI, which seedOpenPositionsE2eData's
    // cleanup does not know about. Delete it first or the account delete in the
    // seeder cleanup fails with an FK violation.
    const prisma = await initializePrismaClient();
    try {
      await prisma.divDeposits.deleteMany({
        where: { accountId: seeder.accountId },
      });
    } finally {
      await prisma.$disconnect();
    }
    await seeder.cleanup();
  });

  test('navigating to Open Positions after adding a div-deposit does not throw', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await login(page);
    // Start on the Dividend Deposits tab of the seeded account. This goto is a
    // fresh load BEFORE any corruption — it only establishes the baseline screen.
    await page.goto(`/account/${seeder.accountId}/div-dep`);
    await page.waitForLoadState('networkidle');
    const addButton = page.locator('[data-testid="add-new-position-button"]');
    await expect(addButton).toBeVisible({ timeout: 10000 });

    // Add a Deposit-type div-deposit (no symbol required). NO reload after submit.
    await addButton.click();
    await expect(page.locator('dms-div-dep-modal')).toBeVisible({
      timeout: 5000,
    });
    await page.locator('input[formControlName="date"]').fill('01/15/2025');
    await page.locator('input[formControlName="date"]').blur();
    await page
      .locator('mat-select[formControlName="divDepositTypeId"]')
      .click();
    await page
      .locator('mat-option')
      .filter({ hasText: 'Deposit' })
      .first()
      .click();
    await page.locator('input[formControlName="amount"]').fill('75.50');
    const submitBtn = page.locator(
      'mat-dialog-actions button[mat-raised-button]',
    );
    await submitBtn.click();
    await expect(page.locator('dms-div-dep-modal')).not.toBeVisible({
      timeout: 5000,
    });

    // The crash path: click the "Open Positions" tab (SPA routerLink nav — no reload).
    await page.locator('[data-testid="account-tab-open"]').click();
    // Give Angular time to re-evaluate computed signals and render the table.
    await settle(page, 2000);

    const startIndexErrors = pageErrors.filter((e) => e.includes('startIndex'));
    expect(startIndexErrors).toEqual([]);

    // Positive: the Open Positions screen actually rendered its table.
    await expect(
      page.locator('[data-testid="open-positions-table"]'),
    ).toBeVisible({ timeout: 10000 });
  });
});
