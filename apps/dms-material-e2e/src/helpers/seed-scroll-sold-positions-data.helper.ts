import { generateUniqueId } from './generate-unique-id.helper';
import { seedScrollTradesCommon } from './seed-scroll-base.helper';
import { initializePrismaClient } from './shared-prisma-client.helper';

interface SeederResult {
  accountId: string;
  symbols: string[];
  cleanup(): Promise<void>;
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
 *
 * When `targetAccountId` is provided (e.g. a well-known DB account UUID), account
 * creation is skipped and that ID is used directly.  Cleanup will only delete
 * the seeded trades, not the pre-existing account.
 */
export async function seedScrollSoldPositionsData(
  targetAccountId?: string
): Promise<SeederResult> {
  const prisma = await initializePrismaClient();
  const uniqueId = generateUniqueId();
  const accountName = `E2E-SD-Scroll-${uniqueId}`;
  let accountId = '';
  let isNewAccount = true;

  try {
    const result = await seedScrollTradesCommon(
      prisma,
      accountName,
      createBulkSoldTrades,
      targetAccountId
    );
    accountId = result.accountId;
    isNewAccount = result.isNewAccount;
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
        if (isNewAccount) {
          await prisma.accounts.deleteMany({ where: { name: accountName } });
        }
      } finally {
        await prisma.$disconnect();
      }
    },
  };
}
