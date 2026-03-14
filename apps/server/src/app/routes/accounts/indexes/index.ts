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
  const where = buildTradeWhere(defaultState, request.body.parentId, true);
  const [ids, total] = await Promise.all([
    prisma.trades.findMany({
      where,
      orderBy: buildTradeOrderBy(defaultState),
      skip: request.body.startIndex,
      take: request.body.length,
      select: { id: true },
    }),
    prisma.trades.count({ where }),
  ]);
  return {
    startIndex: request.body.startIndex,
    indexes: ids.map(function itemToString(item: { id: string }) {
      return item.id;
    }),
    length: total,
  };
}

async function handleDivDepositsIndexes(request: {
  body: IndexesParams;
}): Promise<IndexesResponse> {
  const where = { accountId: request.body.parentId };
  const [ids, total] = await Promise.all([
    prisma.divDeposits.findMany({
      where,
      orderBy: { date: 'desc' as const },
      skip: request.body.startIndex,
      take: request.body.length,
      select: { id: true },
    }),
    prisma.divDeposits.count({ where }),
  ]);
  return {
    startIndex: request.body.startIndex,
    indexes: ids.map(function itemToString(item: { id: string }) {
      return item.id;
    }),
    length: total,
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
