import { generateUniqueId } from './generate-unique-id.helper';
import { initializePrismaClient } from './shared-prisma-client.helper';
import { createRiskGroups } from './shared-risk-groups.helper';

export async function createDeletableUniverseSymbol(): Promise<{
  symbol: string;
  cleanup(): Promise<void>;
}> {
  const prisma = await initializePrismaClient();
  const uniqueId = generateUniqueId();
  const symbol = `UDEL-${uniqueId}`;

  try {
    const riskGroups = await createRiskGroups(prisma);
    await prisma.universe.create({
      data: {
        symbol,
        risk_group_id: riskGroups.incomeRiskGroup.id,
        distribution: 0.3,
        distributions_per_year: 12,
        last_price: 15.0,
        ex_date: new Date('2026-01-15'),
        most_recent_sell_date: null,
        most_recent_sell_price: null,
        expired: false,
        is_closed_end_fund: false,
      },
    });
  } finally {
    await prisma.$disconnect();
  }

  return {
    symbol,
    cleanup: async function cleanupSymbol(): Promise<void> {
      const p = await initializePrismaClient();
      try {
        await p.universe.deleteMany({ where: { symbol } });
      } finally {
        await p.$disconnect();
      }
    },
  };
}
