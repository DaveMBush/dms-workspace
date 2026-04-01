import { prisma } from '../../../prisma/prisma-client';
import { getDistributions } from '../../settings/common/get-distributions.function';
import { getLastPrice } from '../../settings/common/get-last-price.function';
import { logger } from '../../../../utils/structured-logger';

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

interface UniverseRecord {
  id: string;
  symbol: string;
  risk_group_id: string;
  distribution: number;
  distributions_per_year: number;
  ex_date: Date | null;
  last_price: number;
  expired: boolean;
  is_closed_end_fund: boolean;
  createdAt: Date;
  updatedAt: Date;
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

export async function addSymbol(
  request: AddSymbolRequest
): Promise<AddSymbolResult> {
  const { symbol, risk_group_id } = request;
  const upperSymbol = symbol.toUpperCase();

  await validateSymbolAndRiskGroup(upperSymbol, risk_group_id);

  const universeRecord = await prisma.universe.create({
    data: {
      symbol: upperSymbol,
      risk_group_id,
      last_price: 0,
      distribution: 0,
      distributions_per_year: 0,
      ex_date: null,
      most_recent_sell_date: null,
      expired: false,
      is_closed_end_fund: false,
    },
  });

  try {
    const [lastPrice, distributionData] = await Promise.all([
      getLastPrice(upperSymbol),
      getDistributions(upperSymbol),
    ]);

    if (lastPrice === undefined && distributionData === undefined) {
      logger.warn(
        'Price and dividend fetch failed after manual symbol add',
        { symbol: upperSymbol }
      );
      return mapUniverseRecordToResult(universeRecord, true);
    }

    const updatedRecord = await prisma.universe.update({
      where: { id: universeRecord.id },
      data: {
        last_price: lastPrice ?? 0,
        distribution: distributionData?.distribution ?? 0,
        distributions_per_year: distributionData?.distributions_per_year ?? 0,
        ex_date: distributionData?.ex_date ?? null,
      },
    });

    return mapUniverseRecordToResult(updatedRecord as UniverseRecord, false);
  } catch (error) {
    logger.warn(
      'Unexpected error during price/dividend fetch after manual symbol add',
      { symbol: upperSymbol, error: error instanceof Error ? error.message : String(error) }
    );
    return mapUniverseRecordToResult(universeRecord, true);
  }
}
