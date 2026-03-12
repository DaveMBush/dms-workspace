import { FastifyInstance } from 'fastify';

import { prisma } from '../../prisma/prisma-client';
import { getTableState } from '../common/get-table-state.function';
import { parseSortFilterHeader } from '../common/parse-sort-filter-header.function';
import { TableState } from '../common/table-state.interface';
import { Account } from './account.interface';
import { buildDivDepositOrderBy } from './build-div-deposit-order-by.function';
import { buildDivDepositWhere } from './build-div-deposit-where.function';
import { buildTradeOrderBy } from './build-trade-order-by.function';
import { buildTradeWhere } from './build-trade-where.function';
import { isComputedTradeSort } from './is-computed-trade-sort.function';
import { NewAccount } from './new-account.interface';

interface AccountWithTrades {
  id: string;
  name: string;
  trades: Array<{ id: string }>;
}

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
  const combinedMonths = [...months1].concat([...months2]);
  const sortedMonths = combinedMonths.toSorted(function sortMonthsDescending(
    a: string,
    b: string
  ) {
    return b.localeCompare(a);
  });
  return sortedMonths.map(function parseMonth(m) {
    const [year, month] = m.split('-');
    return { year: parseInt(year, 10), month: parseInt(month, 10) };
  });
}

interface TradeWithComputed {
  id: string;
  buy: number;
  quantity: number;
  universe: { last_price: number };
}

function computeUnrealizedGain(trade: TradeWithComputed): number {
  return (trade.universe.last_price - trade.buy) * trade.quantity;
}

function computeUnrealizedGainPercent(trade: TradeWithComputed): number {
  if (trade.buy <= 0) {
    return 0;
  }
  return ((trade.universe.last_price - trade.buy) / trade.buy) * 100;
}

function getTradeComputedValue(
  field: string,
  trade: TradeWithComputed
): number {
  if (field === 'unrealizedGain') {
    return computeUnrealizedGain(trade);
  }
  return computeUnrealizedGainPercent(trade);
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

async function buildAccountResponse(
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
    openTrades: openTradeIds,
    soldTrades: soldTrades.map(function mapSoldTradeId(trade) {
      return trade.id;
    }),
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

function handleGetAccountsRoute(fastify: FastifyInstance): void {
  fastify.post<{ Body: string[]; Reply: Account[] }>(
    '/',
    {
      schema: {
        body: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
    async function handleGetAccountsRequest(request, _): Promise<Account[]> {
      const ids = request.body;
      if (ids.length === 0) {
        return [];
      }

      const allState = parseSortFilterHeader(request);
      const openState = getTableState(allState, 'trades-open');
      const closedState = getTableState(allState, 'trades-closed');
      const divState = getTableState(allState, 'div-deposits');

      const accounts = await prisma.accounts.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true },
        orderBy: { name: 'asc' as const },
      });

      return Promise.all(
        accounts.map(async function mapAccountWithState(account) {
          return buildAccountResponse(
            account,
            openState,
            closedState,
            divState
          );
        })
      );
    }
  );
}

function handleAddAccountRoute(fastify: FastifyInstance): void {
  fastify.post<{ Body: NewAccount; Reply: Account[] }>(
    '/add',
    async function handleAddAccountRequest(request, reply): Promise<Account[]> {
      const result = await prisma.accounts.create({
        data: {
          name: request.body.name,
        },
      });
      const account = await prisma.accounts.findMany({
        where: { id: { in: [result.id] } },
        include: {
          trades: true,
        },
      });
      function mapTradeToId(trade: { id: string }): string {
        return trade.id;
      }

      function mapNewAccount(accountItem: AccountWithTrades): Account {
        return {
          id: accountItem.id,
          name: accountItem.name,
          openTrades: accountItem.trades.map(mapTradeToId),
          soldTrades: [],
          divDeposits: {
            startIndex: 0,
            indexes: [],
            length: 0,
          },
          months: [],
        };
      }

      const response = account.map(mapNewAccount);
      reply.status(200).send(response);
      return response;
    }
  );
}

function handleDeleteAccountRoute(fastify: FastifyInstance): void {
  fastify.delete<{ Params: { id: string }; Reply: { success: boolean } }>(
    '/:id',
    async function handleDeleteAccountRequest(
      request,
      reply
    ): Promise<{ success: boolean }> {
      const { id } = request.params;
      await prisma.accounts.delete({ where: { id } });
      reply.status(200).send({ success: true });
      return { success: true };
    }
  );
}

function handleUpdateAccountRoute(fastify: FastifyInstance): void {
  fastify.put<{ Body: { id: string; name: string }; Reply: Account[] }>(
    '/',
    async function handleUpdateAccountRequest(
      request,
      reply
    ): Promise<Account[]> {
      const { id, name } = request.body;
      await prisma.accounts.update({
        where: { id },
        data: { name },
      });
      const accounts = await prisma.accounts.findMany({
        where: { id },
        include: { trades: true },
      });

      function mapTradeToIdForUpdate(trade: { id: string }): string {
        return trade.id;
      }

      function mapUpdatedAccount(accountItem: AccountWithTrades): Account {
        return {
          id: accountItem.id,
          name: accountItem.name,
          openTrades: accountItem.trades.map(mapTradeToIdForUpdate),
          soldTrades: [],
          divDeposits: {
            startIndex: 0,
            indexes: [],
            length: 0,
          },
          months: [],
        };
      }

      const result = accounts.map(mapUpdatedAccount);
      reply.status(200).send(result);
      return result;
    }
  );
}

export default function registerAccountRoutes(fastify: FastifyInstance): void {
  handleGetAccountsRoute(fastify);
  handleAddAccountRoute(fastify);
  handleDeleteAccountRoute(fastify);
  handleUpdateAccountRoute(fastify);
}
