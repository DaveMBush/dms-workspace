import type { PrismaClient } from '@prisma/client';

export async function fetchUniverseIds(
  prisma: PrismaClient,
  symbols: string[]
): Promise<string[]> {
  const created = await prisma.universe.findMany({
    where: { symbol: { in: symbols } },
    select: { id: true, symbol: true },
  });
  return symbols.map(function findId(sym: string): string {
    const found = created.find(function matchSymbol(u): boolean {
      return u.symbol === sym;
    });
    return found!.id;
  });
}
