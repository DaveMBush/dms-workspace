import { logger } from '../../../utils/structured-logger';
import { prisma } from '../../prisma/prisma-client';

function sumOpenQuantity(sum: number, trade: { quantity: number }): number {
  return sum + trade.quantity;
}

// CUSIP-stored lots — see Epic 61, Story 61.2. Lots may have been imported under the raw
// CUSIP rather than the ticker symbol. Query universes for all CUSIP aliases of ticker.
async function resolveCusipUniverseIds(
  ticker: string,
  tickerUniverseId: string
): Promise<string[]> {
  const cusipMappings = await prisma.cusip_cache.findMany({
    where: { symbol: ticker },
    select: { cusip: true },
  });
  if (cusipMappings.length === 0) {
    return [tickerUniverseId];
  }
  const cusipSymbols = cusipMappings.map((m) => m.cusip);
  const cusipUniverses = await prisma.universe.findMany({
    where: { symbol: { in: cusipSymbols } },
    select: { id: true },
  });
  return [tickerUniverseId, ...cusipUniverses.map((u) => u.id)];
}

/**
 * Calculates the split ratio for a symbol based on the total open position quantity
 * and the post-split quantity from the CSV row.
 *
 * Formula: ratio = totalCurrentOpenQuantity / csvPostSplitQuantity
 * - ratio > 1 → reverse split (e.g., 5 means 1-for-5 reverse split)
 * - ratio < 1 → forward split (e.g., 0.5 means 2-for-1 forward split)
 *
 * @param symbol - The ticker symbol to calculate the split ratio for
 * @param csvPostSplitQuantity - The post-split quantity from the CSV row (must be > 0)
 * @param accountId - Only consider open lots belonging to this account
 *
 * Returns null if no open lots exist for the symbol (caller must skip the split row).
 */
export async function calculateSplitRatio(
  symbol: string,
  csvPostSplitQuantity: number,
  accountId: string
): Promise<number | null> {
  if (!Number.isFinite(csvPostSplitQuantity) || csvPostSplitQuantity <= 0) {
    logger.warn(
      `calculateSplitRatio: invalid post-split CSV quantity "${csvPostSplitQuantity}" for symbol "${symbol}" — skipping split`
    );
    return null;
  }

  const universeEntry = await prisma.universe.findFirst({
    where: { symbol },
  });

  if (!universeEntry) {
    logger.warn(
      `calculateSplitRatio: no universe entry found for symbol "${symbol}" — skipping split`
    );
    return null;
  }

  const allUniverseIds = await resolveCusipUniverseIds(
    symbol,
    universeEntry.id
  );

  const openTrades = await prisma.trades.findMany({
    where: {
      universeId: { in: allUniverseIds },
      accountId,
      sell_date: null,
    },
    select: { quantity: true },
  });

  const totalCurrentOpenQuantity = openTrades.reduce(sumOpenQuantity, 0);

  if (totalCurrentOpenQuantity === 0) {
    logger.warn(
      `calculateSplitRatio: no open lots found for symbol "${symbol}" — skipping split`
    );
    return null;
  }

  return totalCurrentOpenQuantity / csvPostSplitQuantity;
}
