import { prisma } from '../../../prisma/prisma-client';

type PrismaRiskGroup = Awaited<ReturnType<typeof prisma.risk_group.findMany>>[number];

export async function ensureRiskGroupsExist(): Promise<PrismaRiskGroup[]> {
  const existingRiskGroups = await prisma.risk_group.findMany();

  const requiredGroups = ['Equities', 'Income', 'Tax Free Income'];
  const results: PrismaRiskGroup[] = [];

  for (const groupName of requiredGroups) {
    let group = existingRiskGroups.find(function findGroup(riskGroup) {
      return riskGroup.name === groupName;
    });

    if (!group) {
      group = await prisma.risk_group.create({
        data: { name: groupName },
      });
    }

    results.push(group);
  }

  return results;
}