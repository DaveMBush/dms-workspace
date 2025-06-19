import { FastifyInstance } from 'fastify';
import { Account } from './account.interface';
import { prisma } from '../../prisma/prisma-client';
import { NewAccount } from './new-account.interface';

export default async function (fastify: FastifyInstance): Promise<void> {
  console.log('registering /api/accounts/add route');
  fastify.post<{Body: NewAccount, Reply: Account[]}>('/',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'array',
            items: { type: 'object', properties: { id: { type: 'string' }, accounts: { type: 'array', items: { type: 'string' } } } },
          },
        },
      },
    },
    async function (request, reply): Promise<Account[]> {
    const { name } = request.body as unknown as NewAccount;

    const result = await prisma.accounts.create({
      data: {
        name,
      },
    });
    const accounts = await prisma.accounts.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        version: true,
        trades: true,
        statuses: true,
      },
      where: {
        id: result.id,
      }
    });
    return reply.status(200).send(accounts.map((account) => ({
      id: account.id,
      name: account.name,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
      deletedAt: account.deletedAt,
      version: account.version,
      trades: account.trades.map((trade) => trade.id),
      statuses: account.statuses.map((status) => status.id),
    })));
  });
}
