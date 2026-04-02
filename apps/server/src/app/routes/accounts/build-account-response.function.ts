import { Prisma } from '@prisma/client';

import { prisma } from '../../prisma/prisma-client';
import { TableState } from '../common/table-state.interface';
import { PartialArrayDefinition } from '../top/partial-array-definition.interface';
import { Account } from './account.interface';
import { ACCOUNT_PAGE_SIZE } from './account-page-size.const';
import { buildDivDepositOrderBy } from './build-div-deposit-order-by.function';
import { buildDivDepositWhere } from './build-div-deposit-where.function';
import { buildTradeOrderBy } from './build-trade-order-by.function';
import { buildTradeWhere } from './build-trade-where.function';
import { getTradeComputedValue } from './get-trade-computed-value.function';
import { isComputedTradeSort } from './is-computed-trade-sort.function';

function getSortFieldAndOrder(
  state: TableState
): { field: string; order: 'asc' | 'desc' } | undefined {
  if (state.sortColumns !== undefined && state.sortColumns.length > 0) {
    return {
      field: state.sortColumns[0].column,
      order: state.sortColumns[0].direction,
    };
  }
  return state.sort;
}

interface MonthData {
  year: number;
  month: number;
}

function extractMonthsFromDates(dates: Array<Date | null>): Set<string> {
  return new Set(
    dates
      .filter(function filterNonNull(date): date is Date {
        return date !== null;
      })
      .map(function mapDateToMonth(date) {
        return `${date.getFullYear()}-${date.getMonth() + 1}`;
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

async function getOpenTradesPage(
  openState: TableState,
  accountId: string
): Promise<PartialArrayDefinition> {
  const where = buildTradeWhere(openState, accountId, true);

  if (isComputedTradeSort(openState)) {
    const trades = await prisma.trades.findMany({
      where,
      select: {
        id: true,
        buy: true,
        quantity: true,
        universe: { select: { last_price: true } },
      },
    });
    const { field, order } = getSortFieldAndOrder(openState)!;
    trades.sort(function sortByComputed(a, b) {
      const diff =
        getTradeComputedValue(field, a) - getTradeComputedValue(field, b);
      return order === 'desc' ? -diff : diff;
    });
    const sliced = trades.slice(0, ACCOUNT_PAGE_SIZE);
    return {
      startIndex: 0,
      indexes: sliced.map(function mapId(t) {
        return t.id;
      }),
      length: trades.length,
    };
  }

  const [totalCount, trades] = await Promise.all([
    prisma.trades.count({ where }),
    prisma.trades.findMany({
      where,
      select: { id: true },
      orderBy: buildTradeOrderBy(openState),
      skip: 0,
      take: ACCOUNT_PAGE_SIZE,
    }),
  ]);
  return {
    startIndex: 0,
    indexes: trades.map(function mapId(t) {
      return t.id;
    }),
    length: totalCount,
  };
}

async function getSoldTradesPage(
  closedState: TableState,
  accountId: string
): Promise<PartialArrayDefinition> {
  const where: Prisma.tradesWhereInput = buildTradeWhere(
    closedState,
    accountId,
    false
  );
  const [totalCount, trades] = await Promise.all([
    prisma.trades.count({ where }),
    prisma.trades.findMany({
      where,
      select: { id: true },
      orderBy: buildTradeOrderBy(closedState),
      skip: 0,
      take: ACCOUNT_PAGE_SIZE,
    }),
  ]);
  return {
    startIndex: 0,
    indexes: trades.map(function mapId(t) {
      return t.id;
    }),
    length: totalCount,
  };
}

async function getDivDepositsPage(
  divState: TableState,
  accountId: string
): Promise<PartialArrayDefinition> {
  const where = buildDivDepositWhere(divState, accountId);
  const [totalCount, divDeposits] = await Promise.all([
    prisma.divDeposits.count({ where }),
    prisma.divDeposits.findMany({
      where,
      select: { id: true },
      orderBy: buildDivDepositOrderBy(divState),
      skip: 0,
      take: ACCOUNT_PAGE_SIZE,
    }),
  ]);
  return {
    startIndex: 0,
    indexes: divDeposits.map(function mapId(d) {
      return d.id;
    }),
    length: totalCount,
  };
}

async function getSoldTradeMonthDates(
  closedState: TableState,
  accountId: string
): Promise<Array<Date | null>> {
  const soldTrades = await prisma.trades.findMany({
    where: buildTradeWhere(closedState, accountId, false),
    select: { sell_date: true },
  });
  return soldTrades.map(function mapSellDate(t) {
    return t.sell_date;
  });
}

async function getDivDepositMonthDates(
  divState: TableState,
  accountId: string
): Promise<Date[]> {
  const divDeposits = await prisma.divDeposits.findMany({
    where: buildDivDepositWhere(divState, accountId),
    select: { date: true },
  });
  return divDeposits.map(function mapDate(d) {
    return d.date;
  });
}

export async function buildAccountResponse(
  account: { id: string; name: string },
  openState: TableState,
  closedState: TableState,
  divState: TableState
): Promise<Account> {
  const [
    openTrades,
    soldTrades,
    divDeposits,
    soldTradeMonthDates,
    divDepositMonthDates,
  ] = await Promise.all([
    getOpenTradesPage(openState, account.id),
    getSoldTradesPage(closedState, account.id),
    getDivDepositsPage(divState, account.id),
    getSoldTradeMonthDates(closedState, account.id),
    getDivDepositMonthDates(divState, account.id),
  ]);

  const months1 = extractMonthsFromDates(soldTradeMonthDates);
  const months2 = extractMonthsFromDates(divDepositMonthDates);
  const months = combineAndSortMonths(months1, months2);

  return {
    id: account.id,
    name: account.name,
    openTrades,
    soldTrades,
    divDeposits,
    months,
  };
}
