import { prisma } from '../../prisma/prisma-client';
import { TableState } from '../common/table-state.interface';
import { Account } from './account.interface';
import { buildDivDepositOrderBy } from './build-div-deposit-order-by.function';
import { buildDivDepositWhere } from './build-div-deposit-where.function';
import { buildTradeOrderBy } from './build-trade-order-by.function';
import { buildTradeWhere } from './build-trade-where.function';
import { getTradeComputedValue } from './get-trade-computed-value.function';
import { isComputedTradeSort } from './is-computed-trade-sort.function';

interface MonthData {
  year: number;
  month: number;
}

function extractMonthsFromTrades(
  trades: Array<{ sell_date: Date | null }>
): Set<string> {
  return new Set(
    trades
      .filter(function filterSoldTrades(trade) {
        return trade.sell_date !== null;
      })
      .map(function mapTradeToMonth(trade) {
        const d = new Date(trade.sell_date!);
        return `${d.getFullYear()}-${d.getMonth() + 1}`;
      })
  );
}

function extractMonthsFromDivDeposits(
  divDeposits: Array<{ date: Date }>
): Set<string> {
  return new Set(
    divDeposits.map(function mapDivDepositToMonth(divDeposit) {
      const d = new Date(divDeposit.date);
      return `${d.getFullYear()}-${d.getMonth() + 1}`;
    })
  );
}

function combineAndSortMonths(
  months1: Set<string>,
  months2: Set<string>
): MonthData[] {
  const combinedMonths = [...new Set([...months1, ...months2])];
  const sortedMonths = combinedMonths.toSorted(function sortMonthsDescending(
    a: string,
    b: string
  ) {
    const [aYear, aMonth] = a.split('-').map(Number);
    const [bYear, bMonth] = b.split('-').map(Number);
    if (aYear !== bYear) {
      return bYear - aYear;
    }
    return bMonth - aMonth;
  });
  return sortedMonths.map(function parseMonth(m) {
    const [year, month] = m.split('-');
    return { year: parseInt(year, 10), month: parseInt(month, 10) };
  });
}

async function getOpenTradeIds(
  openState: TableState,
  accountId: string
): Promise<string[]> {
  if (isComputedTradeSort(openState)) {
    const trades = await prisma.trades.findMany({
      where: buildTradeWhere(openState, accountId, true),
      select: {
        id: true,
        buy: true,
        quantity: true,
        universe: { select: { last_price: true } },
      },
    });
    const field = openState.sort!.field;
    const order = openState.sort!.order;
    trades.sort(function sortByComputed(a, b) {
      const diff =
        getTradeComputedValue(field, a) - getTradeComputedValue(field, b);
      return order === 'desc' ? -diff : diff;
    });
    return trades.map(function mapId(t) {
      return t.id;
    });
  }
  const trades = await prisma.trades.findMany({
    where: buildTradeWhere(openState, accountId, true),
    select: { id: true },
    orderBy: buildTradeOrderBy(openState),
  });
  return trades.map(function mapId(t) {
    return t.id;
  });
}

export async function buildAccountResponse(
  account: { id: string; name: string },
  openState: TableState,
  closedState: TableState,
  divState: TableState
): Promise<Account> {
  const [openTradeIds, soldTrades, allDivDeposits] = await Promise.all([
    getOpenTradeIds(openState, account.id),
    prisma.trades.findMany({
      where: buildTradeWhere(closedState, account.id, false),
      select: { id: true, sell_date: true },
      orderBy: buildTradeOrderBy(closedState),
    }),
    prisma.divDeposits.findMany({
      where: buildDivDepositWhere(divState, account.id),
      select: { id: true, date: true },
      orderBy: buildDivDepositOrderBy(divState),
    }),
  ]);

  const months1 = extractMonthsFromTrades(soldTrades);
  const months2 = extractMonthsFromDivDeposits(allDivDeposits);
  const months = combineAndSortMonths(months1, months2);

  return {
    id: account.id,
    name: account.name,
    openTrades: {
      startIndex: 0,
      indexes: openTradeIds.slice(0, 10),
      length: openTradeIds.length,
    },
    soldTrades: {
      startIndex: 0,
      indexes: soldTrades.slice(0, 10).map(function mapSoldTradeId(trade) {
        return trade.id;
      }),
      length: soldTrades.length,
    },
    divDeposits: {
      startIndex: 0,
      indexes: allDivDeposits.slice(0, 10).map(function mapDivDepositId(d) {
        return d.id;
      }),
      length: allDivDeposits.length,
    },
    months,
  };
}
