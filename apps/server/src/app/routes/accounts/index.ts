import { FastifyInstance } from 'fastify';
import { Account } from './account.interface';
import { prisma } from '../../prisma/prisma-client';

export default async function (fastify: FastifyInstance): Promise<void> {
  console.log('registering /api/accounts route');
  fastify.post<{Body: {ids: string[]}, Reply: Account[]}>('/',
    {
      schema: {
        body: {
          type: 'array',
          items: { type: 'string' },
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
    const ids = request.body as unknown as string[];
    if(ids.length === 0) {
      return reply.status(200).send([]);
    }

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
        id: { in: ids }
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

