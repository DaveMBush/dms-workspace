import { initializePrismaClient } from './shared-prisma-client.helper';

export async function fetchExistingUniverseIds(
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
