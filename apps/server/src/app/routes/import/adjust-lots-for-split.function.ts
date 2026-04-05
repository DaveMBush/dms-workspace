import { logger } from '../../../utils/structured-logger';
import { prisma } from '../../prisma/prisma-client';

/**
 * Adjusts all open position lots for a given symbol by applying a split ratio.
 *
 * For each open lot:
 *   newQuantity     = Math.floor(lot.quantity / ratio)  // whole shares; fractional remainder handled in Story 48.4
 *   newPricePerShare = lot.buy * ratio
 *
 * All updates are applied atomically within a single Prisma transaction.
 *
 * @param symbol - The ticker symbol whose lots should be adjusted
 * @param ratio  - The split ratio (>1 for reverse split, <1 for forward split)
 * @returns The number of lots updated
 */
export async function adjustLotsForSplit(
  symbol: string,
  ratio: number
): Promise<number> {
  if (!Number.isFinite(ratio) || ratio <= 0) {
    logger.warn(
      `adjustLotsForSplit: invalid ratio "${ratio}" for symbol "${symbol}" — skipping adjustment`
    );
    return 0;
  }

  const universeEntry = await prisma.universe.findFirst({
    where: { symbol },
  });

  if (!universeEntry) {
    logger.warn(
      `adjustLotsForSplit: no universe entry found for symbol "${symbol}" — skipping adjustment`
    );
    return 0;
  }

  let updatedCount = 0;

  await prisma.$transaction(async function applyLotUpdates(tx) {
    const openLots = await tx.trades.findMany({
      where: {
        universeId: universeEntry.id,
        sell_date: null,
      },
      select: { id: true, quantity: true, buy: true },
    });

    if (openLots.length === 0) {
      logger.warn(
        `adjustLotsForSplit: no open lots found for symbol "${symbol}" — skipping adjustment`
      );
      return;
    }

    for (const lot of openLots) {
      const newQuantity = Math.floor(lot.quantity / ratio);
      const newBuy = lot.buy * ratio;
      await tx.trades.update({
        where: { id: lot.id },
        data: { quantity: newQuantity, buy: newBuy },
      });
    }

    updatedCount = openLots.length;
  });

  return updatedCount;
}
