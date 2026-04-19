import { generateUniqueId } from './generate-unique-id.helper';
import { initializePrismaClient } from './shared-prisma-client.helper';

interface SeederResult {
  accountId: string;
  symbols: string[];
  cleanup(): Promise<void>;
}

const ROW_COUNT = 60;
/** Number of existing universe entries to pull from the DB for deposit references. */
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

/**
 * Get or create a divDepositType named "Dividend" and return its id.
 */
async function getOrCreateDividendType(
  prisma: Awaited<ReturnType<typeof initializePrismaClient>>
): Promise<string> {
  const existing = await prisma.divDepositType.findFirst({
    where: { name: 'Dividend' },
  });
  if (existing !== null) {
    return existing.id;
  }
  try {
    const created = await prisma.divDepositType.create({
      data: { name: 'Dividend' },
    });
    return created.id;
  } catch {
    const refetched = await prisma.divDepositType.findFirst({
      where: { name: 'Dividend' },
    });
    if (refetched === null) {
      throw new Error('Failed to create or find Dividend type');
    }
    return refetched.id;
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any -- Prisma createMany requires untyped batch data */
function createBulkDivDeposits(
  accountId: string,
  divDepositTypeId: string,
  universeIds: string[]
): any[] {
  return universeIds.map(function mapDeposit(universeId: string, i: number) {
    return {
      accountId,
      divDepositTypeId,
      universeId,
      date: new Date(2025, i % 12, (i % 28) + 1),
      amount: 10.0 + i,
    };
  });
}
/* eslint-enable @typescript-eslint/no-explicit-any -- Re-enable */

/**
 * Seeds 60 dividend deposit rows for sort+scroll regression testing.
 * Re-uses existing universe entries (first 50 by createdAt asc) so that
 * buildUniverseMap always has their IDs loaded on account panel render.
 * Only creates an account and div deposits — no universe records are created or deleted.
 */
export async function seedScrollDivDepositsWithSymbolsData(): Promise<SeederResult> {
  const prisma = await initializePrismaClient();
  const uniqueId = generateUniqueId();
  const accountName = `E2E-DDS-Scroll-${uniqueId}`;
  let accountId = '';

  try {
    const baseUniverseIds = await fetchExistingUniverseIds(
      prisma,
      BASE_UNIVERSE_COUNT
    );
    // Cycle through the 50 base IDs to produce 60 deposit rows
    const universeIds = Array.from(
      { length: ROW_COUNT },
      function cycleId(_: unknown, i: number): string {
        return baseUniverseIds[i % baseUniverseIds.length];
      }
    );
    const divDepositTypeId = await getOrCreateDividendType(prisma);
    const account = await prisma.accounts.create({
      data: { name: accountName },
    });
    accountId = account.id;
    await prisma.divDeposits.createMany({
      data: createBulkDivDeposits(accountId, divDepositTypeId, universeIds),
    });
  } catch (error) {
    await prisma.$disconnect();
    throw error;
  }

  return {
    accountId,
    symbols: [],
    cleanup: async function cleanupScrollDivDepositsWithSymbols(): Promise<void> {
      try {
        await prisma.divDeposits.deleteMany({ where: { accountId } });
        await prisma.accounts.deleteMany({ where: { name: accountName } });
      } finally {
        await prisma.$disconnect();
      }
    },
  };
}
