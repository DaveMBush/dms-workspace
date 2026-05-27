import { expect, Page, test } from 'playwright/test';

import { generateUniqueId } from './helpers/generate-unique-id.helper';
import { login } from './helpers/login.helper';
import { createRiskGroups } from './helpers/shared-risk-groups.helper';
import { initializePrismaClient } from './helpers/shared-prisma-client.helper';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Wait for dms-base-table and at least one data row.
 */
async function waitForTableRows(page: Page): Promise<void> {
  await expect(page.locator('dms-base-table')).toBeVisible({ timeout: 15000 });
  await page.waitForSelector('.dms-body-row[role="row"]', { timeout: 15000 });
}

/**
 * Type into the Symbol filter input to isolate a specific row.
 */
async function filterBySymbol(page: Page, symbol: string): Promise<void> {
  const input = page.locator('input[placeholder="Search Symbol"]');
  await input.fill(symbol);
}

// ─── Story 100.2: Fix Universe Row Delete ─────────────────────────────────────
//
// Verifies that the trash-can icon on a Universe row:
//   (a) actually sends a DELETE request and removes the row from the DB so it
//       stays gone after a hard refresh (AC 1, 2, 4)
//   (b) reports failure honestly when the server returns non-2xx — row stays
//       visible, error notification shown (AC 3)
//
// Both tests run on chromium and firefox via the shared Playwright project
// config (no per-spec ignore list).

test.describe('Universe Row Delete (Story 100.2)', () => {
  let symbol1: string; // used by happy-path test (will be deleted by the app)
  let symbol2: string; // used by failure-path test (stays in DB)
  let universe1Id: string;
  let universe2Id: string;
  let riskGroupId: string;

  test.beforeAll(async () => {
    const prisma = await initializePrismaClient();
    try {
      const riskGroups = await createRiskGroups(prisma);
      riskGroupId = riskGroups.equitiesRiskGroup.id;

      const uid = generateUniqueId();
      symbol1 = `UDEL1-${uid}`;
      symbol2 = `UDEL2-${uid}`;

      const u1 = await prisma.universe.create({
        data: {
          symbol: symbol1,
          risk_group_id: riskGroupId,
          distribution: 0.25,
          distributions_per_year: 4,
          last_price: 100.0,
          ex_date: new Date('2026-06-15'),
          expired: false,
          is_closed_end_fund: false,
        },
      });
      universe1Id = u1.id;

      const u2 = await prisma.universe.create({
        data: {
          symbol: symbol2,
          risk_group_id: riskGroupId,
          distribution: 0.25,
          distributions_per_year: 4,
          last_price: 100.0,
          ex_date: new Date('2026-06-15'),
          expired: false,
          is_closed_end_fund: false,
        },
      });
      universe2Id = u2.id;
    } finally {
      await prisma.$disconnect();
    }
  });

  test.afterAll(async () => {
    const prisma = await initializePrismaClient();
    try {
      // deleteMany is a no-op if the row was already deleted by the test
      await prisma.universe.deleteMany({
        where: { id: { in: [universe1Id, universe2Id] } },
      });
    } finally {
      await prisma.$disconnect();
    }
  });

  test('happy path: deleted row is gone from DB and stays gone after hard refresh', async ({
    page,
  }) => {
    await login(page);
    await page.goto('/global/universe');
    await waitForTableRows(page);

    // Narrow the list to our seeded symbol
    await filterBySymbol(page, symbol1);

    const row = page.locator('.dms-body-row[role="row"]').filter({ hasText: symbol1 });
    await expect(row).toBeVisible({ timeout: 15000 });

    // Click the trash-can (delete) button
    const deleteButton = row.locator('[aria-label="Delete unused symbol"]');
    await expect(deleteButton).toBeVisible({ timeout: 10000 });
    await deleteButton.click();

    // Row should disappear from the UI immediately after SmartNgRX removes it
    await expect(row).not.toBeVisible({ timeout: 10000 });

    // Hard refresh — if the DB was not updated the row would reappear
    await page.reload();
    await waitForTableRows(page);
    await filterBySymbol(page, symbol1);

    // Row must still be absent after reload (AC 2)
    await expect(
      page.locator('.dms-body-row[role="row"]').filter({ hasText: symbol1 })
    ).not.toBeVisible({ timeout: 10000 });
  });

  test('failure path: error notification shown and row remains when server returns 500', async ({
    page,
  }) => {
    await login(page);
    await page.goto('/global/universe');
    await waitForTableRows(page);

    // Narrow the list to our seeded symbol
    await filterBySymbol(page, symbol2);

    const row = page.locator('.dms-body-row[role="row"]').filter({ hasText: symbol2 });
    await expect(row).toBeVisible({ timeout: 15000 });

    // Intercept the universe DELETE endpoint and force a 500
    await page.route('**/api/universe/**', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Internal server error',
          }),
        });
        return;
      }
      await route.continue();
    });

    const deleteButton = row.locator('[aria-label="Delete unused symbol"]');
    await expect(deleteButton).toBeVisible({ timeout: 10000 });
    await deleteButton.click();

    // SmartNgRX error handler must surface the error as a toast (AC 3)
    await expect(page.locator('.snackbar-error')).toBeVisible({
      timeout: 10000,
    });

    // The UI MUST NOT falsely remove the row on server failure (AC 3, R5)
    await expect(row).toBeVisible({ timeout: 5000 });
  });
});
