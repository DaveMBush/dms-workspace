import { FastifyInstance } from 'fastify';
import { getHolidays } from 'nyse-holidays';

import { prisma } from '../../prisma/prisma-client';
import { Top } from './top.interface';

async function ensureHolidaysExist(): Promise<void> {
  const existingHolidays = await prisma.holidays.findMany({
    select: {
      date: true
    },
    orderBy: { createdAt: 'asc' },
    where: {
      date: {
        gte: new Date('2026-01-01')
      }
    }
  });

  if (existingHolidays.length === 0) {
    const thisYear = (new Date()).getFullYear();
    const currentYearHolidays = getHolidays(thisYear);
    for (const holiday of currentYearHolidays) {
      await prisma.holidays.upsert({
        where: { date: holiday.date },
        update: { },
        create: { date: holiday.date, name: holiday.name }
      });
    }
    const nextYearHolidays = getHolidays(thisYear + 1);
    for (const holiday of nextYearHolidays) {
      await prisma.holidays.upsert({
        where: { date: holiday.date },
        update: { },
        create: { date: holiday.date, name: holiday.name }
      });
    }
  }
}

async function getTopAccounts(): Promise<string[]> {
  const topAccounts = await prisma.accounts.findMany({
    select: {
      id: true
    },
    orderBy: { createdAt: 'asc' }
  });
  return topAccounts.map(function mapAccount(account) {
    return account.id;
  });
}

async function getTopUniverses(): Promise<string[]> {
  const universes = await prisma.universe.findMany({
    select: {
      id: true
    },
    orderBy: { createdAt: 'asc' }
  });
  return universes.map(function mapUniverse(universe) {
    return universe.id;
  });
}

async function getTopRiskGroups(): Promise<string[]> {
  const riskGroups = await prisma.risk_group.findMany({
    select: {
      id: true
    },
    orderBy: { createdAt: 'asc' }
  });
  return riskGroups.map(function mapRiskGroup(riskGroup) {
    return riskGroup.id;
  });
}

async function getTopDivDepositTypes(): Promise<string[]> {
  let divDepositTypes = await prisma.divDepositType.findMany({
    select: {
      id: true
    },
    orderBy: { createdAt: 'asc' }
  });

  if (divDepositTypes.length === 0) {
    await prisma.divDepositType.create({
      data: {
        name: 'Dividend'
      }
    });
    await prisma.divDepositType.create({
      data: {
        name: 'Deposit'
      }
    });
    divDepositTypes = await prisma.divDepositType.findMany({
      select: {
        id: true
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  return divDepositTypes.map(function mapDivDepositType(divDepositType) {
    return divDepositType.id;
  });
}

async function getTopHolidays(): Promise<Date[]> {
  const dbHolidays = await prisma.holidays.findMany({
    select: {
      date: true
    },
    orderBy: { createdAt: 'asc' }
  });
  return dbHolidays.map(function mapHoliday(holiday) {
    return holiday.date;
  });
}

async function getTopScreens(): Promise<string[]> {
  const screens = await prisma.screener.findMany({
    select: {
      id: true
    },
    orderBy: { createdAt: 'asc' }
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
            holidays: { type: 'array', items: { type: 'string', format: 'date-time' } },
            screens: { type: 'array', items: { type: 'string' } }
          }
        },
      },
    },
  };
}

function handleTopRoute(fastify: FastifyInstance): void {
  fastify.post<{ Body: { ids: string[] }, Reply: Top[] }>('/',
    {
      schema: createTopSchema(),
    },
    async function handleTopRequest(request, reply): Promise<Top[]> {
      const ids = request.body as unknown as string[];
      if (ids.length === 0) {
        return reply.status(200).send([]);
      }

      await ensureHolidaysExist();

      const [accounts, universes, riskGroups, divDepositTypes, holidays, screens] = await Promise.all([
        getTopAccounts(),
        getTopUniverses(),
        getTopRiskGroups(),
        getTopDivDepositTypes(),
        getTopHolidays(),
        getTopScreens()
      ]);

      return reply.status(200).send([{
        id: '1',
        accounts,
        universes,
        riskGroups,
        divDepositTypes,
        holidays,
        screens
      }]);
    }
  );
}

export default function registerTopRoutes(fastify: FastifyInstance): void {
  handleTopRoute(fastify);
}
