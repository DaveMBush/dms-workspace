import { logger } from '../../../utils/structured-logger';
import { prisma } from '../../prisma/prisma-client';
import {
  classifySymbolRiskGroupId,
  lookupCefConnectSymbol,
  RiskGroupMap,
} from '../common/cef-classification.function';
import { fetchAndUpdatePriceData } from '../universe/fetch-and-update-price-data.function';

export async function buildCefClassification(
  symbol: string
): Promise<{ riskGroupId: string; isCef: boolean }> {
  const groups = await prisma.risk_group.findMany();
  const defaultGroup = groups.find((g) => g.name === 'Equities');
  if (!defaultGroup) {
    throw new Error(
      'Equities risk group not found in database. Cannot create universe entry.'
    );
  }
  const riskGroups: RiskGroupMap = {
    equities: defaultGroup.id,
    income: groups.find((g) => g.name === 'Income')?.id ?? defaultGroup.id,
    taxFree:
      groups.find((g) => g.name === 'Tax Free Income')?.id ?? defaultGroup.id,
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

export async function createUniverseEntry(
  symbol: string,
  riskGroupId: string,
  isCef: boolean
): Promise<{ id: string }> {
  const entry = await prisma.universe.create({
    data: {
      symbol,
      risk_group_id: riskGroupId,
      last_price: 0,
      distribution: 0,
      distributions_per_year: 0,
      ex_date: null,
      most_recent_sell_date: null,
      expired: false,
      is_closed_end_fund: isCef,
    },
  });
  try {
    await fetchAndUpdatePriceData(entry.id, symbol, entry, 'CUSIP resolution');
  } catch (error) {
    logger.warn(
      'Unexpected error during price/dividend fetch after CUSIP resolution',
      {
        symbol,
        error: error instanceof Error ? error.message : String(error),
      }
    );
  }
  return entry;
}
