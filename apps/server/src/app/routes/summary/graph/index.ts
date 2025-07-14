import { FastifyInstance } from "fastify";
import { prisma } from "../../../prisma/prisma-client";
import { GraphResponse } from "./graph.interface";
import { SummaryRequest } from "../summary-request.interface";

export default async function (fastify: FastifyInstance): Promise<void> {

  // Route to fetch accounts by IDs
  // Path: POST /api/accounts
  fastify.get<{ Body: SummaryRequest, Reply: GraphResponse[] }>('/',
    {
      schema: {
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
      },
    },
    async function (request, reply): Promise<void> {
      const { account_id, year } = request.query as { account_id: string; year: string };
      const yearNum = parseInt(year);
      const results: GraphResponse[] = [];
      let runningTotal = 0;
      let pending = 0;

      for (let m = 0; m < 12; m++) {
        const monthStart = new Date(yearNum, m, 1);
        const monthEnd = new Date(yearNum, m + 1, 1);
        // Get all divDeposits for this month
        const account = await prisma.accounts.findUnique({
          where: { id: account_id },
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
        let monthDeposits = 0;
        let monthDividends = 0;
        let monthCapitalGains = 0;
        if (account) {
          monthDeposits = account.divDeposits.filter(dd => dd.universeId === null).reduce((acc, d) => acc + d.amount, 0);
          monthDividends = account.divDeposits.filter(dd => dd.universeId !== null).reduce((acc, d) => acc + d.amount, 0);
          monthCapitalGains = account.trades.reduce((acc, t) => acc + (t.sell - t.buy) * t.quantity, 0);
        }
        runningTotal += pending + monthDeposits;
        results.push({
          month: `${(m + 1).toString().padStart(2, '0')}-${yearNum}`,
          deposits: runningTotal,
          dividends: monthDividends,
          capitalGains: monthCapitalGains,
        });
        pending = monthDividends + monthCapitalGains;
      }
      reply.send(results);
    }
  );
}
