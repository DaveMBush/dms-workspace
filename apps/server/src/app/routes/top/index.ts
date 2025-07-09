import { FastifyInstance } from 'fastify';
import { Top } from './top.interface';
import { prisma } from '../../prisma/prisma-client';
import { getHolidays } from 'nyse-holidays';

export default async function (fastify: FastifyInstance): Promise<void> {
  console.log('registering /api/top route');
  fastify.post<{ Body: { ids: string[] }, Reply: Top[] }>('/',
    {
      schema: {
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
                holidays: { type: 'array', items: { type: 'string', format: 'date-time' } }
              }
            },
          },
        },
      },
    },
    async function (request, reply): Promise<Top[]> {
      console.log('POST /api/top called with body:', request.body);
      const ids = request.body as unknown as string[];
      if (ids.length === 0) {
        return reply.status(200).send([]);
      }

      const holidays = await prisma.holidays.findMany({
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
      if (holidays.length === 0) {
        const thisYear = (new Date()).getFullYear();
        let holidays = getHolidays(thisYear);
        for (const holiday of holidays) {
          await prisma.holidays.upsert({
            where: { date: holiday.date },
            update: { },
            create: { date: holiday.date, name: holiday.name }
          });
        }
        holidays = getHolidays(thisYear + 1);
        for (const holiday of holidays) {
          await prisma.holidays.upsert({
            where: { date: holiday.date },
            update: { },
            create: { date: holiday.date, name: holiday.name }
          });
        }
      }


      const topAccounts = await prisma.accounts.findMany({
        select: {
          id: true
        },
        orderBy: { createdAt: 'asc' }
      });
      const universe = await prisma.universe.findMany({
        select: {
          id: true
        },
        orderBy: { createdAt: 'asc' }
      });
      const riskGroup = await prisma.risk_group.findMany({
        select: {
          id: true
        },
        orderBy: { createdAt: 'asc' }
      });
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
      const dbHolidays = await prisma.holidays.findMany({
        select: {
          date: true
        },
        orderBy: { createdAt: 'asc' }
      });
      return reply.status(200).send([{
        id: '1',
        accounts: topAccounts.map((account) => account.id),
        universes: universe.map((universe) => universe.id),
        riskGroups: riskGroup.map((riskGroup) => riskGroup.id),
        divDepositTypes: divDepositTypes.map((divDepositType) => divDepositType.id),
        holidays: dbHolidays.map((holiday) => holiday.date)
      }]);
    });
}
