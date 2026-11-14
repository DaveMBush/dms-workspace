import { prisma } from '../../prisma/prisma-client';

/* eslint-disable @smarttools/one-exported-item-per-file -- Utility file with related universe service functions and their shared type */

export interface UniverseWithTrades {
  id: string;
  distribution: number;
  distributions_per_year: number;
  last_price: number;
  volatility_long: string | null;
  volatility_short: string | null;
  symbol: string;
  ex_date: Date | null;
  risk_group_id: string;
  trades: Array<{
    buy: number;
    quantity: number;
    sell: number;
    sell_date: Date | null;
  }>;
  expired: boolean;
  is_closed_end_fund: boolean;
  // eslint-disable-next-line @typescript-eslint/naming-convention -- Prisma aggregate field
  _count: { trades: number; divDeposits: number };
}

export function isUniverseDeletable(u: UniverseWithTrades): boolean {
  if (u.is_closed_end_fund) {
    return false;
  }
  // eslint-disable-next-line no-underscore-dangle -- Prisma aggregate field
  return u._count.trades === 0 && u._count.divDeposits === 0;
}

function isActiveTrade(trade: { sell_date: Date | null }): boolean {
  return trade.sell_date === null;
}

function isSoldTrade(trade: { sell_date: Date | null }): boolean {
  return trade.sell_date !== null;
}

export async function deleteUniverseAndTrades(
  id: string,
): Promise<string | null> {
  const allTrades = await prisma.trades.findMany({ where: { universeId: id } });
  const activeTrades = allTrades.filter(isActiveTrade);
  if (activeTrades.length > 0) {
    return 'Cannot delete symbols with active trades';
  }
  const soldTrades = allTrades.filter(isSoldTrade);
  if (soldTrades.length > 0) {
    await prisma.trades.deleteMany({ where: { universeId: id } });
  }
  await prisma.universe.delete({ where: { id } });
  return null;
}
