import { FastifyInstance } from 'fastify';

import { prisma } from '../../prisma/prisma-client';
import { getTableState } from '../common/get-table-state.function';
import { parseSortFilterHeader } from '../common/parse-sort-filter-header.function';
import { SortColumn } from '../common/sort-column.interface';
import { TableState } from '../common/table-state.interface';
import { ensureRiskGroupsExist } from '../settings/common/ensure-risk-groups-exist.function';
import { buildScreenerOrderBy } from './build-screener-order-by.function';
import { buildUniverseOrderBy } from './build-universe-order-by.function';
import { buildUniverseWhere } from './build-universe-where.function';
import { ensureHolidaysExist } from './ensure-holidays-exist.function';
import { getTopDivDepositTypes } from './get-top-div-deposit-types.function';
import { getTopUniversesComputedSort } from './get-top-universes-computed-sort.function';
import { isUniverseComputedSort } from './is-universe-computed-sort.function';
import { PartialArrayDefinition } from './partial-array-definition.interface';
import { Top } from './top.interface';

const TOP_PAGE_SIZE = 50;

async function getTopAccounts(): Promise<string[]> {
  const topAccounts = await prisma.accounts.findMany({
    select: {
      id: true,
    },
    orderBy: { createdAt: 'asc' },
  });
  return topAccounts.map(function mapAccount(account) {
    return account.id;
  });
}

function getAccountIdFromState(state: TableState): string | null {
  const filters = state.filters;
  if (filters === undefined) {
    return null;
  }
  return typeof filters['account_id'] === 'string'
    ? filters['account_id']
    : null;
}

function findComputedSortColumn(state: TableState): SortColumn | undefined {
  const sortColumns: SortColumn[] | undefined = state.sortColumns;
  if (sortColumns === undefined || sortColumns.length === 0) {
    const sort = state.sort;
    if (sort !== undefined && isUniverseComputedSort(sort.field)) {
      return { column: sort.field, direction: sort.order };
    }
    return undefined;
  }
  for (let i = 0; i < sortColumns.length; i++) {
    if (isUniverseComputedSort(sortColumns[i].column)) {
      return sortColumns[i];
    }
  }
  return undefined;
}

async function getTopUniverses(
  state: TableState,
  startIndex: number,
  length?: number
): Promise<PartialArrayDefinition> {
  const accountId = getAccountIdFromState(state);
  const computedSort: SortColumn | undefined = findComputedSortColumn(state);

  if (computedSort !== undefined) {
    return getTopUniversesComputedSort({
      state,
      startIndex,
      length,
      accountId,
      computedSort,
    });
  }

  const findManyArgs: Parameters<typeof prisma.universe.findMany>[0] = {
    select: {
      id: true,
    },
    where: buildUniverseWhere(state),
    orderBy: buildUniverseOrderBy(state),
    skip: startIndex,
  };
  /* v8 ignore start */
  if (length !== undefined) {
    findManyArgs.take = length;
  }
  /* v8 ignore stop */
  const [totalCount, universes] = await Promise.all([
    prisma.universe.count({ where: buildUniverseWhere(state) }),
    prisma.universe.findMany(findManyArgs),
  ]);
  return {
    startIndex,
    indexes: universes.map(function mapUniverse(universe) {
      return universe.id;
    }),
    length: totalCount,
  };
}

async function getTopRiskGroups(): Promise<string[]> {
  const riskGroups = await prisma.risk_group.findMany({
    select: {
      id: true,
    },
    orderBy: { createdAt: 'asc' },
  });
  return riskGroups.map(function mapRiskGroup(riskGroup) {
    return riskGroup.id;
  });
}

async function getTopHolidays(): Promise<Date[]> {
  const dbHolidays = await prisma.holidays.findMany({
    select: {
      date: true,
    },
    orderBy: { createdAt: 'asc' },
  });
  return dbHolidays.map(function mapHoliday(holiday) {
    return holiday.date;
  });
}

async function getTopScreens(state: TableState): Promise<string[]> {
  const screens = await prisma.screener.findMany({
    select: {
      id: true,
    },
    orderBy: buildScreenerOrderBy(state),
  });
  return screens.map(function mapScreen(screen) {
    return screen.id;
  });
}

function createTopSchema(): Record<string, unknown> {
  return {
    body: {
      type: 'array',
      items: { type: 'string' },
    },
    response: {
      200: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            accounts: { type: 'array', items: { type: 'string' } },
            universes: {
              type: 'object',
              properties: {
                startIndex: { type: 'number' },
                indexes: { type: 'array', items: { type: 'string' } },
                length: { type: 'number' },
              },
            },
            riskGroups: { type: 'array', items: { type: 'string' } },
            divDepositTypes: { type: 'array', items: { type: 'string' } },
            holidays: {
              type: 'array',
              items: { type: 'string', format: 'date-time' },
            },
            screens: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  };
}

function handleTopRoute(fastify: FastifyInstance): void {
  fastify.post<{ Body: { ids: string[] }; Reply: Top[] }>(
    '/',
    {
      schema: createTopSchema(),
    },
    async function handleTopRequest(request, reply): Promise<Top[]> {
      const ids = request.body as unknown as string[];
      if (ids.length === 0) {
        return reply.status(200).send([]);
      }

      // Ensure risk groups exist before proceeding
      await ensureRiskGroupsExist();

      await ensureHolidaysExist();

      const allState = parseSortFilterHeader(request);
      const universeState = getTableState(allState, 'universes');
      const screenerState = getTableState(allState, 'screens');

      const [
        accounts,
        universes,
        riskGroups,
        divDepositTypes,
        holidays,
        screens,
      ] = await Promise.all([
        getTopAccounts(),
        getTopUniverses(universeState, 0, TOP_PAGE_SIZE),
        getTopRiskGroups(),
        getTopDivDepositTypes(),
        getTopHolidays(),
        getTopScreens(screenerState),
      ]);

      return reply.status(200).send([
        {
          id: '1',
          accounts,
          universes,
          riskGroups,
          divDepositTypes,
          holidays,
          screens,
        },
      ]);
    }
  );
}

interface IndexesRequestBody {
  parentId: string;
  childField: string;
  startIndex: number;
  length: number;
}

function createIndexesSchema(): Record<string, unknown> {
  return {
    body: {
      type: 'object',
      required: ['parentId', 'childField', 'startIndex', 'length'],
      properties: {
        parentId: { type: 'string' },
        childField: { type: 'string' },
        startIndex: { type: 'number' },
        length: { type: 'number' },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          startIndex: { type: 'number' },
          indexes: { type: 'array', items: { type: 'string' } },
          length: { type: 'number' },
        },
      },
    },
  };
}

function handleIndexesRoute(fastify: FastifyInstance): void {
  fastify.post<{ Body: IndexesRequestBody; Reply: PartialArrayDefinition }>(
    '/indexes',
    {
      schema: createIndexesSchema(),
    },
    async function handleIndexesRequest(
      request,
      reply
    ): Promise<PartialArrayDefinition> {
      const { childField, startIndex, length } = request.body;

      if (childField !== 'universes') {
        return reply.status(200).send({
          startIndex,
          indexes: [],
          length: 0,
        });
      }

      const allState = parseSortFilterHeader(request);
      const universeState = getTableState(allState, 'universes');
      const result = await getTopUniverses(universeState, startIndex, length);
      return reply.status(200).send(result);
    }
  );
}

export default function registerTopRoutes(fastify: FastifyInstance): void {
  handleTopRoute(fastify);
  handleIndexesRoute(fastify);
}
