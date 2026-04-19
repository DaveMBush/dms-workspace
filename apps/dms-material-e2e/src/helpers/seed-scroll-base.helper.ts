import { fetchExistingUniverseIds } from './seed-scroll-fetch-universe-ids.helper';
import { initializePrismaClient } from './shared-prisma-client.helper';

const ROW_COUNT = 60;
const BASE_UNIVERSE_COUNT = 50;

/* eslint-disable @typescript-eslint/no-explicit-any -- Prisma createMany requires untyped batch data */
/**
 * Shared try-block for scroll trade seeders: fetches universe IDs, cycles them,
 * creates the account, and inserts bulk trade data via the provided factory.
 */
export async function seedScrollTradesCommon(
  prisma: Awaited<ReturnType<typeof initializePrismaClient>>,
  accountName: string,
  bulkDataFn: (accountId: string, universeIds: string[]) => any[]
): Promise<string> {
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
  const account = await prisma.accounts.create({
    data: { name: accountName },
  });
  await prisma.trades.createMany({
    data: bulkDataFn(account.id, universeIds),
  });
  return account.id;
}
/* eslint-enable @typescript-eslint/no-explicit-any -- Re-enable */
