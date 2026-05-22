import { fetchExistingUniverseIds } from './seed-scroll-fetch-universe-ids.helper';
import { initializePrismaClient } from './shared-prisma-client.helper';

const ROW_COUNT = 60;
const BASE_UNIVERSE_COUNT = 50;

/* eslint-disable @typescript-eslint/no-explicit-any -- Prisma createMany requires untyped batch data */
/**
 * Shared try-block for scroll trade seeders: fetches universe IDs, cycles them,
 * optionally creates the account (or reuses a well-known account), and inserts
 * bulk trade data via the provided factory.
 *
 * When `targetAccountId` is provided the account creation step is skipped and
 * the given ID is used directly.  The caller is responsible for not deleting
 * the pre-existing account during cleanup.
 *
 * Returns `{ accountId, isNewAccount }` so callers can decide whether to
 * delete the account in their cleanup function.
 */
export async function seedScrollTradesCommon(
  prisma: Awaited<ReturnType<typeof initializePrismaClient>>,
  accountName: string,
  bulkDataFn: (accountId: string, universeIds: string[]) => any[],
  targetAccountId?: string
): Promise<{ accountId: string; isNewAccount: boolean }> {
  const baseUniverseIds = await fetchExistingUniverseIds(
    prisma,
    BASE_UNIVERSE_COUNT
  );
  const universeIds = Array.from(
    { length: ROW_COUNT },
    function cycleId(_: unknown, i: number): string {
      return baseUniverseIds[i % baseUniverseIds.length];
    }
  );
  let accountId: string;
  let isNewAccount: boolean;
  if (targetAccountId !== undefined) {
    accountId = targetAccountId;
    isNewAccount = false;
  } else {
    const account = await prisma.accounts.create({
      data: { name: accountName },
    });
    accountId = account.id;
    isNewAccount = true;
  }
  await prisma.trades.createMany({
    data: bulkDataFn(accountId, universeIds),
  });
  return { accountId, isNewAccount };
}
/* eslint-enable @typescript-eslint/no-explicit-any -- Re-enable */
