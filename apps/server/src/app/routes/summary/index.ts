import { FastifyInstance } from "fastify";

import { prisma } from "../../prisma/prisma-client";
import { Summary } from "./summary.interface";
import { SummaryRequest } from "./summary-request.interface";

interface RiskGroupResult {
  riskGroupId: string;
  riskGroupName: string;
  totalCostBasis: number;
  tradeCount: number;
}

interface DivDeposit {
  universeId: string | null;
  amount: number;
}

interface Trade {
  sell: number;
  buy: number;
  quantity: number;
}

interface AccountWithTradesAndDeposits {
  divDeposits: DivDeposit[];
  trades: Trade[];
}

interface SummarySchema {
  querystring: {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
  };
  response: {
    // eslint-disable-next-line @typescript-eslint/naming-convention -- fastify schema
    200: {
      type: string;
      properties: Record<string, unknown>;
    };
  };
}

function createSummarySchema(): SummarySchema {
  return {
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
  };
}

function parseMonthString(month: string): { year: number; monthNum: number } {
  const [yearStr, monthStr] = month.split('-');
  const year = parseInt(yearStr, 10);
  const monthNum = parseInt(monthStr, 10);
  return { year, monthNum };
}

function calculateDateRange(year: number, monthNum: number): { start: Date; end: Date } {
  const sellDateStart = new Date(year, monthNum - 1, 1);
  const sellDateEnd = new Date(year, monthNum, 1);
  return { start: sellDateStart, end: sellDateEnd };
}

async function getAccountThisMonth(accountId: string, sellDateStart: Date, sellDateEnd: Date): Promise<AccountWithTradesAndDeposits | null> {
  return prisma.accounts.findUnique({
    where: { id: accountId },
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
}

async function getAccountPriorMonths(accountId: string, sellDateStart: Date): Promise<AccountWithTradesAndDeposits[]> {
  return prisma.accounts.findMany({
    where: {
      id: accountId,
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
}

function calculateDeposits(divDeposits: DivDeposit[]): number {
  return divDeposits.filter(function filterDeposits(dd: DivDeposit): boolean {
    return dd.universeId === null;
  }).reduce(function sumDeposits(acc: number, deposit: DivDeposit): number {
    return acc + deposit.amount;
  }, 0);
}

function calculateDividends(divDeposits: DivDeposit[]): number {
  return divDeposits.filter(function filterDividends(dd: DivDeposit): boolean {
    return dd.universeId !== null;
  }).reduce(function sumDividends(acc: number, deposit: DivDeposit): number {
    return acc + deposit.amount;
  }, 0);
}

function calculateCapitalGains(trades: Trade[]): number {
  return trades.reduce(function sumCapitalGains(acc: number, trade: Trade): number {
    return acc + (trade.sell - trade.buy) * trade.quantity;
  }, 0);
}

function calculatePriorDivDeposits(accounts: AccountWithTradesAndDeposits[]): number {
  return accounts.reduce(function sumAccountDeposits(accountAcc: number, account: AccountWithTradesAndDeposits): number {
    return accountAcc + account.divDeposits.reduce(function sumDeposits(depositAcc: number, deposit: DivDeposit): number {
      return depositAcc + deposit.amount;
    }, 0);
  }, 0);
}

function calculatePriorCapitalGains(accounts: AccountWithTradesAndDeposits[]): number {
  return accounts.reduce(function sumAccountTrades(accountAcc: number, account: AccountWithTradesAndDeposits): number {
    return accountAcc + account.trades.reduce(function sumTrades(tradeAcc: number, trade: Trade): number {
      return tradeAcc + (trade.sell - trade.buy) * trade.quantity;
    }, 0);
  }, 0);
}

async function getRiskGroupData(year: number, monthNum: number): Promise<RiskGroupResult[]> {
  return prisma.$queryRaw<RiskGroupResult[]>`
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
}

function createRiskGroupMap(result: RiskGroupResult[]): Map<string, number> {
  const riskGroupMap = new Map<string, number>();
  result.forEach(function mapRiskGroup(r: RiskGroupResult): void {
    riskGroupMap.set(r.riskGroupName, r.totalCostBasis);
  });
  return riskGroupMap;
}

function handleSummaryRoute(fastify: FastifyInstance): void {
  fastify.get<{ Body: SummaryRequest, Reply: Summary }>('/',
    {
      schema: createSummarySchema(),
    },
    async function handleSummaryRequest(request, reply): Promise<void> {
      const { month, account_id } = request.query as SummaryRequest;

      const { year, monthNum } = parseMonthString(month);
      const { start: sellDateStart, end: sellDateEnd } = calculateDateRange(year, monthNum);

      const accountThisMonth = await getAccountThisMonth(account_id, sellDateStart, sellDateEnd);
      if (!accountThisMonth) {
        throw new Error('Account not found');
      }

      const accountPriorMonths = await getAccountPriorMonths(account_id, sellDateStart);

      const deposits = calculateDeposits(accountThisMonth.divDeposits);
      const dividends = calculateDividends(accountThisMonth.divDeposits);
      const capitalGains = calculateCapitalGains(accountThisMonth.trades);

      const priorDivDeposit = calculatePriorDivDeposits(accountPriorMonths);
      const priorCapitalGains = calculatePriorCapitalGains(accountPriorMonths);

      const result = await getRiskGroupData(year, monthNum);
      const riskGroupMap = createRiskGroupMap(result);

      const equitiesValue = riskGroupMap.get('Equities');
      const incomeValue = riskGroupMap.get('Income');
      const taxFreeIncomeValue = riskGroupMap.get('Tax Free Income');

      reply.send({
        deposits: deposits + priorDivDeposit + priorCapitalGains,
        dividends,
        capitalGains,
        equities: equitiesValue !== undefined ? equitiesValue : 0,
        income: incomeValue !== undefined ? incomeValue : 0,
        tax_free_income: taxFreeIncomeValue !== undefined ? taxFreeIncomeValue : 0,
      });
    }
  );
}

export default function registerSummaryRoutes(fastify: FastifyInstance): void {
  handleSummaryRoute(fastify);
}
