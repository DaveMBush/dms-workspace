import type { PrismaClient } from '@prisma/client';

export async function cleanupUniverseOnError(
  prisma: PrismaClient,
  universeId: string,
  accountId: string
): Promise<void> {
  function suppressError(): undefined {
    return undefined;
  }
  if (universeId !== '') {
    await prisma.divDeposits
      .deleteMany({ where: { universeId } })
      .catch(suppressError);
    await prisma.universe
      .delete({ where: { id: universeId } })
      .catch(suppressError);
  }
  if (accountId !== '') {
    await prisma.accounts
      .delete({ where: { id: accountId } })
      .catch(suppressError);
  }
}
