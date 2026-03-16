import type { PrismaClient } from '@prisma/client';

import { generateUniqueId } from './generate-unique-id.helper';
import type { SeederResultBase } from './seeder-result-base.types';
import { createUniverseRecords } from './shared-create-universe-records.helper';
import { fetchUniverseIds } from './shared-fetch-universe-ids.helper';
import { initializePrismaClient } from './shared-prisma-client.helper';
import { createRiskGroups } from './shared-risk-groups.helper';

interface SeederResult extends SeederResultBase {
  accountId: string;
}

function buildTradeData(
  ids: { accountId: string; universeId: string },
  trade: { buyPrice: number; buyDate: string; quantity: number }
): Record<string, unknown> {
  return {
    universeId: ids.universeId,
    accountId: ids.accountId,
    buy: trade.buyPrice,
    sell: 0,
    buy_date: new Date(trade.buyDate),
    quantity: trade.quantity,
    sell_date: null,
  };
}

async function createTrades(
  prisma: PrismaClient,
  accountId: string,
  universeIds: string[]
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma createMany requires untyped batch data
  const data: any[] = [
    // Symbol 0: buy=100, lastPrice=120 → gain%=20%, gain$=200 (qty 10)
    buildTradeData(
      { accountId, universeId: universeIds[0] },
      { buyPrice: 100, buyDate: '2025-01-15', quantity: 10 }
    ),
    // Symbol 1: buy=25, lastPrice=30 → gain%=20%, gain$=250 (qty 50)
    buildTradeData(
      { accountId, universeId: universeIds[1] },
      { buyPrice: 25, buyDate: '2025-06-01', quantity: 50 }
    ),
    // Symbol 2: buy=90, lastPrice=80 → gain%=-11.1%, gain$=-50 (qty 5)
    buildTradeData(
      { accountId, universeId: universeIds[2] },
      { buyPrice: 90, buyDate: '2025-03-10', quantity: 5 }
    ),
  ];
  await prisma.trades.createMany({ data });
}

export async function seedOpenPositionsE2eData(): Promise<SeederResult> {
  const prisma = await initializePrismaClient();
  const uniqueId = generateUniqueId();
  const symbols = [
    `OPAAA-${uniqueId}`,
    `OPBBB-${uniqueId}`,
    `OPCCC-${uniqueId}`,
  ];
  const accountName = `E2E-OP-Acct-${uniqueId}`;
  let accountId = '';

  try {
    const riskGroups = await createRiskGroups(prisma);
    await prisma.universe.createMany({
      data: createUniverseRecords(
        symbols,
        riskGroups,
        [120.0, 30.0, 80.0],
        [new Date('2026-06-15'), new Date('2026-03-01'), new Date('2026-09-20')]
      ),
    });
    const universeIds = await fetchUniverseIds(prisma, symbols);
    const account = await prisma.accounts.create({
      data: { name: accountName },
    });
    accountId = account.id;
    await createTrades(prisma, accountId, universeIds);
  } catch (error) {
    await prisma.$disconnect();
    throw error;
  }

  return {
    accountId,
    symbols,
    cleanup: async function cleanupOpenPositionsData(): Promise<void> {
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
