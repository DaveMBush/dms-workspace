import { FastifyInstance } from 'fastify';

import { prisma } from '../../prisma/prisma-client';
import { getTableState } from '../common/get-table-state.function';
import { parseSortFilterHeader } from '../common/parse-sort-filter-header.function';
import { Account } from './account.interface';
import { buildAccountResponse } from './build-account-response.function';
import { NewAccount } from './new-account.interface';

interface AccountWithTrades {
  id: string;
  name: string;
  trades: Array<{ id: string; sell_date: Date | null; sell: number }>;
}

function isOpenTrade(trade: { sell_date: Date | null; sell: number }): boolean {
  return trade.sell_date === null || trade.sell === 0;
}

function mapTradeToId(trade: { id: string }): string {
  return trade.id;
}

function getOpenTradeIds(accountItem: AccountWithTrades): string[] {
  return accountItem.trades.filter(isOpenTrade).map(mapTradeToId);
}

function mapAccountToResponse(accountItem: AccountWithTrades): Account {
  const tradeIds = getOpenTradeIds(accountItem);
  return {
    id: accountItem.id,
    name: accountItem.name,
    openTrades: {
      startIndex: 0,
      indexes: tradeIds.slice(0, 10),
      length: tradeIds.length,
    },
    soldTrades: [],
    divDeposits: {
      startIndex: 0,
      indexes: [],
      length: 0,
    },
    months: [],
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

      const response = account.map(mapAccountToResponse);
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

      const result = accounts.map(mapAccountToResponse);
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
