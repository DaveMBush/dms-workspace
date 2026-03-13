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

function buildSoldTradeData(
  ids: { accountId: string; universeId: string },
  trade: {
    buyPrice: number;
    sellPrice: number;
    buyDate: string;
    sellDate: string;
    quantity: number;
  }
): Record<string, unknown> {
  return {
    universeId: ids.universeId,
    accountId: ids.accountId,
    buy: trade.buyPrice,
    sell: trade.sellPrice,
    buy_date: new Date(trade.buyDate),
    quantity: trade.quantity,
    sell_date: new Date(trade.sellDate),
  };
}

async function createSoldTrades(
  prisma: PrismaClient,
  accountId: string,
  universeIds: string[]
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma createMany requires untyped batch data
  const data: any[] = [
    // Symbol 0: bought 100, sold 180 → gain=8000 (qty 100), sell_date=2026-01-15
    buildSoldTradeData(
      { accountId, universeId: universeIds[0] },
      {
        buyPrice: 100,
        sellPrice: 180,
        buyDate: '2025-03-15',
        sellDate: '2026-01-15',
        quantity: 100,
      }
    ),
    // Symbol 1: bought 25, sold 30 → gain=250 (qty 50), sell_date=2025-11-20
    buildSoldTradeData(
      { accountId, universeId: universeIds[1] },
      {
        buyPrice: 25,
        sellPrice: 30,
        buyDate: '2025-06-01',
        sellDate: '2025-11-20',
        quantity: 50,
      }
    ),
    // Symbol 2: bought 90, sold 120 → gain=150 (qty 5), sell_date=2025-08-10
    buildSoldTradeData(
      { accountId, universeId: universeIds[2] },
      {
        buyPrice: 90,
        sellPrice: 120,
        buyDate: '2025-01-10',
        sellDate: '2025-08-10',
        quantity: 5,
      }
    ),
  ];
  await prisma.trades.createMany({ data });
}

export async function seedSoldPositionsE2eData(): Promise<SeederResult> {
  const prisma = await initializePrismaClient();
  const uniqueId = generateUniqueId();
  const symbols = [
    `SPAAA-${uniqueId}`,
    `SPBBB-${uniqueId}`,
    `SPCCC-${uniqueId}`,
  ];
  const accountName = `E2E-SP-Acct-${uniqueId}`;
  let accountId = '';

  try {
    const riskGroups = await createRiskGroups(prisma);
    await prisma.universe.createMany({
      data: createUniverseRecords(
        symbols,
        riskGroups,
        [180.0, 30.0, 120.0],
        [new Date('2026-06-15'), new Date('2026-03-01'), new Date('2026-09-20')]
      ),
    });
    const universeIds = await fetchUniverseIds(prisma, symbols);
    const account = await prisma.accounts.create({
      data: { name: accountName },
    });
    accountId = account.id;
    await createSoldTrades(prisma, accountId, universeIds);
  } catch (error) {
    await prisma.$disconnect();
    throw error;
  }

  return {
    accountId,
    symbols,
    cleanup: async function cleanupSoldPositionsData(): Promise<void> {
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
