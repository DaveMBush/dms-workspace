import type { PrismaClient } from '@prisma/client';

/**
 * Deletes the trades, account, and universe rows created by a seeder, then
 * disconnects the Prisma client.
 */
export async function cleanupSeederData(
  prisma: PrismaClient,
  accountId: string,
  accountName: string,
  symbols: string[],
): Promise<void> {
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
}
