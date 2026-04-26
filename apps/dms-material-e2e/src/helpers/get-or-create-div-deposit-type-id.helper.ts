import type { PrismaClient } from '@prisma/client';

export async function getOrCreateDivDepositTypeId(
  prisma: PrismaClient
): Promise<string> {
  const existing = await prisma.divDepositType.findFirst({
    where: { name: 'Dividend' },
  });
  if (existing !== null) {
    return existing.id;
  }
  return (await prisma.divDepositType.create({ data: { name: 'Dividend' } }))
    .id;
}
