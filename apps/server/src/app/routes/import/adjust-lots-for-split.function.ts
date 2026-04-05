import { logger } from '../../../utils/structured-logger';
import { prisma } from '../../prisma/prisma-client';

type OpenLot = { id: string; quantity: number; buy: number; accountId: string };

function calcLotRemainder(lot: OpenLot, ratio: number): number {
  return lot.quantity / ratio - Math.floor(lot.quantity / ratio);
}

async function updateLots(
  openLots: OpenLot[],
  ratio: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any
): Promise<void> {
  for (const lot of openLots) {
    const newQuantity = Math.floor(lot.quantity / ratio);
    const newBuy = lot.buy * ratio;
    await tx.trades.update({
      where: { id: lot.id },
      data: { quantity: newQuantity, buy: newBuy },
    });
  }
}

async function recordFractionalSale(
  universeId: string,
  symbol: string,
  lastPrice: number,
  openLots: OpenLot[],
  totalRemainder: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any
): Promise<void> {
  const price = lastPrice > 0 ? lastPrice : 0;
  if (!lastPrice) {
    logger.warn(
      `adjustLotsForSplit: no market price available for symbol "${symbol}" — fractional sale recorded at price 0`
    );
  }
  const now = new Date();
  await tx.trades.create({
    data: {
      universeId,
      accountId: openLots[0].accountId,
      buy: 0,
      sell: price,
      buy_date: now,
      sell_date: now,
      quantity: totalRemainder,
    },
  });
}

/**
 * Adjusts all open position lots for a given symbol by applying a split ratio.
 *
 * For each open lot:
 *   newQuantity     = Math.floor(lot.quantity / ratio)  // whole shares
 *   newPricePerShare = lot.buy * ratio
 *
 * If the split produces a fractional remainder across all lots, a fractional
 * sale record is created at the current market price inside the same transaction.
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
      where: { universeId: universeEntry.id, sell_date: null },
      select: { id: true, quantity: true, buy: true, accountId: true },
    });

    if (openLots.length === 0) {
      logger.warn(
        `adjustLotsForSplit: no open lots found for symbol "${symbol}" — skipping adjustment`
      );
      return;
    }

    await updateLots(openLots, ratio, tx);
    updatedCount = openLots.length;

    const totalRemainder = openLots.reduce(function sumLotRemainder(
      sum: number,
      lot: OpenLot
    ) {
      return sum + calcLotRemainder(lot, ratio);
    }, 0);

    if (totalRemainder > 0) {
      await recordFractionalSale(
        universeEntry.id,
        symbol,
        universeEntry.last_price,
        openLots,
        totalRemainder,
        tx
      );
    }
  });

  return updatedCount;
}
