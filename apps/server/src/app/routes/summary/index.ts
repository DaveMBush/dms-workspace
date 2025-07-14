import { FastifyInstance } from "fastify";
import { Summary } from "./summary.interface";
import { prisma } from "../../prisma/prisma-client";
import { SummaryRequest } from "./summary-request.interface";

export default async function (fastify: FastifyInstance): Promise<void> {

  // Route to fetch accounts by IDs
  // Path: POST /api/accounts
  fastify.get<{ Body: SummaryRequest, Reply: Summary }>('/',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            month: { type: 'string' },
            account_id: { type: 'string' },
          },
          required: ['month', 'account_id'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              deposits: { type: 'number' },
              dividends: { type: 'number' },
              capitalGains: { type: 'number' },
              equities: { type: 'number' },
              income: { type: 'number' },
              tax_free_income: { type: 'number' },
            },
          },
        },
      },
    },
    async function (request, reply): Promise<void> {
      console.log('HANDLER: GET /api/summary');

      const { month, account_id } = request.query as SummaryRequest;

      const [yearStr, monthStr] = month.split('-');
      const year = parseInt(yearStr);
      const monthNum = parseInt(monthStr);

      const sellDateStart = new Date(year, monthNum - 1, 1);
      const sellDateEnd = new Date(year, monthNum, 1);
      const accountThisMonth = await prisma.accounts.findUnique({
        where: { id: account_id },
        include: {
          trades: {
            where: {
              sell_date: {
                gte: sellDateStart,
                lt: sellDateEnd,
              },
            },
          },
          divDeposits: {
            where: {
              date: {
                gte: sellDateStart,
                lt: sellDateEnd,
              },
            },
          },
        },
      });
      if (!accountThisMonth) {
        throw new Error('Account not found');
      }

      const accountPriorMonths = await prisma.accounts.findMany({
        where: {
          id: account_id,
        },
        include: {
          trades: {
            where: {
              sell_date: {
                lt: sellDateStart
              },
            },
          },
          divDeposits: {
            where: {
              date: {
                lt: sellDateStart,
              },
            },
          },
        },
      });

      const deposits = accountThisMonth.divDeposits.filter(
        (dd) => dd.universeId === null
      ).reduce((acc, deposit) => acc + deposit.amount, 0);

      const dividends = accountThisMonth.divDeposits.filter(
        (dd) => dd.universeId !== null
      ).reduce((acc, deposit) => acc + deposit.amount, 0);
      const capitalGains = accountThisMonth.trades.reduce((acc, trade) => acc + (trade.sell - trade.buy) * trade.quantity, 0);

      const priorDivDeposit = accountPriorMonths.reduce((acc, account) => acc + account.divDeposits.reduce((acc, deposit) => acc + deposit.amount, 0), 0);
      const priorCapitalGains = accountPriorMonths.reduce((acc, account) => acc + account.trades.reduce((acc, trade) => acc + (trade.sell - trade.buy) * trade.quantity, 0), 0);

      const result = await prisma.$queryRaw<{ riskGroupId: string, riskGroupName: string, totalCostBasis: number, tradeCount: number }[]>`
        SELECT
          rg.id as riskGroupId,
          rg.name as riskGroupName,
          SUM(t.buy * t.quantity) as totalCostBasis,
          COUNT(t.id) as tradeCount
        FROM trades t
        JOIN universe u ON t.universeId = u.id
        JOIN risk_group rg ON u.risk_group_id = rg.id
        WHERE (t.sell_date IS NULL OR
              (t.sell_date >= ${new Date(year, monthNum - 1, 1)} AND
                t.sell_date < ${new Date(year, monthNum, 0)}))
        GROUP BY rg.id, rg.name
      `;

      const riskGroupMap = new Map<string, number>();
      result.forEach((r) => {
        riskGroupMap.set(r.riskGroupName, r.totalCostBasis);
      });

      reply.send({
        deposits: deposits + priorDivDeposit + priorCapitalGains,
        dividends: dividends,
        capitalGains: capitalGains,
        equities: riskGroupMap.get('Equities') || 0,
        income: riskGroupMap.get('Income') || 0,
        tax_free_income: riskGroupMap.get('Tax Free Income') || 0,
      });
    }
  );
}
