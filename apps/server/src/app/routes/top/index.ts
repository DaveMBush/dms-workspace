import { Prisma } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { getHolidays } from 'nyse-holidays';

import { prisma } from '../../prisma/prisma-client';
import { getTableState } from '../common/get-table-state.function';
import { parseSortFilterHeader } from '../common/parse-sort-filter-header.function';
import { TableState } from '../common/table-state.interface';
import { ensureRiskGroupsExist } from '../settings/common/ensure-risk-groups-exist.function';
import { buildScreenerOrderBy } from './build-screener-order-by.function';
import { buildUniverseWhere } from './build-universe-where.function';
import { isUniverseComputedSort } from './is-universe-computed-sort.function';
import { Top } from './top.interface';
import { sortUniversesByComputedField } from './universe-computed-sort.function';

async function ensureHolidaysExist(): Promise<void> {
  const existingHolidays = await prisma.holidays.findMany({
    select: {
      date: true,
    },
    orderBy: { createdAt: 'asc' },
    where: {
      date: {
        gte: new Date('2026-01-01'),
      },
    },
  });

  if (existingHolidays.length === 0) {
    const thisYear = new Date().getFullYear();
    const currentYearHolidays = getHolidays(thisYear);
    for (const holiday of currentYearHolidays) {
      await prisma.holidays.upsert({
        where: { date: holiday.date },
        update: {},
        create: { date: holiday.date, name: holiday.name },
      });
    }
    const nextYearHolidays = getHolidays(thisYear + 1);
    for (const holiday of nextYearHolidays) {
      await prisma.holidays.upsert({
        where: { date: holiday.date },
        update: {},
        create: { date: holiday.date, name: holiday.name },
      });
    }
  }
}

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

const UNIVERSE_DIRECT_SORT_FIELDS = new Set([
  'symbol',
  'distribution',
  'distributions_per_year',
  'last_price',
  'ex_date',
  'expired',
]);

function buildUniverseOrderBy(
  state: TableState
): Prisma.universeOrderByWithRelationInput {
  const sort = state.sort;
  if (sort === undefined) {
    return { createdAt: 'asc' };
  }
  if (sort.field === 'risk_group') {
    return { risk_group: { name: sort.order } };
  }
  if (UNIVERSE_DIRECT_SORT_FIELDS.has(sort.field)) {
    return { [sort.field]: sort.order };
  }
  // For computed fields (yield_percent, avg_purchase_yield_percent), fall back to default
  return { createdAt: 'asc' };
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

function buildTradesSelect(accountId: string | null): Record<string, unknown> {
  const select = { buy: true, quantity: true, sell: true, sell_date: true };
  if (accountId !== null) {
    return { where: { accountId }, select };
  }
  return { select };
}

async function getTopUniverses(state: TableState): Promise<string[]> {
  const sort = state.sort;
  const accountId = getAccountIdFromState(state);

  if (sort !== undefined && isUniverseComputedSort(sort.field)) {
    const universes = await prisma.universe.findMany({
      select: {
        id: true,
        distribution: true,
        distributions_per_year: true,
        last_price: true,
        trades: buildTradesSelect(accountId),
      },
      where: buildUniverseWhere(state),
    });
    sortUniversesByComputedField(universes, sort.field, sort.order);
    return universes.map(function mapUniverse(universe) {
      return universe.id;
    });
  }

  const universes = await prisma.universe.findMany({
    select: {
      id: true,
    },
    where: buildUniverseWhere(state),
    orderBy: buildUniverseOrderBy(state),
  });
  return universes.map(function mapUniverse(universe) {
    return universe.id;
  });
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

async function getTopDivDepositTypes(): Promise<string[]> {
  let divDepositTypes = await prisma.divDepositType.findMany({
    select: {
      id: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  if (divDepositTypes.length === 0) {
    await prisma.divDepositType.create({
      data: {
        name: 'Dividend',
      },
    });
    await prisma.divDepositType.create({
      data: {
        name: 'Deposit',
      },
    });
    divDepositTypes = await prisma.divDepositType.findMany({
      select: {
        id: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  return divDepositTypes.map(function mapDivDepositType(divDepositType) {
    return divDepositType.id;
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
            universes: { type: 'array', items: { type: 'string' } },
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
        getTopUniverses(universeState),
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

export default function registerTopRoutes(fastify: FastifyInstance): void {
  handleTopRoute(fastify);
}
