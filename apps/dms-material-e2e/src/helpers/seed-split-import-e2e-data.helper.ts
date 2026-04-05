import type { PrismaClient } from '@prisma/client';

import { initializePrismaClient } from './shared-prisma-client.helper';
import { createRiskGroups } from './shared-risk-groups.helper';

export interface SplitImportSeederResult {
  accountId: string;
  universeId: string;
  cleanup(): Promise<void>;
}

const OXLC_SYMBOL = 'OXLC';
const ACCOUNT_NAME = 'OXLC Split Test Account';

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma createMany requires untyped batch data
  const lotData: any[] = [
    {
      universeId: universe.id,
      accountId: account.id,
      buy: 4.0,
      sell: 0,
      buy_date: new Date('2024-01-15'),
      quantity: 500,
      sell_date: null,
    },
    {
      universeId: universe.id,
      accountId: account.id,
      buy: 3.8,
      sell: 0,
      buy_date: new Date('2024-03-01'),
      quantity: 500,
      sell_date: null,
    },
    {
      universeId: universe.id,
      accountId: account.id,
      buy: 3.6,
      sell: 0,
      buy_date: new Date('2024-06-01'),
      quantity: 530,
      sell_date: null,
    },
  ];
  await prisma.trades.createMany({ data: lotData });

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
