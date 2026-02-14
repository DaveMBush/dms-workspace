import type { PrismaClient } from '@prisma/client';

import type { RiskGroups } from './risk-groups.types';

/**
 * Create risk groups in the database
 */
export async function createRiskGroups(
  prisma: PrismaClient
): Promise<RiskGroups> {
  const equitiesRiskGroup = await prisma.risk_group.upsert({
    where: { name: 'Equities' },
    update: {},
    create: { name: 'Equities' },
  });

  const incomeRiskGroup = await prisma.risk_group.upsert({
    where: { name: 'Income' },
    update: {},
    create: { name: 'Income' },
  });

  const taxFreeIncomeRiskGroup = await prisma.risk_group.upsert({
    where: { name: 'Tax Free Income' },
    update: {},
    create: { name: 'Tax Free Income' },
  });

  return { equitiesRiskGroup, incomeRiskGroup, taxFreeIncomeRiskGroup };
}
