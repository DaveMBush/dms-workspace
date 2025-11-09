import { Prisma, PrismaClient } from '@prisma/client';

import { prisma as defaultPrisma } from '../../prisma/prisma-client';
import { RiskGroupResult } from './risk-group-result.interface';

/**
 * IMPORTANT: This interface must include both camelCase and lowercase versions
 * of property names. SQLite returns camelCase (as defined in SELECT aliases),
 * but PostgreSQL returns all lowercase regardless of alias casing.
 * Do not remove the lowercase properties - they are required for PostgreSQL.
 */
interface RawRiskGroupResult {
  // SQLite column names (camelCase)
  riskGroupId?: string;
  riskGroupName?: string;
  totalCostBasis?: number | string;
  tradeCount?: number | string;
  // PostgreSQL column names (lowercase)
  riskgroupid?: string;
  riskgroupname?: string;
  totalcostbasis?: number | string;
  tradecount?: number | string;
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

  /**
   * Transform raw database results to typed RiskGroupResult.
   * CRITICAL: Uses nullish coalescing to check both camelCase (SQLite)
   * and lowercase (PostgreSQL) property names. Do not simplify - both
   * checks are required for cross-database compatibility.
   */
  function transformRiskGroupResult(row: RawRiskGroupResult): RiskGroupResult {
    return {
      riskGroupId: row.riskGroupId ?? row.riskgroupid ?? '',
      riskGroupName: row.riskGroupName ?? row.riskgroupname ?? '',
      totalCostBasis: Number(row.totalCostBasis ?? row.totalcostbasis ?? 0),
      tradeCount: Number(row.tradeCount ?? row.tradecount ?? 0),
    };
  }

  return rawResults.map(transformRiskGroupResult);
}
