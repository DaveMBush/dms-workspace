import { getHolidays } from 'nyse-holidays';

import { prisma } from '../../prisma/prisma-client';

export async function ensureHolidaysExist(): Promise<void> {
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
