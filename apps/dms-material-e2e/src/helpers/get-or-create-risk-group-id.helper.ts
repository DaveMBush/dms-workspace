import type { PrismaClient } from '@prisma/client';

export async function getOrCreateRiskGroupId(
  prisma: PrismaClient
): Promise<string> {
  const rg = await prisma.risk_group.upsert({
    where: { name: 'Equities' },
    update: {},
    create: { name: 'Equities' },
  });
  return rg.id;
}
