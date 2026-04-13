import { logger } from '../../../../utils/structured-logger';
import { prisma } from '../../../prisma/prisma-client';
import {
  classifySymbolRiskGroupId,
  lookupCefConnectSymbol,
  RiskGroupMap,
} from '../common/cef-classification.function';
import { fetchAndUpdatePriceData } from '../fetch-and-update-price-data.function';
import type { UniverseRecord } from '../universe-record.interface';

interface AddSymbolRequest {
  symbol: string;
  risk_group_id: string;
}

interface AddSymbolResult {
  id: string;
  symbol: string;
  risk_group_id: string;
  distribution: number | null;
  distributions_per_year: number | null;
  ex_date: string | null;
  last_price: number | null;
  most_recent_sell_date: string | null;
  expired: boolean;
  is_closed_end_fund: boolean;
  createdAt: string;
  updatedAt: string;
  fetchFailed: boolean;
}

async function validateSymbolAndRiskGroup(
  symbol: string,
  riskGroupId: string
): Promise<void> {
  const existingSymbol = await prisma.universe.findFirst({
    where: { symbol: symbol.toUpperCase() },
  });

  if (existingSymbol) {
    throw new Error(`Symbol ${symbol} already exists in universe`);
  }

  const riskGroup = await prisma.risk_group.findUnique({
    where: { id: riskGroupId },
  });

  if (!riskGroup) {
    throw new Error(`Risk group with ID ${riskGroupId} not found`);
  }
}

function mapUniverseRecordToResult(
  universeRecord: UniverseRecord,
  fetchFailed: boolean
): AddSymbolResult {
  return {
    id: universeRecord.id,
    symbol: universeRecord.symbol,
    risk_group_id: universeRecord.risk_group_id,
    distribution:
      universeRecord.distribution !== 0 ? universeRecord.distribution : null,
    distributions_per_year:
      universeRecord.distributions_per_year !== 0
        ? universeRecord.distributions_per_year
        : null,
    ex_date: universeRecord.ex_date?.toISOString() ?? null,
    last_price:
      universeRecord.last_price !== 0 ? universeRecord.last_price : null,
    most_recent_sell_date: null,
    expired: universeRecord.expired,
    is_closed_end_fund: universeRecord.is_closed_end_fund,
    createdAt: universeRecord.createdAt.toISOString(),
    updatedAt: universeRecord.updatedAt.toISOString(),
    fetchFailed,
  };
}

async function resolveCefClassification(
  upperSymbol: string,
  risk_group_id: string,
  riskGroups: RiskGroupMap
): Promise<{ effectiveRiskGroupId: string; isCef: boolean }> {
  let effectiveRiskGroupId = risk_group_id;
  let isCef = false;
  try {
    const cefData = await lookupCefConnectSymbol(upperSymbol);
    if (cefData) {
      effectiveRiskGroupId =
        classifySymbolRiskGroupId(cefData, riskGroups) ?? risk_group_id;
      isCef = true;
    }
  } catch (error) {
    logger.warn(
      'CEF classification lookup failed; using request risk_group_id',
      {
        symbol: upperSymbol,
        error: error instanceof Error ? error.message : String(error),
      }
    );
  }
  return { effectiveRiskGroupId, isCef };
}

export async function addSymbol(
  request: AddSymbolRequest
): Promise<AddSymbolResult> {
  const { symbol, risk_group_id } = request;
  const upperSymbol = symbol.toUpperCase();

  await validateSymbolAndRiskGroup(upperSymbol, risk_group_id);

  const groups = await prisma.risk_group.findMany();
  const riskGroups: RiskGroupMap = {
    equities:
      groups.find(function findEquities(g) {
        return g.name === 'Equities';
      })?.id ?? risk_group_id,
    income:
      groups.find(function findIncome(g) {
        return g.name === 'Income';
      })?.id ?? risk_group_id,
    taxFree:
      groups.find(function findTaxFree(g) {
        return g.name === 'Tax Free Income';
      })?.id ?? risk_group_id,
  };

  const { effectiveRiskGroupId, isCef } = await resolveCefClassification(
    upperSymbol,
    risk_group_id,
    riskGroups
  );

  const universeRecord = await prisma.universe.create({
    data: {
      symbol: upperSymbol,
      risk_group_id: effectiveRiskGroupId,
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
    const { record, fetchFailed } = await fetchAndUpdatePriceData(
      universeRecord.id,
      upperSymbol,
      universeRecord,
      'manual symbol add'
    );
    return mapUniverseRecordToResult(record, fetchFailed);
  } catch (error) {
    logger.warn(
      'Unexpected error during price/dividend fetch after manual symbol add',
      {
        symbol: upperSymbol,
        error: error instanceof Error ? error.message : String(error),
      }
    );
    return mapUniverseRecordToResult(universeRecord, true);
  }
}
