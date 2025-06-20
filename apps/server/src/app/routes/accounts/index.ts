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
        include: { trades: true, statuses: true },
      });

      return accounts.map((account) => ({
        ...account,
        trades: account.trades.map((trade) => trade.id),
        statuses: account.statuses.map((status) => status.id),
      }));
    }
  );
  console.log('registering /api/accounts/add route');
  fastify.post<{ Body: NewAccount, Reply: { id: string, name: string }[]}>('/add',
    async function (request, reply): Promise<void> {
    const result = await prisma.accounts.create({
      data: {
        name: request.body.name,
      },
    });
    var account = await prisma.accounts.findMany({
      where: { id: { in: [result.id] } },
      select: {
        id: true,
        name: true,
      },
    });
    reply.status(200).send(account);
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
        include: { trades: true, statuses: true },
      });

      var result = accounts.map((account) => ({
        ...account,
        trades: account.trades.map((trade) => trade.id),
        statuses: account.statuses.map((status) => status.id),
      }));
      reply.status(200).send(result);
    }
  );
}


