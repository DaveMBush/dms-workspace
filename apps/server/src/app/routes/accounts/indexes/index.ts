import { FastifyInstance } from 'fastify';

import { prisma } from '../../../prisma/prisma-client';
import { buildTradeOrderBy } from '../build-trade-order-by.function';
import { buildTradeWhere } from '../build-trade-where.function';

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

async function handleOpenTradesIndexes(request: {
  body: IndexesParams;
}): Promise<IndexesResponse> {
  const defaultState = { sort: undefined, filters: undefined };
  const ids = await prisma.trades.findMany({
    where: buildTradeWhere(defaultState, request.body.parentId, true),
    orderBy: buildTradeOrderBy(defaultState),
    skip: request.body.startIndex,
    take: request.body.length,
    select: { id: true },
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
        ? await prisma.trades.count({
            where: buildTradeWhere(defaultState, request.body.parentId, true),
          })
        : 0,
  };
}

async function handleDivDepositsIndexes(request: {
  body: IndexesParams;
}): Promise<IndexesResponse> {
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

function handleGetAccountsIndexesRoute(fastify: FastifyInstance): void {
  fastify.post<{ Body: IndexesParams; Reply: IndexesResponse }>(
    '/',
    indexesSchema,
    async function handleGetIndexesRequest(
      request,
      _
    ): Promise<IndexesResponse> {
      if (request.body.childField === 'openTrades') {
        return handleOpenTradesIndexes(request);
      }
      if (request.body.childField === 'divDeposits') {
        return handleDivDepositsIndexes(request);
      }
      return {
        startIndex: request.body.startIndex,
        indexes: [],
        length: 0,
      };
    }
  );
}

export default function registerAccountRoutes(fastify: FastifyInstance): void {
  handleGetAccountsIndexesRoute(fastify);
}
