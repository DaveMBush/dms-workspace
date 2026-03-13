import type { PrismaClient } from '@prisma/client';

export async function fetchUniverseIds(
  prisma: PrismaClient,
  symbols: string[]
): Promise<string[]> {
  const created = await prisma.universe.findMany({
    where: { symbol: { in: symbols } },
    select: { id: true, symbol: true },
  });
  const symbolToId = new Map<string, string>();
  for (const entry of created) {
    symbolToId.set(entry.symbol, entry.id);
  }
  return symbols.map(function findId(sym: string): string {
    const id = symbolToId.get(sym);
    if (id === undefined) {
      throw new Error(`Universe record not found for symbol: ${sym}`);
    }
    return id;
  });
}
