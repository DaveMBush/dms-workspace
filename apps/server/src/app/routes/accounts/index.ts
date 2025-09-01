import { FastifyInstance } from 'fastify';

import { prisma } from '../../prisma/prisma-client';
import { Account } from './account.interface';
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

interface PrismaAccountResult {
  id: string;
  name: string;
  trades?: Array<{ id: string; sell_date: Date | null }>;
  divDeposits?: Array<{ id: string; date: Date }>;
}

function mapAccountToResponse(account: PrismaAccountResult): Account {
  const trades = account.trades ?? [];
  const divDeposits = account.divDeposits ?? [];

  const months1 = extractMonthsFromTrades(trades);
  const months2 = extractMonthsFromDivDeposits(divDeposits);
  const months = combineAndSortMonths(months1, months2);

  return {
    id: account.id,
    name: account.name,
    trades: trades.map(function mapTradeToId(trade) {
      return trade.id;
    }),
    divDeposits: divDeposits.map(function mapDivDepositToId(divDeposit) {
      return divDeposit.id;
    }),
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

      const accounts = await prisma.accounts.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          name: true,
          trades: {
            select: {
              id: true,
              sell_date: true,
            },
            orderBy: {
              buy_date: 'asc' as const,
            },
          },
          divDeposits: {
            select: {
              id: true,
              date: true,
            },
            orderBy: {
              date: 'asc' as const,
            },
          },
        },
        orderBy: {
          name: 'asc' as const,
        },
      });
      return accounts.map(function mapAccount(account) {
        return mapAccountToResponse(account);
      });
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
          trades: accountItem.trades.map(mapTradeToId),
          divDeposits: [],
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
          trades: accountItem.trades.map(mapTradeToIdForUpdate),
          divDeposits: [],
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
