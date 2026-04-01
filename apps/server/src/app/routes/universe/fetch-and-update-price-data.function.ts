import { logger } from '../../../utils/structured-logger';
import { prisma } from '../../prisma/prisma-client';
import { getDistributions } from '../settings/common/get-distributions.function';
import { getLastPrice } from '../settings/common/get-last-price.function';
import type { FetchResult } from './fetch-result.interface';
import type { UniverseRecord } from './universe-record.interface';

function buildUpdateData(
  lastPrice: number | undefined,
  distributionData: Awaited<ReturnType<typeof getDistributions>>,
): {
  last_price: number;
  distribution: number;
  distributions_per_year: number;
  ex_date: Date | null;
} {
  return {
    last_price: lastPrice ?? 0,
    distribution: distributionData?.distribution ?? 0,
    distributions_per_year: distributionData?.distributions_per_year ?? 0,
    ex_date: distributionData?.ex_date ?? null,
  };
}

export async function fetchAndUpdatePriceData(
  universeId: string,
  symbol: string,
  fallbackRecord: UniverseRecord,
  logContext: string = 'symbol add',
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
    data: buildUpdateData(lastPrice, distributionData),
  });

  return { record: updatedRecord as UniverseRecord, fetchFailed: false };
}
