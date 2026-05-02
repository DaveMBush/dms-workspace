import { logger } from '../../../utils/structured-logger';
import { prisma } from '../../prisma/prisma-client';
import { recalculateUniverseVolatility } from '../../volatility/recalculate-universe-volatility.function';
import { getDistributions } from '../settings/common/get-distributions.function';
import { fetchAndUpdatePriceData } from '../universe/fetch-and-update-price-data.function';

async function fetchDistributionsAndRecalculate(
  symbol: string,
  universeId: string
): Promise<Awaited<ReturnType<typeof getDistributions>>> {
  let outcome: Awaited<ReturnType<typeof getDistributions>>;
  try {
    outcome = await getDistributions(symbol);
  } catch (error) {
    logger.warn('Dividend history fetch failed during CUSIP resolution', {
      symbol,
      error: error instanceof Error ? error.message : String(error),
    });
    outcome = { result: undefined, history: [] };
  }
  try {
    await recalculateUniverseVolatility(universeId, outcome.history);
  } catch (error) {
    logger.warn('Volatility recalculation failed during CUSIP resolution', {
      symbol,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  return outcome;
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
      expired: isCef,
      is_closed_end_fund: isCef,
    },
  });

  const outcome = await fetchDistributionsAndRecalculate(symbol, entry.id);

  try {
    await fetchAndUpdatePriceData(entry.id, symbol, entry, {
      logContext: 'CUSIP resolution',
      prefetchedDistributionOutcome: outcome,
    });
  } catch (error) {
    logger.warn(
      'Unexpected error during price/dividend fetch after CUSIP resolution',
      {
        symbol,
        error: error instanceof Error ? error.message : String(error),
      }
    );
  }
  return { id: entry.id };
}
