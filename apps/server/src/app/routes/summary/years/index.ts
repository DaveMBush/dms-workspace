import { FastifyInstance } from 'fastify';

import { prisma } from '../../../prisma/prisma-client';

async function getAvailableYears(): Promise<number[]> {
  // Get all divDeposits with dates
  const divDeposits = await prisma.divDeposits.findMany({
    where: { date: { not: undefined } },
    select: { date: true },
  });

  // Get all trades with sell dates
  const trades = await prisma.trades.findMany({
    where: { sell_date: { not: null } },
    select: { sell_date: true },
  });

  // Extract years from divDeposits and trades
  const yearSet = new Set<number>();

  divDeposits.forEach(function extractDivDepositYear(deposit) {
    yearSet.add(new Date(deposit.date).getFullYear());
  });

  trades.forEach(function extractTradeYear(trade) {
    yearSet.add(new Date(trade.sell_date!).getFullYear());
  });

  // Return sorted descending
  return Array.from(yearSet).sort(function sortDescending(a, b) {
    return b - a;
  });
}

function handleAvailableYearsRoute(fastify: FastifyInstance): void {
  fastify.get(
    '/',
    {
      schema: {
        response: {
          // eslint-disable-next-line @typescript-eslint/naming-convention -- fastify schema
          200: {
            type: 'array',
            items: { type: 'number' },
          },
        },
      },
    },
    async function handleAvailableYearsRequest(request, reply): Promise<void> {
      const years = await getAvailableYears();
      reply.send(years);
    }
  );
}

export default function registerYearsRoutes(fastify: FastifyInstance): void {
  handleAvailableYearsRoute(fastify);
}
