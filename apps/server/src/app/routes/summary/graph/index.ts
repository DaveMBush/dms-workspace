import { FastifyInstance } from "fastify";

import { prisma } from "../../../prisma/prisma-client";
import { aggregateAccountData } from "../aggregate-account-data.function";
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
      required: ['year'],
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

async function getAllAccountsForMonth(monthStart: Date, monthEnd: Date): Promise<AccountWithData[]> {
  return prisma.accounts.findMany({
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

  const monthData = aggregateAccountData([account]);
  return {
    monthDeposits: monthData.deposits,
    monthDividends: monthData.dividends,
    monthCapitalGains: monthData.capitalGains
  };
}

async function processGlobalMonthData(year: number, month: number): Promise<{
  monthDeposits: number;
  monthDividends: number;
  monthCapitalGains: number;
}> {
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 1);

  const allAccounts = await getAllAccountsForMonth(monthStart, monthEnd);

  const monthData = aggregateAccountData(allAccounts);
  const monthDeposits = monthData.deposits;
  const monthDividends = monthData.dividends;
  const monthCapitalGains = monthData.capitalGains;

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

async function generateGlobalGraphData(year: number): Promise<GraphResponse[]> {
  const results: GraphResponse[] = [];
  let runningTotal = 0;
  let pending = 0;

  for (let m = 0; m < 12; m++) {
    const { monthDeposits, monthDividends, monthCapitalGains } = await processGlobalMonthData(year, m);

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
      const { account_id: accountId, year } = request.query as { account_id?: string; year: string };
      const yearNum = parseInt(year, 10);

      let results: GraphResponse[];
      if (accountId !== undefined) {
        results = await generateGraphData(accountId, yearNum);
      } else {
        results = await generateGlobalGraphData(yearNum);
      }

      reply.send(results);
    }
  );
}

export default function registerGraphRoutes(fastify: FastifyInstance): void {
  handleGraphRoute(fastify);
}
