import { logger } from '../../../utils/structured-logger';
import { prisma } from '../../prisma/prisma-client';
import { getDistributions } from '../settings/common/get-distributions.function';
import { getLastPrice } from '../settings/common/get-last-price.function';

export interface UniverseRecord {
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

export interface FetchResult {
  record: UniverseRecord;
  fetchFailed: boolean;
}

export async function fetchAndUpdatePriceData(
  universeId: string,
  symbol: string,
  fallbackRecord: UniverseRecord,
  logContext: string = 'symbol add'
): Promise<FetchResult> {
  const [lastPrice, distributionData] = await Promise.all([
    getLastPrice(symbol),
    getDistributions(symbol),
  ]);

  if (lastPrice === undefined && distributionData === undefined) {
    logger.warn(`Price and dividend fetch failed after ${logContext}`, {
      symbol,
    });
    return { record: fallbackRecord, fetchFailed: true };
  }

  const updatedRecord = await prisma.universe.update({
    where: { id: universeId },
    data: {
      last_price: lastPrice ?? 0,
      distribution: distributionData?.distribution ?? 0,
      distributions_per_year: distributionData?.distributions_per_year ?? 0,
      ex_date: distributionData?.ex_date ?? null,
    },
  });

  return { record: updatedRecord as UniverseRecord, fetchFailed: false };
}
