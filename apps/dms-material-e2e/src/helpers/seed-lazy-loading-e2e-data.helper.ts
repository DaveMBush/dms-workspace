import type { PrismaClient } from '@prisma/client';

import { generateUniqueId } from './generate-unique-id.helper';
import { initializePrismaClient } from './shared-prisma-client.helper';
import { createRiskGroups } from './shared-risk-groups.helper';
import type { UniverseRecord } from './universe-record.types';

const UNIVERSE_ROW_COUNT = 120;
const OPEN_POSITIONS_COUNT = 80;

interface LazyLoadingSeederResult {
  cleanup(): Promise<void>;
  universeSymbols: string[];
  accountId: string;
  openPositionSymbols: string[];
}

function createBulkUniverseRecords(
  symbols: string[],
  riskGroupId: string
): UniverseRecord[] {
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);

  return symbols.map(function mapSymbol(symbol): UniverseRecord {
    return {
      symbol,
      risk_group_id: riskGroupId,
      distribution: 1.0,
      distributions_per_year: 4,
      last_price: 50.0,
      ex_date: futureDate,
      most_recent_sell_date: null,
      most_recent_sell_price: null,
      expired: false,
      is_closed_end_fund: true,
    };
  });
}

async function createOpenPositionTrades(
  prisma: PrismaClient,
  accountId: string,
  universeIds: string[]
): Promise<void> {
  const data = universeIds.map(function buildTrade(
    universeId: string,
    index: number
  ): Record<string, unknown> {
    return {
      universeId,
      accountId,
      buy: 10 + index,
      sell: 0,
      buy_date: new Date('2025-01-15'),
      quantity: 10,
      sell_date: null,
    };
  });
  await prisma.trades.createMany({ data });
}

async function seedRecordsIntoDb(
  prisma: PrismaClient,
  universeSymbols: string[],
  openPositionSymbols: string[],
  accountName: string
): Promise<string> {
  const riskGroups = await createRiskGroups(prisma);
  const riskGroupId = riskGroups.equitiesRiskGroup.id;

  // Create universe records for both universe table and open positions
  const allSymbols = [...universeSymbols, ...openPositionSymbols];
  const allRecords = createBulkUniverseRecords(allSymbols, riskGroupId);
  await prisma.universe.createMany({ data: allRecords });

  // Create account and trades for open positions
  const account = await prisma.accounts.create({
    data: { name: accountName },
  });

  const opUniverseRows = await prisma.universe.findMany({
    where: { symbol: { in: openPositionSymbols } },
    select: { id: true, symbol: true },
  });
  const symbolToId = new Map<string, string>();
  for (const entry of opUniverseRows) {
    symbolToId.set(entry.symbol, entry.id);
  }
  const opUniverseIds = openPositionSymbols.map(function findId(
    sym: string
  ): string {
    const id = symbolToId.get(sym);
    if (id === undefined) {
      throw new Error(`Universe record not found for symbol: ${sym}`);
    }
    return id;
  });

  await createOpenPositionTrades(prisma, account.id, opUniverseIds);
  return account.id;
}

function generateSymbols(
  prefix: string,
  count: number,
  uniqueId: string
): string[] {
  return Array.from(
    { length: count },
    function generateSymbol(_: unknown, i: number): string {
      return `${prefix}${String(i).padStart(3, '0')}-${uniqueId}`;
    }
  );
}

async function cleanupPartialSeed(
  prisma: PrismaClient,
  accountName: string,
  allSymbols: string[]
): Promise<void> {
  const seededAccount = await prisma.accounts.findFirst({
    where: { name: accountName },
    select: { id: true },
  });
  if (seededAccount !== null) {
    await prisma.trades.deleteMany({
      where: { accountId: seededAccount.id },
    });
    await prisma.accounts.delete({
      where: { id: seededAccount.id },
    });
  }
  await prisma.universe.deleteMany({
    where: { symbol: { in: allSymbols } },
  });
}

export async function seedLazyLoadingE2eData(): Promise<LazyLoadingSeederResult> {
  const prisma = await initializePrismaClient();
  const uniqueId = generateUniqueId();

  const universeSymbols = generateSymbols('ULZY', UNIVERSE_ROW_COUNT, uniqueId);
  const openPositionSymbols = generateSymbols(
    'OLZY',
    OPEN_POSITIONS_COUNT,
    uniqueId
  );
  const accountName = `E2E-Lazy-Acct-${uniqueId}`;
  const allSymbols = [...universeSymbols, ...openPositionSymbols];
  let accountId = '';

  try {
    accountId = await seedRecordsIntoDb(
      prisma,
      universeSymbols,
      openPositionSymbols,
      accountName
    );
  } catch (error) {
    await cleanupPartialSeed(prisma, accountName, allSymbols).finally(
      async function disconnect(): Promise<void> {
        await prisma.$disconnect();
      }
    );
    throw error;
  }

  return {
    universeSymbols,
    accountId,
    openPositionSymbols,
    cleanup: async function cleanupLazyLoadingData(): Promise<void> {
      try {
        await prisma.trades.deleteMany({
          where: { accountId },
        });
        await prisma.accounts.deleteMany({
          where: { name: accountName },
        });
        await prisma.universe.deleteMany({
          where: { symbol: { in: allSymbols } },
        });
      } finally {
        await prisma.$disconnect();
      }
    },
  };
}
