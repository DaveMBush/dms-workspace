import type { PrismaClient } from '@prisma/client';

import { initializePrismaClient } from './shared-prisma-client.helper';
import { createRiskGroups } from './shared-risk-groups.helper';

interface MultiSymbolSeederResult {
  tstxUniverseId: string;
  abcdUniverseId: string;
  cleanup(): Promise<void>;
}

const TSTX_SYMBOL = 'TSTX';
const ABCD_SYMBOL = 'ABCD';
const ACCOUNT_NAME = 'Multi Symbol Test Account';

async function cleanupExistingData(prisma: PrismaClient): Promise<void> {
  const existingUniverses = await prisma.universe.findMany({
    where: { symbol: { in: [TSTX_SYMBOL, ABCD_SYMBOL] } },
    select: { id: true },
  });
  const universeIds = existingUniverses.map(function getId(u: { id: string }) {
    return u.id;
  });
  if (universeIds.length > 0) {
    await prisma.trades.deleteMany({ where: { universeId: { in: universeIds } } });
    await prisma.universe.deleteMany({ where: { id: { in: universeIds } } });
  }
  await prisma.accounts.deleteMany({ where: { name: ACCOUNT_NAME } });
}

async function createSeedData(
  prisma: PrismaClient
): Promise<MultiSymbolSeederResult> {
  const riskGroups = await createRiskGroups(prisma);
  await cleanupExistingData(prisma);

  const tstxUniverse = await prisma.universe.create({
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

  const abcdUniverse = await prisma.universe.create({
    data: {
      symbol: ABCD_SYMBOL,
      risk_group_id: riskGroups.equitiesRiskGroup.id,
      distribution: 0.0,
      distributions_per_year: 0,
      last_price: 10.0,
      expired: false,
      is_closed_end_fund: false,
    },
  });

  // Account is created by the import itself; we just ensure it doesn't
  // pre-exist to avoid confusion. No pre-seeded trades for either symbol.
  await prisma.accounts.deleteMany({ where: { name: ACCOUNT_NAME } });

  return {
    tstxUniverseId: tstxUniverse.id,
    abcdUniverseId: abcdUniverse.id,
    cleanup: async function cleanupMultiSymbolData(): Promise<void> {
      try {
        await prisma.trades.deleteMany({
          where: { universeId: tstxUniverse.id },
        });
        await prisma.trades.deleteMany({
          where: { universeId: abcdUniverse.id },
        });
        await prisma.accounts.deleteMany({ where: { name: ACCOUNT_NAME } });
        await prisma.universe.deleteMany({
          where: { id: { in: [tstxUniverse.id, abcdUniverse.id] } },
        });
      } finally {
        await prisma.$disconnect();
      }
    },
  };
}

/**
 * Seeds TSTX and ABCD universe entries with no pre-existing trades.
 *
 * Used by the multi-symbol split E2E test to verify that only the symbol
 * with a split row (TSTX) has its lots adjusted — ABCD must be untouched.
 *
 * Fixture: apps/dms-material-e2e/fixtures/fidelity-split-multi-symbol.csv
 *   - Line 2 (split):  09/20/2025 TSTX YOU SOLD 100 shares  (post-split qty: 500/5)
 *   - Line 3 (buy):    07/15/2025 TSTX YOU BOUGHT 500 @ $4.00
 *   - Line 4 (buy):    06/01/2025 ABCD YOU BOUGHT 100 @ $10.00
 */
export async function seedMultiSymbolE2eData(): Promise<MultiSymbolSeederResult> {
  const prisma = await initializePrismaClient();
  try {
    return await createSeedData(prisma);
  } catch (error) {
    await prisma.$disconnect();
    throw error;
  }
}
