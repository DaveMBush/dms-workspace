import type { PrismaClient } from '@prisma/client';

import { initializePrismaClient } from './shared-prisma-client.helper';
import { createRiskGroups } from './shared-risk-groups.helper';

const MSTY_SYMBOL = 'MSTY';
const ULTY_SYMBOL = 'ULTY';
const OXLC_SYMBOL = 'OXLC';
const COMBINED_ACCOUNT_NAME = 'Reverse Split Test Account';
const SPLIT_BUY_DATE = '2024-01-15';
const SPLIT_EX_DATE = '2025-09-01';

interface AllThreeSplitsSeederResult {
  accountId: string;
  mstyUniverseId: string;
  ultyUniverseId: string;
  oxlcUniverseId: string;
  cleanup(): Promise<void>;
}

interface ThreeUniverseIds {
  mstyUniverseId: string;
  ultyUniverseId: string;
  oxlcUniverseId: string;
}

interface ThreeUniverseRefs extends ThreeUniverseIds {
  mstyUniverse: { id: string };
  ultyUniverse: { id: string };
  oxlcUniverse: { id: string };
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

async function cleanupAllThreeSymbols(prisma: PrismaClient): Promise<void> {
  await cleanupSymbolData(prisma, MSTY_SYMBOL);
  await cleanupSymbolData(prisma, ULTY_SYMBOL);
  await cleanupSymbolData(prisma, OXLC_SYMBOL);
  await prisma.accounts.deleteMany({ where: { name: COMBINED_ACCOUNT_NAME } });
}

async function createThreeUniverses(
  prisma: PrismaClient,
  riskGroupId: string
): Promise<ThreeUniverseRefs> {
  const commonData = {
    risk_group_id: riskGroupId,
    distribution: 1.0,
    distributions_per_year: 12,
    ex_date: new Date(SPLIT_EX_DATE),
    expired: false,
    is_closed_end_fund: true,
  };
  const mstyUniverse = await prisma.universe.create({
    data: { symbol: MSTY_SYMBOL, last_price: 10.0, ...commonData },
  });
  const ultyUniverse = await prisma.universe.create({
    data: { symbol: ULTY_SYMBOL, last_price: 30.0, ...commonData },
  });
  const oxlcUniverse = await prisma.universe.create({
    data: { symbol: OXLC_SYMBOL, last_price: 5.0, ...commonData },
  });
  return {
    mstyUniverse,
    ultyUniverse,
    oxlcUniverse,
    mstyUniverseId: mstyUniverse.id,
    ultyUniverseId: ultyUniverse.id,
    oxlcUniverseId: oxlcUniverse.id,
  };
}

async function createAllThreeLots(
  prisma: PrismaClient,
  accountId: string,
  universeIds: ThreeUniverseIds
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma createMany requires untyped batch data
  const lotData: any[] = [
    {
      universeId: universeIds.mstyUniverseId,
      accountId,
      buy: 2.0,
      sell: 0,
      buy_date: new Date(SPLIT_BUY_DATE),
      quantity: 400,
      sell_date: null,
    },
    {
      universeId: universeIds.ultyUniverseId,
      accountId,
      buy: 3.0,
      sell: 0,
      buy_date: new Date(SPLIT_BUY_DATE),
      quantity: 1000,
      sell_date: null,
    },
    {
      universeId: universeIds.oxlcUniverseId,
      accountId,
      buy: 1.0,
      sell: 0,
      buy_date: new Date(SPLIT_BUY_DATE),
      quantity: 1530,
      sell_date: null,
    },
  ];
  await prisma.trades.createMany({ data: lotData });
}

async function createAllThreeSeedData(
  prisma: PrismaClient
): Promise<AllThreeSplitsSeederResult> {
  const riskGroups = await createRiskGroups(prisma);
  await cleanupAllThreeSymbols(prisma);

  const universes = await createThreeUniverses(
    prisma,
    riskGroups.equitiesRiskGroup.id
  );

  const account = await prisma.accounts.create({
    data: { name: COMBINED_ACCOUNT_NAME },
  });

  await createAllThreeLots(prisma, account.id, {
    mstyUniverseId: universes.mstyUniverseId,
    ultyUniverseId: universes.ultyUniverseId,
    oxlcUniverseId: universes.oxlcUniverseId,
  });

  return {
    accountId: account.id,
    mstyUniverseId: universes.mstyUniverseId,
    ultyUniverseId: universes.ultyUniverseId,
    oxlcUniverseId: universes.oxlcUniverseId,
    cleanup: async function cleanupAllThreeSplitData(): Promise<void> {
      try {
        await prisma.trades.deleteMany({ where: { accountId: account.id } });
        await prisma.accounts.deleteMany({ where: { id: account.id } });
        await prisma.universe.deleteMany({
          where: {
            id: {
              in: [
                universes.mstyUniverseId,
                universes.ultyUniverseId,
                universes.oxlcUniverseId,
              ],
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
