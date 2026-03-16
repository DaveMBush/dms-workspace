import { FastifyInstance, FastifyRequest } from 'fastify';

import { prisma } from '../../../prisma/prisma-client';
import { getTableState } from '../../common/get-table-state.function';
import { parseSortFilterHeader } from '../../common/parse-sort-filter-header.function';
import { TableState } from '../../common/table-state.interface';
import { buildDivDepositOrderBy } from '../build-div-deposit-order-by.function';
import { buildDivDepositWhere } from '../build-div-deposit-where.function';
import { buildTradeOrderBy } from '../build-trade-order-by.function';
import { buildTradeWhere } from '../build-trade-where.function';
import { getTradeComputedValue } from '../get-trade-computed-value.function';
import { isComputedTradeSort } from '../is-computed-trade-sort.function';

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

async function handleComputedTradeIndexes(
  body: IndexesParams,
  state: TableState,
  isOpen: boolean
): Promise<IndexesResponse> {
  const where = buildTradeWhere(state, body.parentId, isOpen);
  const [trades, total] = await Promise.all([
    prisma.trades.findMany({
      where,
      select: {
        id: true,
        buy: true,
        quantity: true,
        universe: { select: { last_price: true } },
      },
    }),
    prisma.trades.count({ where }),
  ]);
  const field = state.sort!.field;
  const order = state.sort!.order;
  trades.sort(function sortByComputed(a, b) {
    const diff =
      getTradeComputedValue(field, a) - getTradeComputedValue(field, b);
    return order === 'desc' ? -diff : diff;
  });
  const sliced = trades.slice(body.startIndex, body.startIndex + body.length);
  return {
    startIndex: body.startIndex,
    indexes: sliced.map(function mapId(t) {
      return t.id;
    }),
    length: total,
  };
}

async function handleTradeIndexes(
  body: IndexesParams,
  state: TableState,
  isOpen: boolean
): Promise<IndexesResponse> {
  if (isComputedTradeSort(state)) {
    return handleComputedTradeIndexes(body, state, isOpen);
  }
  const where = buildTradeWhere(state, body.parentId, isOpen);
  const [ids, total] = await Promise.all([
    prisma.trades.findMany({
      where,
      orderBy: buildTradeOrderBy(state),
      skip: body.startIndex,
      take: body.length,
      select: { id: true },
    }),
    prisma.trades.count({ where }),
  ]);
  return {
    startIndex: body.startIndex,
    indexes: ids.map(function itemToString(item: { id: string }) {
      return item.id;
    }),
    length: total,
  };
}

async function handleDivDepositsIndexes(
  body: IndexesParams,
  state: TableState
): Promise<IndexesResponse> {
  const where = buildDivDepositWhere(state, body.parentId);
  const [ids, total] = await Promise.all([
    prisma.divDeposits.findMany({
      where,
      orderBy: buildDivDepositOrderBy(state),
      skip: body.startIndex,
      take: body.length,
      select: { id: true },
    }),
    prisma.divDeposits.count({ where }),
  ]);
  return {
    startIndex: body.startIndex,
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
      request: FastifyRequest<{ Body: IndexesParams }>,
      _
    ): Promise<IndexesResponse> {
      const allState = parseSortFilterHeader(request);
      if (request.body.childField === 'openTrades') {
        const openState = getTableState(allState, 'trades-open');
        return handleTradeIndexes(request.body, openState, true);
      }
      if (request.body.childField === 'soldTrades') {
        const closedState = getTableState(allState, 'trades-closed');
        return handleTradeIndexes(request.body, closedState, false);
      }
      if (request.body.childField === 'divDeposits') {
        const divState = getTableState(allState, 'div-deposits');
        return handleDivDepositsIndexes(request.body, divState);
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
