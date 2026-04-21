import fs from 'fs';
import path from 'path';

import { expect, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedOxlcJointBrokerageData } from './helpers/seed-oxlc-joint-brokerage.helper';
import { initializePrismaClient } from './helpers/shared-prisma-client.helper';

const FIXTURES_DIR = path.resolve(__dirname, '..', 'fixtures');
const ACCOUNT_NAME = 'E2E OXLC Joint Brokerage';

// Serial mode: imports modify shared DB state.
test.describe.configure({ mode: 'serial' });

test.describe('OXLC Joint Brokerage Positions and Dividends', () => {
  let cleanup: (() => Promise<void>) | null = null;
  let accountId = '';

  test.beforeAll(async ({ request }) => {
    // 1. Seed risk groups (prerequisite for import pipeline to classify OXLC)
    const seedResult = await seedOxlcJointBrokerageData();
    cleanup = seedResult.cleanup;

    // 2. Import the OXLC fixture CSV via the plain-text import endpoint.
    //    The CSV uses account name "E2E OXLC Joint Brokerage" which the import
    //    service will auto-create.
    const csvPath = path.join(
      FIXTURES_DIR,
      'fidelity-oxlc-joint-brokerage.csv'
    );
    const csvContent = fs.readFileSync(csvPath, 'utf-8');

    const response = await request.post('/api/import/fidelity', {
      data: csvContent,
      headers: { 'content-type': 'text/plain' },
    });

    if (!response.ok()) {
      throw new Error(
        `CSV import failed: ${response.status()} ${await response.text()}`
      );
    }

    const body = (await response.json()) as {
      success: boolean;
      imported: number;
      errors: string[];
    };

    if (!body.success) {
      throw new Error(`Import returned errors: ${JSON.stringify(body.errors)}`);
    }

    // 3. Resolve the account ID created by the import so we can navigate to it.
    const prisma = await initializePrismaClient();
    try {
      const account = await prisma.accounts.findFirst({
        where: { name: ACCOUNT_NAME },
      });
      if (!account) {
        throw new Error(`Account "${ACCOUNT_NAME}" not found after import`);
      }
      accountId = account.id;
    } finally {
      await prisma.$disconnect();
    }
  });

  test.afterAll(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  test('OXLC open position is visible for Joint Brokerage account', async ({
    page,
  }) => {
    await login(page);
    await page.goto(`/account/${accountId}/open`);
    await page.waitForLoadState('networkidle');

    const table = page.locator('[data-testid="open-positions-table"]');
    await expect(table).toBeVisible({ timeout: 15000 });

    // Assert at least one OXLC row is visible in the open positions table
    await expect(page.getByText('OXLC').first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('OXLC dividend deposit is visible for Joint Brokerage account', async ({
    page,
  }) => {
    await login(page);
    await page.goto(`/account/${accountId}/div-dep`);
    await page.waitForLoadState('networkidle');

    // Assert at least one OXLC dividend row is visible in the div deposits table
    await expect(page.getByText('OXLC').first()).toBeVisible({
      timeout: 10000,
    });
  });
});
