import { generateUniqueId } from './generate-unique-id.helper';
import { initializePrismaClient } from './shared-prisma-client.helper';

interface SeederResult {
  accountId: string;
  symbols: string[];
  cleanup(): Promise<void>;
}

const ROW_COUNT = 60;
/** Number of existing universe entries to pull from the DB for trade references. */
const BASE_UNIVERSE_COUNT = 50;

/**
 * Fetch the first N existing universe IDs ordered by createdAt asc.
 * These are always in the initial page returned by /api/top (page size = 50),
 * so buildUniverseMap will have them loaded when the account panel renders.
 */
async function fetchExistingUniverseIds(
  prisma: Awaited<ReturnType<typeof initializePrismaClient>>,
  count: number
): Promise<string[]> {
  const universes = await prisma.universe.findMany({
    select: { id: true },
    orderBy: { createdAt: 'asc' },
    take: count,
  });
  if (universes.length === 0) {
    throw new Error('No universe entries found in the database');
  }
  return universes.map(function getId(u) {
    return u.id;
  });
}

/* eslint-disable @typescript-eslint/no-explicit-any -- Prisma createMany requires untyped batch data */
function createBulkSoldTrades(accountId: string, universeIds: string[]): any[] {
  return universeIds.map(function mapTrade(universeId: string) {
    return {
      universeId,
      accountId,
      buy: 50.0,
      sell: 55.0,
      buy_date: new Date('2025-01-15'),
      quantity: 10,
      sell_date: new Date('2025-06-15'),
    };
  });
}
/* eslint-enable @typescript-eslint/no-explicit-any -- Re-enable */

/**
 * Seeds 60 closed (sold) trades for sort+scroll regression testing.
 * Re-uses existing universe entries (first 50 by createdAt asc) so that
 * buildUniverseMap always has their IDs loaded on account panel render.
 * Only creates an account and trades — no universe records are created or deleted.
 */
export async function seedScrollSoldPositionsData(): Promise<SeederResult> {
  const prisma = await initializePrismaClient();
  const uniqueId = generateUniqueId();
  const accountName = `E2E-SD-Scroll-${uniqueId}`;
  let accountId = '';

  try {
    const baseUniverseIds = await fetchExistingUniverseIds(
      prisma,
      BASE_UNIVERSE_COUNT
    );
    // Cycle through the 50 base IDs to produce 60 trade rows
    const universeIds = Array.from(
      { length: ROW_COUNT },
      function cycleId(_: unknown, i: number): string {
        return baseUniverseIds[i % baseUniverseIds.length];
      }
    );
    const account = await prisma.accounts.create({
      data: { name: accountName },
    });
    accountId = account.id;
    await prisma.trades.createMany({
      data: createBulkSoldTrades(accountId, universeIds),
    });
  } catch (error) {
    await prisma.$disconnect();
    throw error;
  }

  return {
    accountId,
    symbols: [],
    cleanup: async function cleanupScrollSoldPositions(): Promise<void> {
      try {
        await prisma.trades.deleteMany({ where: { accountId } });
        await prisma.accounts.deleteMany({ where: { name: accountName } });
      } finally {
        await prisma.$disconnect();
      }
    },
  };
}
