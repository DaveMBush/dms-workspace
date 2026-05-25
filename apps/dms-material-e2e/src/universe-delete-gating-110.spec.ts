import { expect, Page, test } from 'playwright/test';

import { generateUniqueId } from './helpers/generate-unique-id.helper';
import { getOrCreateDivDepositTypeId } from './helpers/get-or-create-div-deposit-type-id.helper';
import { login } from './helpers/login.helper';
import { initializePrismaClient } from './helpers/shared-prisma-client.helper';
import { createRiskGroups } from './helpers/shared-risk-groups.helper';

// ─── Module-level test data ───────────────────────────────────────────────────

let symUnused: string; // no trades, no divDeposits → deletable: true
let symTrades: string; // has a trade row → deletable: false
let symDivs: string; // has a divDeposits row → deletable: false

let universeUnusedId: string;
let universeTradesId: string;
let universeDivsId: string;
let testAccountId: string;
let testAccountName: string;
let tradesRowId: string;
let divDepositsRowId: string;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Remove the persisted sort/filter state so the universe page starts with
 * the default "All Accounts" selection.
 */
async function clearSortFilterState(page: Page): Promise<void> {
  await page.evaluate(function removeSortFilterState(): void {
    localStorage.removeItem('dms-sort-filter-state');
  });
}

/** Wait for the dms-base-table and at least one data row. */
async function waitForTableRows(page: Page): Promise<void> {
  await expect(page.locator('dms-base-table')).toBeVisible({ timeout: 15000 });
  await page.waitForSelector('tr.mat-mdc-row', { timeout: 15000 });
}

/** Filter the symbol column to isolate a single row. */
async function filterBySymbol(page: Page, symbol: string): Promise<void> {
  const input = page.locator('input[placeholder="Search Symbol"]');
  await input.fill('');
  await input.fill(symbol);
  await page.waitForTimeout(600);
}

/**
 * Open the universe account mat-select and pick a named option.
 */
async function selectUniverseAccount(
  page: Page,
  accountName: string
): Promise<void> {
  const accountSelect = page.locator('.account-select mat-select');
  await accountSelect.click();
  await page.getByRole('option', { name: accountName, exact: true }).click();
  await page.waitForTimeout(500);
}

// ─── Story 110.3: Universe Delete-Button Gating ───────────────────────────────
//
// Verifies that the delete button on a universe row is:
//   (a) visible only for the unused symbol when "All Accounts" filter is active
//   (b) hidden for ALL rows when a specific account filter is active
//
// Both tests run on chromium and firefox via the shared Playwright project
// config (no per-spec ignore list).

test.describe('Universe Delete-Button Gating (Story 110.3)', () => {
  test.beforeAll(async () => {
    const prisma = await initializePrismaClient();
    try {
      const riskGroups = await createRiskGroups(prisma);
      const riskGroupId = riskGroups.equitiesRiskGroup.id;

      const uid = generateUniqueId();
      symUnused = `DGU-${uid}`;
      symTrades = `DGT-${uid}`;
      symDivs = `DGD-${uid}`;
      testAccountName = `dg-acct-${uid}`;

      // Create test account
      const account = await prisma.accounts.create({
        data: { name: testAccountName },
      });
      testAccountId = account.id;

      // Create universe rows — all with is_closed_end_fund: false so deletable
      // logic depends only on trade/divDeposit counts
      const uUnused = await prisma.universe.create({
        data: {
          symbol: symUnused,
          risk_group_id: riskGroupId,
          distribution: 0.25,
          distributions_per_year: 4,
          last_price: 10.0,
          ex_date: new Date('2027-01-15'),
          expired: false,
          is_closed_end_fund: false,
        },
      });
      universeUnusedId = uUnused.id;

      const uTrades = await prisma.universe.create({
        data: {
          symbol: symTrades,
          risk_group_id: riskGroupId,
          distribution: 0.25,
          distributions_per_year: 4,
          last_price: 10.0,
          ex_date: new Date('2027-01-15'),
          expired: false,
          is_closed_end_fund: false,
        },
      });
      universeTradesId = uTrades.id;

      const uDivs = await prisma.universe.create({
        data: {
          symbol: symDivs,
          risk_group_id: riskGroupId,
          distribution: 0.25,
          distributions_per_year: 4,
          last_price: 10.0,
          ex_date: new Date('2027-01-15'),
          expired: false,
          is_closed_end_fund: false,
        },
      });
      universeDivsId = uDivs.id;

      // Add one trade to symTrades → server will set deletable: false
      const tradeRow = await prisma.trades.create({
        data: {
          universeId: universeTradesId,
          accountId: testAccountId,
          buy: 10.0,
          sell: 0.0,
          buy_date: new Date('2027-01-10'),
          quantity: 5,
        },
      });
      tradesRowId = tradeRow.id;

      // Add one divDeposits row to symDivs → server will set deletable: false
      const divDepositTypeId = await getOrCreateDivDepositTypeId(prisma);
      const divRow = await prisma.divDeposits.create({
        data: {
          universeId: universeDivsId,
          accountId: testAccountId,
          divDepositTypeId,
          date: new Date('2027-01-10'),
          amount: 5.0,
        },
      });
      divDepositsRowId = divRow.id;
    } finally {
      await prisma.$disconnect();
    }
  });

  test.afterAll(async () => {
    const prisma = await initializePrismaClient();
    try {
      await prisma.trades.deleteMany({ where: { id: tradesRowId } });
      await prisma.divDeposits.deleteMany({ where: { id: divDepositsRowId } });
      await prisma.universe.deleteMany({
        where: {
          id: { in: [universeUnusedId, universeTradesId, universeDivsId] },
        },
      });
      await prisma.accounts.deleteMany({ where: { id: testAccountId } });
    } finally {
      await prisma.$disconnect();
    }
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
    // Navigate to any page so localStorage is accessible before clearing it
    await page.goto('/global/universe');
    await clearSortFilterState(page);
    await page.goto('/global/universe');
    await waitForTableRows(page);
  });

  test('All Accounts filter: delete button visible only for unused symbol', async ({
    page,
  }) => {
    // After clearing sort-filter state, account defaults to "All Accounts"
    // Verify symUnused row shows the delete button
    await filterBySymbol(page, symUnused);
    const unusedRow = page
      .locator('tr.mat-mdc-row')
      .filter({ hasText: symUnused });
    await expect(unusedRow).toBeVisible({ timeout: 15000 });
    await expect(
      unusedRow.locator('[aria-label="Delete unused symbol"]')
    ).toBeVisible({ timeout: 10000 });

    // Verify symTrades row does NOT show the delete button
    await filterBySymbol(page, symTrades);
    const tradesRow = page
      .locator('tr.mat-mdc-row')
      .filter({ hasText: symTrades });
    await expect(tradesRow).toBeVisible({ timeout: 15000 });
    await expect(
      tradesRow.locator('[aria-label="Delete unused symbol"]')
    ).not.toBeVisible({ timeout: 5000 });

    // Verify symDivs row does NOT show the delete button
    await filterBySymbol(page, symDivs);
    const divsRow = page.locator('tr.mat-mdc-row').filter({ hasText: symDivs });
    await expect(divsRow).toBeVisible({ timeout: 15000 });
    await expect(
      divsRow.locator('[aria-label="Delete unused symbol"]')
    ).not.toBeVisible({ timeout: 5000 });
  });

  test('Specific account filter: delete button hidden on all rows', async ({
    page,
  }) => {
    // Switch to the specific test account
    await selectUniverseAccount(page, testAccountName);

    // Even the unused symbol should NOT show the delete button
    await filterBySymbol(page, symUnused);
    const unusedRow = page
      .locator('tr.mat-mdc-row')
      .filter({ hasText: symUnused });
    await expect(unusedRow).toBeVisible({ timeout: 15000 });
    await expect(
      unusedRow.locator('[aria-label="Delete unused symbol"]')
    ).not.toBeVisible({ timeout: 5000 });

    // No delete buttons on page at all
    await expect(
      page.locator('[aria-label="Delete unused symbol"]')
    ).toHaveCount(0, { timeout: 5000 });
  });
});
