import { Prisma, PrismaClient } from '@prisma/client';

import { prisma as defaultPrisma } from '../../prisma/prisma-client';
import { RiskGroupResult } from './risk-group-result.interface';

interface RawRiskGroupResult {
  riskGroupId?: string;
  riskGroupName?: string;
  totalCostBasis?: number | string;
  tradeCount?: number | string;
}

export async function getRiskGroupData(
  year: number,
  monthNum: number,
  accountId?: string,
  prisma: PrismaClient = defaultPrisma
): Promise<RiskGroupResult[]> {
  const rawResults = await prisma.$queryRaw<RawRiskGroupResult[]>`
    SELECT
      rg.id as riskGroupId,
      rg.name as riskGroupName,
      SUM(t.buy * t.quantity) as totalCostBasis,
      COUNT(t.id) as tradeCount
    FROM trades t
    JOIN universe u ON t."universeId" = u.id
    JOIN risk_group rg ON u.risk_group_id = rg.id
    WHERE (t.sell_date IS NULL OR
          (t.sell_date >= ${new Date(year, monthNum - 1, 1)} AND
            t.sell_date < ${new Date(year, monthNum, 1)}))
      ${
        accountId !== undefined && accountId !== ''
          ? Prisma.sql`AND t."accountId" = ${accountId}`
          : Prisma.empty
      }
    GROUP BY rg.id, rg.name
  `;

  // Convert PostgreSQL string results to numbers
  // and handle column name differences
  function transformRiskGroupResult(row: RawRiskGroupResult): RiskGroupResult {
    return {
      riskGroupId: row.riskGroupId ?? row.riskGroupId ?? '',
      riskGroupName: row.riskGroupName ?? row.riskGroupName ?? '',
      totalCostBasis: Number(row.totalCostBasis ?? row.totalCostBasis ?? 0),
      tradeCount: Number(row.tradeCount ?? row.tradeCount ?? 0),
    };
  }

  return rawResults.map(transformRiskGroupResult);
}
