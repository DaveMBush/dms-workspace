import { logger } from '../../../utils/structured-logger';
import { prisma } from '../../prisma/prisma-client';
import { fetchAndUpdatePriceData } from '../universe/fetch-and-update-price-data.function';

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
