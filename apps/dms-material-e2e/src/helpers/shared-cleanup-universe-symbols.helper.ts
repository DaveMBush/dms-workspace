import type { PrismaClient } from '@prisma/client';

/**
 * Deletes all universe rows for the given symbols, along with their associated
 * trades and divDeposits, then disconnects the Prisma client.
 */
export async function cleanupUniverseBySymbols(
  prisma: PrismaClient,
  symbols: string[]
): Promise<void> {
  try {
    const universeRows = await prisma.universe.findMany({
      where: { symbol: { in: symbols } },
      select: { id: true },
    });
    const universeIds = universeRows.map(function extractId(row: {
      id: string;
    }): string {
      return row.id;
    });
    if (universeIds.length > 0) {
      await prisma.trades.deleteMany({
        where: { universeId: { in: universeIds } },
      });
      await prisma.divDeposits.deleteMany({
        where: { universeId: { in: universeIds } },
      });
    }
    await prisma.universe.deleteMany({
      where: { symbol: { in: symbols } },
    });
  } finally {
    await prisma.$disconnect();
  }
}
