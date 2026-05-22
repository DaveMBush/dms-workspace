import fs from 'fs';
import path from 'path';

import type { PrismaClient } from '@prisma/client';
import { expect, test } from 'playwright/test';

/**
 * Story 92.2 — E2E: Volatility Present After CSV Import
 *
 * Regression guard: proves that after a Fidelity CSV import creates a new
 * universe symbol, the universe record has non-null `volatilityLong` and
 * `volatilityShort` values.
 *
 * Story 92.1 wired `recalculateUniverseVolatility` into `createUniverseEntry`.
 * This test confirms that wiring is present end-to-end.
 *
 * IMPVOL92 is a fictional ticker not found on dividendhistory.net.  The server
 * therefore falls back to an empty distribution history array and sets both
 * volatility fields to 'insufficient-history' (non-null).  This makes the test
 * deterministic without requiring any network interception.
 *
 * Note: `page.route` cannot intercept server-side Node.js fetch calls, so no
 * route interception is needed; determinism comes from using a fictional symbol.
 */

const TEST_SYMBOL = 'IMPVOL92';
const TEST_ACCOUNT_NAME = 'Import Volatility Test Account 92';
const FIXTURES_DIR = path.resolve(__dirname, '..', 'fixtures');

function getWorkspaceRoot(): string {
  // This file lives at apps/dms-material-e2e/src/ (3 levels deep from workspace root)
  return path.resolve(__dirname, '..', '..', '..');
}

async function initializePrismaClient(): Promise<PrismaClient> {
  const { PrismaClient } = await import('@prisma/client');
  const { PrismaBetterSqlite3 } = await import(
    '@prisma/adapter-better-sqlite3'
  );
  const testDbUrl = `file:${getWorkspaceRoot()}/test-database.db`;
  const adapter = new PrismaBetterSqlite3({ url: testDbUrl });
  return new PrismaClient({ adapter });
}

async function cleanupTestSymbol(prisma: PrismaClient): Promise<void> {
  const existing = await prisma.universe.findFirst({
    where: { symbol: TEST_SYMBOL },
  });
  if (!existing) {
    return;
  }
  await prisma.trades.deleteMany({ where: { universeId: existing.id } });
  await prisma.divDeposits.deleteMany({ where: { universeId: existing.id } });
  await prisma.universe.delete({ where: { id: existing.id } });
}

test.describe('CSV Import — Volatility Present After Import (Story 92.2)', () => {
  let testAccountId: string | null = null;

  test.beforeAll(async ({ request }) => {
    // Remove any leftover test account from a previous run to avoid duplicate-name 500s
    const prismaPreCleanup = await initializePrismaClient();
    try {
      await prismaPreCleanup.accounts.deleteMany({
        where: { name: TEST_ACCOUNT_NAME },
      });
    } finally {
      await prismaPreCleanup.$disconnect();
    }

    // Create a dedicated test account so we can clean it up precisely
    const accountResponse = await request.post('/api/accounts/add', {
      data: { name: TEST_ACCOUNT_NAME },
    });
    if (!accountResponse.ok()) {
      throw new Error(
        `Failed to create test account: ${accountResponse.status()}`
      );
    }
    const accounts = (await accountResponse.json()) as Array<{ id: string }>;
    if (!accounts[0]?.id) {
      throw new Error('Created account has no id');
    }
    testAccountId = accounts[0].id;

    // Remove any leftover IMPVOL92 universe entry from a previous test run
    const prisma = await initializePrismaClient();
    try {
      await cleanupTestSymbol(prisma);
    } finally {
      await prisma.$disconnect();
    }
  });

  test.afterAll(async ({ request }) => {
    // Remove the universe entry created by the import
    const prisma = await initializePrismaClient();
    try {
      await cleanupTestSymbol(prisma);
    } finally {
      await prisma.$disconnect();
    }

    // Delete the test account
    if (testAccountId !== null) {
      const deleteResponse = await request.delete(
        `/api/accounts/${testAccountId}`
      );
      if (!deleteResponse.ok()) {
        console.warn(
          `Failed to delete test account ${testAccountId}: ${deleteResponse.status()}`
        );
      }
    }
  });

  test('volatility fields are non-null after CSV import of a new symbol', async ({
    request,
  }) => {
    // Read the fixture CSV that contains a single BUY row for IMPVOL92
    const csvContent = fs.readFileSync(
      path.join(FIXTURES_DIR, 'fidelity-impvol92-volatility.csv'),
      'utf-8'
    );

    // POST the CSV content directly to the import endpoint (text/plain is
    // accepted by the import route, matching what the browser UI sends)
    const importResponse = await request.post('/api/import/fidelity', {
      data: csvContent,
      headers: { 'content-type': 'text/plain' },
    });
    expect(importResponse.status()).toBe(200);

    const importBody = (await importResponse.json()) as {
      success: boolean;
      imported: number;
      errors: string[];
    };
    expect(importBody.success).toBe(true);
    expect(importBody.imported).toBeGreaterThan(0);

    // Query all universe entries and find the freshly-imported symbol.
    // The import is synchronous: recalculateUniverseVolatility is awaited
    // inside createUniverseEntry before the import response is sent, so
    // volatility is already written by this point.
    const universeResponse = await request.get('/api/universe/');
    expect(universeResponse.status()).toBe(200);

    const universes = (await universeResponse.json()) as Array<{
      id: string;
      symbol: string;
      volatilityLong: string | null;
      volatilityShort: string | null;
    }>;

    const entry = universes.find((u) => u.symbol === TEST_SYMBOL);
    expect(
      entry,
      `Expected ${TEST_SYMBOL} to be present in universe after import`
    ).toBeDefined();

    // AC #1 — both volatility fields must be non-null after import
    expect(
      entry!.volatilityLong,
      'volatilityLong must be non-null after CSV import'
    ).not.toBeNull();
    expect(
      entry!.volatilityShort,
      'volatilityShort must be non-null after CSV import'
    ).not.toBeNull();
  });
});
