import type { PrismaClient } from '@prisma/client';

import { initializePrismaClient } from './shared-prisma-client.helper';
import { createRiskGroups } from './shared-risk-groups.helper';

const CUSIP_SYMBOL = '691543102';
const TICKER_SYMBOL = 'OXLC';
const ACCOUNT_NAME = 'OXLC CUSIP Split Test Account';

interface OxlcCusipSplitSeederResult {
  accountId: string;
  cusipUniverseId: string;
  cleanup(): Promise<void>;
}

async function cleanupExistingData(prisma: PrismaClient): Promise<void> {
  for (const symbol of [CUSIP_SYMBOL, TICKER_SYMBOL]) {
    const existing = await prisma.universe.findFirst({ where: { symbol } });
    if (existing) {
      await prisma.trades.deleteMany({ where: { universeId: existing.id } });
      await prisma.universe.delete({ where: { id: existing.id } });
    }
  }
  await prisma.accounts.deleteMany({ where: { name: ACCOUNT_NAME } });
  await prisma.cusip_cache.deleteMany({ where: { cusip: CUSIP_SYMBOL } });
}

async function createUniverses(
  prisma: PrismaClient,
  riskGroupId: string
): Promise<{ id: string }> {
  // Universe entry for the CUSIP symbol (where pre-split lots actually live)
  const cusipUniverse = await prisma.universe.create({
    data: {
      symbol: CUSIP_SYMBOL,
      risk_group_id: riskGroupId,
      distribution: 1.0,
      distributions_per_year: 12,
      last_price: 4.0,
      ex_date: new Date('2025-06-01'),
      expired: false,
      is_closed_end_fund: true,
    },
  });
  // Universe entry for the ticker symbol (needed by adjustLotsForSplit to resolve the split row)
  await prisma.universe.create({
    data: {
      symbol: TICKER_SYMBOL,
      risk_group_id: riskGroupId,
      distribution: 1.0,
      distributions_per_year: 12,
      last_price: 22.5,
      ex_date: new Date('2025-10-01'),
      expired: false,
      is_closed_end_fund: true,
    },
  });
  return cusipUniverse;
}

async function createPresplitLots(
  prisma: PrismaClient,
  cusipUniverseId: string,
  accountId: string
): Promise<void> {
  // Pre-split lots stored under CUSIP universe (simulating lots imported before CUSIP resolution)
  // After 1-for-5 reverse split: 300→60@$22.50, 150→30@$22.45, 500→100@$20.30, 580→116@$17.20
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma createMany requires untyped batch data
  const lotData: any[] = [
    {
      universeId: cusipUniverseId,
      accountId,
      buy: 4.5,
      sell: 0,
      buy_date: new Date('2025-06-11'),
      quantity: 300,
      sell_date: null,
    },
    {
      universeId: cusipUniverseId,
      accountId,
      buy: 4.49,
      sell: 0,
      buy_date: new Date('2025-06-11'),
      quantity: 150,
      sell_date: null,
    },
    {
      universeId: cusipUniverseId,
      accountId,
      buy: 4.06,
      sell: 0,
      buy_date: new Date('2025-06-26'),
      quantity: 500,
      sell_date: null,
    },
    {
      universeId: cusipUniverseId,
      accountId,
      buy: 3.44,
      sell: 0,
      buy_date: new Date('2025-08-05'),
      quantity: 580,
      sell_date: null,
    },
  ];
  await prisma.trades.createMany({ data: lotData });
}

async function createSeedData(
  prisma: PrismaClient
): Promise<OxlcCusipSplitSeederResult> {
  const riskGroups = await createRiskGroups(prisma);
  await cleanupExistingData(prisma);

  const cusipUniverse = await createUniverses(
    prisma,
    riskGroups.equitiesRiskGroup.id
  );
  const account = await prisma.accounts.create({
    data: { name: ACCOUNT_NAME },
  });
  await createPresplitLots(prisma, cusipUniverse.id, account.id);

  // Register CUSIP → ticker mapping so the import service knows the relationship.
  // The fix in Story 61.2 uses this mapping to locate CUSIP-stored lots during split adjustment.
  await prisma.cusip_cache.upsert({
    where: { cusip: CUSIP_SYMBOL },
    update: { symbol: TICKER_SYMBOL, source: 'THIRTEENF' },
    create: { cusip: CUSIP_SYMBOL, symbol: TICKER_SYMBOL, source: 'THIRTEENF' },
  });

  return {
    accountId: account.id,
    cusipUniverseId: cusipUniverse.id,
    cleanup: async function cleanupCusipSplitData(): Promise<void> {
      try {
        await prisma.trades.deleteMany({
          where: { universeId: cusipUniverse.id },
        });
        await prisma.accounts.deleteMany({ where: { id: account.id } });
        for (const symbol of [CUSIP_SYMBOL, TICKER_SYMBOL]) {
          await prisma.universe.deleteMany({ where: { symbol } });
        }
        await prisma.cusip_cache.deleteMany({ where: { cusip: CUSIP_SYMBOL } });
      } finally {
        await prisma.$disconnect();
      }
    },
  };
}

/**
 * Seeds the database with pre-split OXLC lots stored under the raw CUSIP symbol
 * `691543102` (not the ticker `OXLC`). This simulates the common scenario where
 * lots were imported before CUSIP resolution was available, leaving them stored
 * under the CUSIP identifier.
 *
 * Also seeds:
 * - OXLC ticker universe entry (needed by the split adjustment lookup)
 * - cusip_cache entry mapping `691543102` → `OXLC`
 *
 * Pre-split lots (1-for-5 reverse split expected):
 * - 300 shares @ $4.50 → should become 60 @ $22.50
 * - 150 shares @ $4.49 → should become 30 @ $22.45
 * - 500 shares @ $4.06 → should become 100 @ $20.30
 * - 580 shares @ $3.44 → should become 116 @ $17.20
 */
export async function seedOxlcCusipReverseSplitData(): Promise<OxlcCusipSplitSeederResult> {
  const prisma = await initializePrismaClient();
  try {
    return await createSeedData(prisma);
  } catch (error) {
    await prisma.$disconnect();
    throw error;
  }
}
