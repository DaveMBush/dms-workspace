import { FastifyInstance } from 'fastify';

import { prisma } from '../../../prisma/prisma-client';

interface IndexesParams {
  startIndex: number;
  length: number;
  parentId: string;
  childField: string;
}

interface IndexesResponse {
  startIndex: number;
  indexes: string[];
  length: number;
}

const indexesSchema = {
  schema: {
    body: {
      type: 'object',
      properties: {
        startIndex: { type: 'number' },
        length: { type: 'number' },
        parentId: { type: 'string' },
        childField: { type: 'string' },
      },
      required: ['startIndex', 'length', 'parentId', 'childField'],
    },
  },
} as const;

function handleGetAccountsIndexesRoute(fastify: FastifyInstance): void {
  fastify.post<{ Body: IndexesParams; Reply: IndexesResponse }>(
    '/',
    indexesSchema,
    async function handleGetDivDepositsRequest(
      request,
      _
    ): Promise<IndexesResponse> {
      if (request.body.childField !== 'divDeposits') {
        return {
          startIndex: request.body.startIndex,
          indexes: [],
          length: 0,
        };
      }
      const ids = await prisma.divDeposits.findMany({
        where: { accountId: request.body.parentId },
        orderBy: {
          date: 'desc' as const,
        },
        skip: request.body.startIndex,
        take: request.body.length,
        select: {
          id: true,
        },
      });
      return {
        startIndex: request.body.startIndex,
        indexes:
          ids.length > 0
            ? ids.map(function itemToString(item: { id: string }) {
                return item.id;
              })
            : [],
        length:
          ids.length > 0
            ? await prisma.divDeposits.count({
                where: { accountId: request.body.parentId },
              })
            : 0,
      };
    }
  );
}

export default function registerAccountRoutes(fastify: FastifyInstance): void {
  handleGetAccountsIndexesRoute(fastify);
}
