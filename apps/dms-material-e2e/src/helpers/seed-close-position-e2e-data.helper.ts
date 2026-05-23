import type { PrismaClient } from '@prisma/client';

import { generateUniqueId } from './generate-unique-id.helper';
import type { SeederResultBase } from './seeder-result-base.types';
import { fetchUniverseIds } from './shared-fetch-universe-ids.helper';
import { initializePrismaClient } from './shared-prisma-client.helper';
import { createRiskGroups } from './shared-risk-groups.helper';

interface SeederResult extends SeederResultBase {
  accountId: string;
}

async function createOpenTrade(
  prisma: PrismaClient,
  accountId: string,
  universeId: string
): Promise<void> {
  await prisma.trades.create({
    data: {
      universeId,
      accountId,
      buy: 100,
      sell: 0,
      buy_date: new Date('2025-01-15'),
      quantity: 10,
      sell_date: null,
    },
  });
}

async function createTestUniverse(
  prisma: PrismaClient,
  symbol: string,
  riskGroupId: string
): Promise<void> {
  await prisma.universe.create({
    data: {
      symbol,
      risk_group_id: riskGroupId,
      distribution: 1.0,
      distributions_per_year: 4,
      last_price: 120.0,
      ex_date: new Date('2026-06-15'),
      most_recent_sell_date: null,
      most_recent_sell_price: null,
      expired: false,
      is_closed_end_fund: true,
    },
  });
}

/**
 * Seeds one open-position trade for the Epic 107 close-position E2E test.
 * Creates its own universe record, account, and trade — fully hermetic.
 * The trade has sell=0, sell_date=null so it appears in Open Positions.
 * Cleanup removes trades, account, and universe rows for the unique symbol.
 */
export async function seedClosePositionE2eData(): Promise<SeederResult> {
  const prisma = await initializePrismaClient();
  const uniqueId = generateUniqueId();
  const symbol = `CP107-${uniqueId}`;
  const symbols = [symbol];
  const accountName = `E2E-CP107-Acct-${uniqueId}`;
  let accountId = '';

  try {
    const riskGroups = await createRiskGroups(prisma);
    await createTestUniverse(prisma, symbol, riskGroups.equitiesRiskGroup.id);
    const universeIds = await fetchUniverseIds(prisma, symbols);
    const account = await prisma.accounts.create({
      data: { name: accountName },
    });
    accountId = account.id;
    await createOpenTrade(prisma, accountId, universeIds[0]);
  } catch (error) {
    await prisma.$disconnect();
    throw error;
  }

  return {
    accountId,
    symbols,
    cleanup: async function cleanupClosePositionData(): Promise<void> {
      try {
        await prisma.trades.deleteMany({
          where: { accountId },
        });
        await prisma.accounts.deleteMany({
          where: { name: accountName },
        });
        await prisma.universe.deleteMany({
          where: { symbol: { in: symbols } },
        });
      } finally {
        await prisma.$disconnect();
      }
    },
  };
}
