import type { PrismaClient } from '@prisma/client';

import { initializePrismaClient } from './shared-prisma-client.helper';
import { createRiskGroups } from './shared-risk-groups.helper';

interface SplitImportSeederResult {
  accountId: string;
  universeId: string;
  cleanup(): Promise<void>;
}

const OXLC_SYMBOL = 'OXLC';
const ACCOUNT_NAME = 'OXLC Split Test Account';

async function createPresplitLots(
  prisma: PrismaClient,
  universeId: string,
  accountId: string
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma createMany requires untyped batch data
  const lotData: any[] = [
    {
      universeId,
      accountId,
      buy: 4.0,
      sell: 0,
      buy_date: new Date('2024-01-15'),
      quantity: 500,
      sell_date: null,
    },
    {
      universeId,
      accountId,
      buy: 3.8,
      sell: 0,
      buy_date: new Date('2024-03-01'),
      quantity: 500,
      sell_date: null,
    },
    {
      universeId,
      accountId,
      buy: 3.6,
      sell: 0,
      buy_date: new Date('2024-06-01'),
      quantity: 530,
      sell_date: null,
    },
  ];
  await prisma.trades.createMany({ data: lotData });
}

async function cleanupExistingOxlcData(prisma: PrismaClient): Promise<void> {
  const existingUniverse = await prisma.universe.findFirst({
    where: { symbol: OXLC_SYMBOL },
  });
  if (existingUniverse) {
    await prisma.trades.deleteMany({
      where: { universeId: existingUniverse.id },
    });
    await prisma.universe.delete({ where: { id: existingUniverse.id } });
  }
  await prisma.accounts.deleteMany({ where: { name: ACCOUNT_NAME } });
}

async function createOxlcSeedData(
  prisma: PrismaClient
): Promise<SplitImportSeederResult> {
  const riskGroups = await createRiskGroups(prisma);
  await cleanupExistingOxlcData(prisma);

  const universe = await prisma.universe.create({
    data: {
      symbol: OXLC_SYMBOL,
      risk_group_id: riskGroups.equitiesRiskGroup.id,
      distribution: 1.0,
      distributions_per_year: 12,
      last_price: 5.0,
      ex_date: new Date('2025-09-01'),
      expired: false,
      is_closed_end_fund: true,
    },
  });

  const account = await prisma.accounts.create({
    data: { name: ACCOUNT_NAME },
  });

  // Pre-split lots: 500 + 500 + 530 = 1530 total shares
  // After 1-for-5 reverse split → 100 + 100 + 106 = 306 total shares
  await createPresplitLots(prisma, universe.id, account.id);

  return {
    accountId: account.id,
    universeId: universe.id,
    cleanup: async function cleanupSplitImportData(): Promise<void> {
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
 * Seeds the database with OXLC pre-split data for E2E CSV import split handling tests.
 *
 * Creates:
 * - OXLC universe entry (last_price=$5.00)
 * - Account: "OXLC Split Test Account" (matches the CSV fixture)
 * - 3 open lot trades: 500@$4.00 + 500@$3.80 + 530@$3.60 = 1530 total shares
 *
 * After the 1-for-5 reverse split import:
 * - Lot 1 → 100 shares @ $20.00
 * - Lot 2 → 100 shares @ $19.00
 * - Lot 3 → 106 shares @ $18.00 (306 total, 0 fractional remainder)
 */
export async function seedSplitImportE2eData(): Promise<SplitImportSeederResult> {
  const prisma = await initializePrismaClient();
  try {
    return await createOxlcSeedData(prisma);
  } catch (error) {
    await prisma.$disconnect();
    throw error;
  }
}

// ---------------------------------------------------------------------------
// All-Three Reverse Split seed (Story 57.3)
// ---------------------------------------------------------------------------

const COMBINED_ACCOUNT_NAME = 'Reverse Split Test Account';
const MSTY_SYMBOL = 'MSTY';
const ULTY_SYMBOL = 'ULTY';

interface AllThreeSplitsSeederResult {
  accountId: string;
  mstyUniverseId: string;
  ultyUniverseId: string;
  oxlcUniverseId: string;
  cleanup(): Promise<void>;
}

async function cleanupSymbolData(
  prisma: PrismaClient,
  symbol: string
): Promise<void> {
  const existingUniverse = await prisma.universe.findFirst({
    where: { symbol },
  });
  if (existingUniverse) {
    await prisma.trades.deleteMany({
      where: { universeId: existingUniverse.id },
    });
    await prisma.universe.delete({ where: { id: existingUniverse.id } });
  }
}

async function createAllThreeSeedData(
  prisma: PrismaClient
): Promise<AllThreeSplitsSeederResult> {
  const riskGroups = await createRiskGroups(prisma);

  // Clean up any pre-existing data that would interfere with the test
  await cleanupSymbolData(prisma, MSTY_SYMBOL);
  await cleanupSymbolData(prisma, ULTY_SYMBOL);
  await cleanupSymbolData(prisma, OXLC_SYMBOL);
  await prisma.accounts.deleteMany({ where: { name: COMBINED_ACCOUNT_NAME } });

  // Create universe entries for all three symbols
  const mstyUniverse = await prisma.universe.create({
    data: {
      symbol: MSTY_SYMBOL,
      risk_group_id: riskGroups.equitiesRiskGroup.id,
      distribution: 1.0,
      distributions_per_year: 12,
      last_price: 10.0,
      ex_date: new Date('2025-09-01'),
      expired: false,
      is_closed_end_fund: true,
    },
  });

  const ultyUniverse = await prisma.universe.create({
    data: {
      symbol: ULTY_SYMBOL,
      risk_group_id: riskGroups.equitiesRiskGroup.id,
      distribution: 1.0,
      distributions_per_year: 12,
      last_price: 30.0,
      ex_date: new Date('2025-09-01'),
      expired: false,
      is_closed_end_fund: true,
    },
  });

  const oxlcUniverse = await prisma.universe.create({
    data: {
      symbol: OXLC_SYMBOL,
      risk_group_id: riskGroups.equitiesRiskGroup.id,
      distribution: 1.0,
      distributions_per_year: 12,
      last_price: 5.0,
      ex_date: new Date('2025-09-01'),
      expired: false,
      is_closed_end_fund: true,
    },
  });

  const account = await prisma.accounts.create({
    data: { name: COMBINED_ACCOUNT_NAME },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma createMany requires untyped batch data
  const lotData: any[] = [
    // MSTY: 1 lot, 400 shares @ $2.00 → after 1-for-5: 80 shares @ $10.00
    {
      universeId: mstyUniverse.id,
      accountId: account.id,
      buy: 2.0,
      sell: 0,
      buy_date: new Date('2024-01-15'),
      quantity: 400,
      sell_date: null,
    },
    // ULTY: 1 lot, 1000 shares @ $3.00 → after 1-for-10: 100 shares @ $30.00
    {
      universeId: ultyUniverse.id,
      accountId: account.id,
      buy: 3.0,
      sell: 0,
      buy_date: new Date('2024-01-15'),
      quantity: 1000,
      sell_date: null,
    },
    // OXLC: 1 lot, 1530 shares @ $1.00 → after 1-for-5: 306 shares @ $5.00
    {
      universeId: oxlcUniverse.id,
      accountId: account.id,
      buy: 1.0,
      sell: 0,
      buy_date: new Date('2024-01-15'),
      quantity: 1530,
      sell_date: null,
    },
  ];
  await prisma.trades.createMany({ data: lotData });

  return {
    accountId: account.id,
    mstyUniverseId: mstyUniverse.id,
    ultyUniverseId: ultyUniverse.id,
    oxlcUniverseId: oxlcUniverse.id,
    cleanup: async function cleanupAllThreeSplitData(): Promise<void> {
      try {
        await prisma.trades.deleteMany({ where: { accountId: account.id } });
        await prisma.accounts.deleteMany({ where: { id: account.id } });
        await prisma.universe.deleteMany({
          where: {
            id: {
              in: [mstyUniverse.id, ultyUniverse.id, oxlcUniverse.id],
            },
          },
        });
      } finally {
        await prisma.$disconnect();
      }
    },
  };
}

/**
 * Seeds the database with MSTY, ULTY, and OXLC pre-split data for the
 * all-three reverse split E2E test (Story 57.3).
 *
 * Creates:
 * - Universe entries for MSTY (last_price=$10.00), ULTY (last_price=$30.00),
 *   OXLC (last_price=$5.00)
 * - Account: "Reverse Split Test Account"
 * - 1 open lot per symbol:
 *   - MSTY: 400 shares @ $2.00  (1-for-5 → 80 @ $10.00)
 *   - ULTY: 1000 shares @ $3.00 (1-for-10 → 100 @ $30.00)
 *   - OXLC: 1530 shares @ $1.00 (1-for-5 → 306 @ $5.00)
 */
export async function seedAllThreeSplitsE2eData(): Promise<AllThreeSplitsSeederResult> {
  const prisma = await initializePrismaClient();
  try {
    return await createAllThreeSeedData(prisma);
  } catch (error) {
    await prisma.$disconnect();
    throw error;
  }
}
