import { FastifyInstance } from "fastify";

import { prisma } from "../../../prisma/prisma-client";
import { SummaryRequest } from "../summary-request.interface";
import { GraphResponse } from "./graph.interface";

interface AccountWithData {
  divDeposits: Array<{
    universeId: string | null;
    amount: number;
  }>;
  trades: Array<{
    sell: number;
    buy: number;
    quantity: number;
  }>;
}

function createGraphSchema(): Record<string, unknown> {
  return {
    querystring: {
      type: 'object',
      properties: {
        account_id: { type: 'string' },
        year: { type: 'string' },
        time_period: { type: 'string', enum: ['year'] },
      },
      required: ['account_id', 'year'],
    },
    response: {
      200: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            month: { type: 'string' },
            deposits: { type: 'number' },
            dividends: { type: 'number' },
            capitalGains: { type: 'number' },
          },
          required: ['month', 'deposits', 'dividends', 'capitalGains'],
        },
      },
    },
  };
}

async function getAccountForMonth(accountId: string, monthStart: Date, monthEnd: Date): Promise<AccountWithData | null> {
  return prisma.accounts.findUnique({
    where: { id: accountId },
    include: {
      divDeposits: {
        where: {
          date: {
            gte: monthStart,
            lt: monthEnd,
          },
        },
      },
      trades: {
        where: {
          sell_date: {
            gte: monthStart,
            lt: monthEnd,
          },
        },
      },
    },
  });
}

function calculateMonthDeposits(divDeposits: Array<{ universeId: string | null; amount: number }>): number {
  return divDeposits.filter(function filterDeposits(dd) {
    return dd.universeId === null;
  }).reduce(function sumDeposits(acc, d) {
    return acc + d.amount;
  }, 0);
}

function calculateMonthDividends(divDeposits: Array<{ universeId: string | null; amount: number }>): number {
  return divDeposits.filter(function filterDividends(dd) {
    return dd.universeId !== null;
  }).reduce(function sumDividends(acc, d) {
    return acc + d.amount;
  }, 0);
}

function calculateMonthCapitalGains(trades: Array<{ sell: number; buy: number; quantity: number }>): number {
  return trades.reduce(function sumCapitalGains(acc, t) {
    return acc + (t.sell - t.buy) * t.quantity;
  }, 0);
}

function formatMonthString(month: number, year: number): string {
  return `${(month + 1).toString().padStart(2, '0')}-${year}`;
}

async function processMonthData(accountId: string, year: number, month: number): Promise<{
  monthDeposits: number;
  monthDividends: number;
  monthCapitalGains: number;
}> {
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 1);

  const account = await getAccountForMonth(accountId, monthStart, monthEnd);

  if (!account) {
    return { monthDeposits: 0, monthDividends: 0, monthCapitalGains: 0 };
  }

  const monthDeposits = calculateMonthDeposits(account.divDeposits);
  const monthDividends = calculateMonthDividends(account.divDeposits);
  const monthCapitalGains = calculateMonthCapitalGains(account.trades);

  return { monthDeposits, monthDividends, monthCapitalGains };
}

async function generateGraphData(accountId: string, year: number): Promise<GraphResponse[]> {
  const results: GraphResponse[] = [];
  let runningTotal = 0;
  let pending = 0;

  for (let m = 0; m < 12; m++) {
    const { monthDeposits, monthDividends, monthCapitalGains } = await processMonthData(accountId, year, m);

    runningTotal += pending + monthDeposits;
    results.push({
      month: formatMonthString(m, year),
      deposits: runningTotal,
      dividends: monthDividends,
      capitalGains: monthCapitalGains,
    });
    pending = monthDividends + monthCapitalGains;
  }

  return results;
}

function handleGraphRoute(fastify: FastifyInstance): void {
  fastify.get<{ Body: SummaryRequest, Reply: GraphResponse[] }>('/',
    {
      schema: createGraphSchema(),
    },
    async function handleGraphRequest(request, reply): Promise<void> {
      const { account_id: accountId, year } = request.query as { account_id: string; year: string };
      const yearNum = parseInt(year, 10);
              const results = await generateGraphData(accountId, yearNum);
      reply.send(results);
    }
  );
}

export default function registerGraphRoutes(fastify: FastifyInstance): void {
  handleGraphRoute(fastify);
}
