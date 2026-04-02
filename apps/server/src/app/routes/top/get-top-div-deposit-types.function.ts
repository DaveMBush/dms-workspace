import { prisma } from '../../prisma/prisma-client';

export async function getTopDivDepositTypes(): Promise<string[]> {
  let divDepositTypes = await prisma.divDepositType.findMany({
    select: {
      id: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  if (divDepositTypes.length === 0) {
    await prisma.divDepositType.create({
      data: {
        name: 'Dividend',
      },
    });
    await prisma.divDepositType.create({
      data: {
        name: 'Deposit',
      },
    });
    divDepositTypes = await prisma.divDepositType.findMany({
      select: {
        id: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  return divDepositTypes.map(function mapDivDepositType(divDepositType) {
    return divDepositType.id;
  });
}
