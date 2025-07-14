import { FastifyInstance } from 'fastify';
import { Account } from './account.interface';
import { prisma } from '../../prisma/prisma-client';
import { NewAccount } from './new-account.interface';

export default async function (fastify: FastifyInstance): Promise<void> {

  // Route to fetch accounts by IDs
  // Path: POST /api/accounts
  fastify.post<{ Body: string[]; Reply: Account[] }>('/',
    {
      schema: {
        body: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
    async function (request, reply): Promise<Account[]> {
      console.log('HANDLER: POST /api/accounts');
      const ids = request.body;
      if (!ids || ids.length === 0) {
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
              buy_date: 'asc',
            },
          },
          divDeposits: {
            select: {
              id: true,
              date: true,
            },
            orderBy: {
              date: 'asc',
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });

      return accounts.map((account) => {
        const months1 = new Set(account.trades.filter((trade) => trade.sell_date !== null).map((trade) => {
          const d = new Date(trade.sell_date);
          return `${d.getFullYear()}-${d.getMonth() + 1}`;
        }));
        const months2 = new Set(account.divDeposits.map((divDeposit) => {
          const d = new Date(divDeposit.date);
          return `${d.getFullYear()}-${d.getMonth() + 1}`;
        }));
        const months = [...months1.union(months2)].sort((a: string, b: string) => b.localeCompare(a))
          .map((m) => {
            const [year, month] = m.split('-');
            return {year: parseInt(year), month: parseInt(month)};
          });


        return {
          id: account.id,
          name: account.name,
          trades: account.trades.map((trade) => trade.id),
          divDeposits: account.divDeposits.map((divDeposit) => divDeposit.id),
          months,
        }
      });
    }
  );
  console.log('registering /api/accounts/add route');
  fastify.post<{ Body: NewAccount, Reply: Account[]; }>('/add',
    async function (request, reply): Promise<void> {
      const result = await prisma.accounts.create({
        data: {
          name: request.body.name,
        },
      });
      var account = await prisma.accounts.findMany({
        where: { id: { in: [result.id] } },
        include: {
          trades: true,
        },
      });
      reply.status(200).send(account.map((account) => ({
        id: account.id,
        name: account.name,
        trades: account.trades.map((trade) => trade.id),
        divDeposits: [],
        months: [],
      })));
    }
  );
  console.log('registering /api/accounts/delete route');
  fastify.delete<{ Params: { id: string }, Reply: void }>('/:id',
    async function (request, reply): Promise<void> {
      var { id } = request.params;
      await prisma.accounts.delete({ where: { id } });
      reply.status(200).send();
    }
  );
  console.log('registering /api/accounts/update route');
  fastify.put<{ Body: { id: string, name: string }, Reply: void }>('/',
    async function (request, reply): Promise<void> {
      var { id, name } = request.body;
      await prisma.accounts.update({
        where: { id },
        data: { name }
      });
      const accounts = await prisma.accounts.findMany({
        where: { id },
        include: { trades: true },
      });

      var result = accounts.map((account) => ({
        ...account,
        trades: account.trades.map((trade) => trade.id),
      }));
      reply.status(200).send(result);
    }
  );
}


