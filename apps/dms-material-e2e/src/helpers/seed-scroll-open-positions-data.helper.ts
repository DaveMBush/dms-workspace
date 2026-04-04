import { generateUniqueId } from './generate-unique-id.helper';
import { fetchUniverseIds } from './shared-fetch-universe-ids.helper';
import { initializePrismaClient } from './shared-prisma-client.helper';
import { createRiskGroups } from './shared-risk-groups.helper';
import type { UniverseRecord } from './universe-record.types';

interface SeederResult {
  accountId: string;
  symbols: string[];
  cleanup(): Promise<void>;
}

const ROW_COUNT = 60;

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

/* eslint-disable @typescript-eslint/no-explicit-any -- Prisma createMany requires untyped batch data */
function createBulkTrades(accountId: string, universeIds: string[]): any[] {
  return universeIds.map(function mapTrade(universeId: string) {
    return {
      universeId,
      accountId,
      buy: 50.0,
      sell: 0,
      buy_date: new Date('2025-01-15'),
      quantity: 10,
      sell_date: null,
    };
  });
}
/* eslint-enable @typescript-eslint/no-explicit-any -- Re-enable */

/**
 * Seeds 60 open-position trades for scroll testing.
 * Creates universe records, an account, and open trades (sell_date=null).
 */
export async function seedScrollOpenPositionsData(): Promise<SeederResult> {
  const prisma = await initializePrismaClient();
  const uniqueId = generateUniqueId();
  const symbols = Array.from(
    { length: ROW_COUNT },
    function generateSymbol(_: unknown, i: number): string {
      return `OPSCRL${String(i).padStart(2, '0')}-${uniqueId}`;
    }
  );
  const accountName = `E2E-OP-Scroll-${uniqueId}`;
  let accountId = '';

  try {
    const riskGroups = await createRiskGroups(prisma);
    const records = createBulkUniverseRecords(
      symbols,
      riskGroups.equitiesRiskGroup.id
    );
    await prisma.universe.createMany({ data: records });
    const universeIds = await fetchUniverseIds(prisma, symbols);
    const account = await prisma.accounts.create({
      data: { name: accountName },
    });
    accountId = account.id;
    await prisma.trades.createMany({
      data: createBulkTrades(accountId, universeIds),
    });
  } catch (error) {
    await prisma.$disconnect();
    throw error;
  }

  return {
    accountId,
    symbols,
    cleanup: async function cleanupScrollOpenPositions(): Promise<void> {
      try {
        await prisma.trades.deleteMany({ where: { accountId } });
        await prisma.accounts.deleteMany({ where: { name: accountName } });
        await prisma.universe.deleteMany({
          where: { symbol: { in: symbols } },
        });
      } finally {
        await prisma.$disconnect();
      }
    },
  };
}
