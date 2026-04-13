import type { PrismaClient } from '@prisma/client';

import { initializePrismaClient } from './shared-prisma-client.helper';
import { createRiskGroups } from './shared-risk-groups.helper';

interface NoOpenLotsSeederResult {
  accountId: string;
  universeId: string;
  cleanup(): Promise<void>;
}

const TSTX_SYMBOL = 'TSTX';
const ACCOUNT_NAME = 'No Open Lots Test Account';

async function cleanupExistingTstxData(prisma: PrismaClient): Promise<void> {
  const existingUniverse = await prisma.universe.findFirst({
    where: { symbol: TSTX_SYMBOL },
  });
  if (existingUniverse) {
    await prisma.trades.deleteMany({
      where: { universeId: existingUniverse.id },
    });
    await prisma.universe.delete({ where: { id: existingUniverse.id } });
  }
  await prisma.accounts.deleteMany({ where: { name: ACCOUNT_NAME } });
}

async function createTstxSeedData(
  prisma: PrismaClient
): Promise<NoOpenLotsSeederResult> {
  const riskGroups = await createRiskGroups(prisma);
  await cleanupExistingTstxData(prisma);

  // Create universe entry for TSTX — no pre-existing trades.
  // The buy lots must come entirely from the CSV import.
  const universe = await prisma.universe.create({
    data: {
      symbol: TSTX_SYMBOL,
      risk_group_id: riskGroups.incomeRiskGroup.id,
      distribution: 0.0,
      distributions_per_year: 12,
      last_price: 20.0,
      ex_date: new Date('2025-10-01'),
      expired: false,
      is_closed_end_fund: false,
    },
  });

  const account = await prisma.accounts.create({
    data: { name: ACCOUNT_NAME },
  });

  return {
    accountId: account.id,
    universeId: universe.id,
    cleanup: async function cleanupNoOpenLotsData(): Promise<void> {
      try {
        await prisma.trades.deleteMany({ where: { universeId: universe.id } });
        await prisma.accounts.deleteMany({ where: { id: account.id } });
        await prisma.universe.deleteMany({ where: { id: universe.id } });
      } finally {
        await prisma.$disconnect();
      }
    },
  };
}

/**
 * Seeds the database with a TSTX universe entry and a test account — but NO trades.
 *
 * The buy lots are intentionally absent so they must be provided by the CSV import.
 * This reproduces the "No open lots" ordering bug: the CSV split row appears before
 * the buy rows (Fidelity reverse-date order), so the split processor runs during
 * mapping before any buys exist in the database.
 *
 * Fixture: apps/dms-material-e2e/fixtures/fidelity-split-order-bug.csv
 *   - Line 2 (split):  09/20/2025 YOU SOLD 200 shares  (post-split qty: 1000/5)
 *   - Line 3 (buy):    07/15/2025 YOU BOUGHT 500 @ $4.00
 *   - Line 4 (buy):    06/01/2025 YOU BOUGHT 500 @ $3.80
 */
export async function seedNoOpenLotsE2eData(): Promise<NoOpenLotsSeederResult> {
  const prisma = await initializePrismaClient();
  try {
    return await createTstxSeedData(prisma);
  } catch (error) {
    await prisma.$disconnect();
    throw error;
  }
}
