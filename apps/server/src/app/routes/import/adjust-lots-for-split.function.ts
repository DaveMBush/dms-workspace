import { PrismaClient } from '@prisma/client';

import { logger } from '../../../utils/structured-logger';
import { prisma } from '../../prisma/prisma-client';
import { isCusip } from './is-cusip.function';
import { resolveCusipUniverseIds } from './resolve-cusip-universe-ids.helper';

interface OpenLot {
  id: string;
  quantity: number;
  buy: number;
  accountId: string;
}

interface FractionalSaleData {
  universeId: string;
  symbol: string;
  lastPrice: number;
  openLots: OpenLot[];
  totalRemainder: number;
}

function calcLotRemainder(lot: OpenLot, ratio: number): number {
  return lot.quantity / ratio - Math.floor(lot.quantity / ratio);
}

function sumRemainders(openLots: OpenLot[], ratio: number): number {
  return openLots.reduce(function sumLotRemainder(sum: number, lot: OpenLot) {
    return sum + calcLotRemainder(lot, ratio);
  }, 0);
}

function buildSkipWarning(symbol: string, ratio: number): string | null {
  if (!Number.isFinite(ratio) || ratio <= 0) {
    return `adjustLotsForSplit: invalid ratio "${ratio}" for symbol "${symbol}" — skipping adjustment`;
  }
  if (isCusip(symbol)) {
    return `adjustLotsForSplit: cannot resolve CUSIP "${symbol}" to ticker for reverse split — skipping adjustment`;
  }
  return null;
}

async function updateLots(
  openLots: OpenLot[],
  ratio: number,
  tx: PrismaClient
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
  data: FractionalSaleData,
  tx: PrismaClient
): Promise<void> {
  const price = data.lastPrice > 0 ? data.lastPrice : 0;
  if (price === 0) {
    logger.warn(
      `adjustLotsForSplit: no market price available for symbol "${data.symbol}" — fractional sale recorded at price 0`
    );
  }
  const now = new Date();
  await tx.trades.create({
    data: {
      universeId: data.universeId,
      accountId: data.openLots[0].accountId,
      buy: 0,
      sell: price,
      buy_date: now,
      sell_date: now,
      quantity: data.totalRemainder,
    },
  });
}

/**
 * Adjusts all open position lots for a given symbol and account by applying a split ratio.
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
 * @param symbol    - The ticker symbol whose lots should be adjusted
 * @param ratio     - The split ratio (>1 for reverse split, <1 for forward split)
 * @param accountId - Only adjust lots belonging to this account
 * @returns The number of lots updated
 */
export async function adjustLotsForSplit(
  symbol: string,
  ratio: number,
  accountId: string
): Promise<number> {
  const warnMsg = buildSkipWarning(symbol, ratio);
  if (warnMsg) {
    logger.warn(warnMsg);
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

  const allUniverseIds = await resolveCusipUniverseIds(
    symbol,
    universeEntry.id
  );

  let updatedCount = 0;

  await prisma.$transaction(async function applyLotUpdates(tx) {
    const txClient = tx as unknown as PrismaClient;
    const openLots = await txClient.trades.findMany({
      where: { universeId: { in: allUniverseIds }, accountId, sell_date: null },
      select: { id: true, quantity: true, buy: true, accountId: true },
    });

    if (openLots.length === 0) {
      logger.warn(
        `adjustLotsForSplit: no open lots found for symbol "${symbol}" — skipping adjustment`
      );
      return;
    }

    await updateLots(openLots, ratio, txClient);
    updatedCount = openLots.length;
    const totalRemainder = sumRemainders(openLots, ratio);

    if (totalRemainder > 0) {
      const saleData: FractionalSaleData = {
        universeId: universeEntry.id,
        symbol,
        lastPrice: universeEntry.last_price,
        openLots,
        totalRemainder,
      };
      await recordFractionalSale(saleData, txClient);
    }
  });

  return updatedCount;
}
