import { logger } from '../../../utils/structured-logger';
import { prisma } from '../../prisma/prisma-client';
import type { ProcessedRow } from '../common/distribution-api.function';
import { fetchDividendHistory } from '../common/dividend-history.service';
import universeHelpers from './universe-helpers';
import type { Universe } from './universe.interface';

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

export function mapUniverseToResponse(u: UniverseWithTrades): Universe {
  const openTrades = universeHelpers.getOpenTrades(u.trades);
  const mostRecentSell = universeHelpers.getMostRecentSell(u.trades);
  return {
    id: u.id,
    distribution: u.distribution,
    distributions_per_year: u.distributions_per_year,
    last_price: u.last_price,
    volatilityLong: u.volatility_long ?? null,
    volatilityShort: u.volatility_short ?? null,
    most_recent_sell_date: mostRecentSell?.sell_date.toISOString() ?? null,
    most_recent_sell_price: mostRecentSell?.sell ?? null,
    symbol: u.symbol,
    ex_date: u.ex_date?.toISOString() ?? '',
    risk_group_id: u.risk_group_id,
    position: universeHelpers.calculatePosition(openTrades),
    expired: u.expired,
    is_closed_end_fund: u.is_closed_end_fund,
    deletable: isUniverseDeletable(u),
    avg_purchase_yield_percent:
      universeHelpers.calculateAvgPurchaseYieldPercent(
        openTrades,
        u.distribution,
        u.distributions_per_year,
      ),
  };
}

interface AddSymbolResultLike {
  id: string;
  symbol: string;
  risk_group_id: string;
  distribution: number | null;
  distributions_per_year: number | null;
  ex_date: string | null;
  last_price: number | null;
  expired: boolean;
  is_closed_end_fund: boolean;
}

export function universeFromAddResult(
  result: AddSymbolResultLike,
): UniverseWithTrades {
  return {
    id: result.id,
    distribution: result.distribution ?? 0,
    distributions_per_year: result.distributions_per_year ?? 0,
    last_price: result.last_price ?? 0,
    volatility_long: null,
    volatility_short: null,
    symbol: result.symbol,
    ex_date: result.ex_date !== null ? new Date(result.ex_date) : null,
    risk_group_id: result.risk_group_id,
    trades: [],
    expired: result.expired,
    is_closed_end_fund: result.is_closed_end_fund,
    _count: { trades: 0, divDeposits: 0 },
  };
}

export async function updateUniverseData(
  id: string,
  data: Omit<Universe, 'id'>,
): Promise<unknown> {
  return prisma.universe.update({
    where: { id },
    data: {
      distribution: data.distribution,
      distributions_per_year: data.distributions_per_year,
      last_price: data.last_price,
      most_recent_sell_date: data.most_recent_sell_date,
      most_recent_sell_price: data.most_recent_sell_price,
      symbol: data.symbol,
      ex_date: data.ex_date,
      risk_group_id: data.risk_group_id,
      expired: data.expired,
    },
  });
}

export async function fetchUpdatedUniverse(
  id: string,
): Promise<UniverseWithTrades[]> {
  return prisma.universe.findMany({
    where: { id },
    include: {
      trades: true,
      _count: {
        select: {
          trades: { where: { deletedAt: null } },
          divDeposits: { where: { deletedAt: null } },
        },
      },
    },
  });
}

export async function fetchHistoryForSymbol(
  symbol: string,
  universeId: string,
): Promise<ProcessedRow[]> {
  try {
    const history = await fetchDividendHistory(symbol);
    if (history.length > 0) {
      return history;
    }
  } catch (err) {
    logger.warn('fetchDividendHistory failed, falling back to divDeposits', {
      symbol,
      error: err instanceof Error ? err.message : String(err),
    });
  }
  const deposits = await prisma.divDeposits.findMany({
    where: { universeId },
    orderBy: { date: 'asc' },
    select: { date: true, amount: true },
  });
  return deposits.map(function toProcessedRow(dep) {
    return { date: dep.date, amount: dep.amount };
  });
}
