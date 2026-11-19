import { logger } from '../../../utils/structured-logger';
import { prisma } from '../../prisma/prisma-client';
import {
  classifySymbolRiskGroupId,
  lookupCefConnectSymbol,
  RiskGroupMap,
} from '../common/cef-classification.function';

export async function buildCefClassification(
  symbol: string
): Promise<{ riskGroupId: string; isCef: boolean }> {
  const groups = await prisma.risk_group.findMany();
  const defaultGroup = groups.find(function findEquities(g) {
    return g.name === 'Equities';
  });
  if (!defaultGroup) {
    throw new Error(
      'Equities risk group not found in database. Cannot create universe entry.'
    );
  }
  const riskGroups: RiskGroupMap = {
    equities: defaultGroup.id,
    income:
      groups.find(function findIncome(g) {
        return g.name === 'Income';
      })?.id ?? defaultGroup.id,
    taxFree:
      groups.find(function findTaxFree(g) {
        return g.name === 'Tax Free Income';
      })?.id ?? defaultGroup.id,
  };
  try {
    const cefData = await lookupCefConnectSymbol(symbol);
    if (cefData) {
      return {
        riskGroupId:
          classifySymbolRiskGroupId(cefData, riskGroups) ?? defaultGroup.id,
        isCef: true,
      };
    }
  } catch (error) {
    logger.warn('CEF classification lookup failed; using default risk group', {
      symbol,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  return { riskGroupId: defaultGroup.id, isCef: false };
}
