import { FastifyInstance } from 'fastify';

import { prisma } from '../../../prisma/prisma-client';

async function getAvailableMonths(): Promise<
  Array<{ month: string; label: string }>
> {
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

  // Extract months from divDeposits
  const divDepositMonths = new Set<string>();
  divDeposits.forEach(function extractDivDepositMonth(deposit) {
    const d = new Date(deposit.date);
    const monthStr = `${d.getFullYear()}-${(d.getMonth() + 1)
      .toString()
      .padStart(2, '0')}`;
    divDepositMonths.add(monthStr);
  });

  // Extract months from trades
  const tradeMonths = new Set<string>();
  trades.forEach(function extractTradeMonth(trade) {
    const d = new Date(trade.sell_date!);
    const monthStr = `${d.getFullYear()}-${(d.getMonth() + 1)
      .toString()
      .padStart(2, '0')}`;
    tradeMonths.add(monthStr);
  });

  // Combine and sort months
  const allMonths = [...divDepositMonths, ...tradeMonths];
  const uniqueMonths = [...new Set(allMonths)];
  const sortedMonths = uniqueMonths.toSorted(function sortMonthsDescending(
    a,
    b
  ) {
    return b.localeCompare(a);
  });

  // Format for response
  return sortedMonths.map(function formatMonth(monthStr) {
    const [year, month] = monthStr.split('-');
    return {
      month: monthStr,
      label: `${month}/${year}`,
    };
  });
}

function handleAvailableMonthsRoute(fastify: FastifyInstance): void {
  fastify.get(
    '/',
    {
      schema: {
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                month: { type: 'string' },
                label: { type: 'string' },
              },
              required: ['month', 'label'],
            },
          },
        },
      },
    },
    async function handleAvailableMonthsRequest(request, reply): Promise<void> {
      const months = await getAvailableMonths();
      reply.send(months);
    }
  );
}

export default function registerMonthsRoutes(fastify: FastifyInstance): void {
  handleAvailableMonthsRoute(fastify);
}
