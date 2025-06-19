import { FastifyInstance } from 'fastify';
import { Top } from './top.interface';
import { prisma } from '../../prisma/prisma-client';

export default async function (fastify: FastifyInstance): Promise<void> {
  console.log('registering /api/top route');
  fastify.post<{Body: {ids: string[]}, Reply: Top[]}>('/',
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
    async function (request, reply): Promise<Top[]> {
    const ids = request.body as unknown as string[];
    if(ids.length === 0) {
      return reply.status(200).send([]);
    }

    const topAccounts = await prisma.accounts.findMany({
      select: {
        id: true
      },
      orderBy: { createdAt: 'asc'}
    });
      return reply.status(200).send([{id: '1', accounts: topAccounts.map((account) => account.id)}]);
  });
}
