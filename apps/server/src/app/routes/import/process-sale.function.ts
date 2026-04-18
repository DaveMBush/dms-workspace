import { prisma } from '../../prisma/prisma-client';
import { MappedSale } from './mapped-sale.interface';

function sumTradeQuantity(sum: number, trade: { quantity: number }): number {
  return sum + trade.quantity;
}

async function buildInsufficientSharesError(
  accountId: string,
  universeId: string,
  quantity: number,
  totalOpen: number
): Promise<string> {
  const account = await prisma.accounts.findUnique({
    where: { id: accountId },
    select: { name: true },
  });
  const universe = await prisma.universe.findUnique({
    where: { id: universeId },
    select: { symbol: true },
  });
  const accountName = account?.name ?? accountId;
  const symbol = universe?.symbol ?? universeId;
  const saleQuantity = Math.abs(quantity);
  return `No matching open trade found for sale: account="${accountName}", symbol="${symbol}", quantity=${quantity} (have ${totalOpen} open shares, need ${saleQuantity})`;
}

async function closeFullTrade(
  tradeId: string,
  sell: number,
  sellDate: string
): Promise<void> {
  await prisma.trades.update({
    where: { id: tradeId },
    data: { sell, sell_date: new Date(sellDate) },
  });
}

async function splitTrade(
  trade: {
    id: string;
    universeId: string;
    accountId: string;
    buy: number;
    buy_date: Date;
  },
  soldQuantity: number,
  remainingQuantity: number,
  sale: MappedSale
): Promise<void> {
  await prisma.trades.create({
    data: {
      universeId: trade.universeId,
      accountId: trade.accountId,
      buy: trade.buy,
      sell: sale.sell,
      buy_date: trade.buy_date,
      sell_date: new Date(sale.sell_date),
      quantity: soldQuantity,
    },
  });
  await prisma.trades.update({
    where: { id: trade.id },
    data: { quantity: remainingQuantity },
  });
}

/**
 * Processes a sale by finding matching open trades and closing them using FIFO (First In, First Out).
 * May split trades if sale quantity doesn't exactly match open position quantities.
 * Returns an error message if insufficient open shares are found.
 */
export async function processSale(sale: MappedSale): Promise<string | null> {
  const saleQuantity = Math.abs(sale.quantity);

  const openTrades = await prisma.trades.findMany({
    where: {
      universeId: sale.universeId,
      accountId: sale.accountId,
      sell: 0,
      sell_date: null,
    },
    orderBy: { buy_date: 'asc' },
  });

  const totalOpenShares = openTrades.reduce(sumTradeQuantity, 0);
  if (totalOpenShares === 0) {
    return buildInsufficientSharesError(
      sale.accountId,
      sale.universeId,
      sale.quantity,
      totalOpenShares
    );
  }

  let remainingToSell = saleQuantity;
  for (const trade of openTrades) {
    if (remainingToSell <= 0) {
      break;
    }
    if (trade.quantity <= remainingToSell) {
      await closeFullTrade(trade.id, sale.sell, sale.sell_date);
      remainingToSell -= trade.quantity;
    } else {
      await splitTrade(
        trade,
        remainingToSell,
        trade.quantity - remainingToSell,
        sale
      );
      remainingToSell = 0;
    }
  }

  if (remainingToSell > 0) {
    return buildInsufficientSharesError(
      sale.accountId,
      sale.universeId,
      sale.quantity,
      totalOpenShares
    );
  }

  return null;
}
