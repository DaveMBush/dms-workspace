import { FastifyInstance } from "fastify";

import { prisma } from "../../prisma/prisma-client";
import { aggregateAccountData } from "./aggregate-account-data.function";
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
      required: ['month'],
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



function calculatePriorDivDeposits(accounts: AccountWithTradesAndDeposits[]): number {
  const aggregatedData = aggregateAccountData(accounts);
  return aggregatedData.deposits + aggregatedData.dividends;
}

function calculatePriorCapitalGains(accounts: AccountWithTradesAndDeposits[]): number {
  const aggregatedData = aggregateAccountData(accounts);
  return aggregatedData.capitalGains;
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

async function calculateSummaryData(accountId: string | undefined, sellDateStart: Date, sellDateEnd: Date): Promise<{
  deposits: number;
  dividends: number;
  capitalGains: number;
  priorDivDeposit: number;
  priorCapitalGains: number;
}> {
  let deposits: number;
  let dividends: number;
  let capitalGains: number;
  let priorDivDeposit: number;
  let priorCapitalGains: number;

  if (accountId !== undefined) {
    // Single account summary
    const accountThisMonth = await getAccountThisMonth(accountId, sellDateStart, sellDateEnd);
    if (!accountThisMonth) {
      throw new Error('Account not found');
    }

    const accountPriorMonths = await getAccountPriorMonths(accountId, sellDateStart);

    const singleAccountData = aggregateAccountData([accountThisMonth]);
    deposits = singleAccountData.deposits;
    dividends = singleAccountData.dividends;
    capitalGains = singleAccountData.capitalGains;

    priorDivDeposit = calculatePriorDivDeposits(accountPriorMonths);
    priorCapitalGains = calculatePriorCapitalGains(accountPriorMonths);
  } else {
    // Global summary - aggregate across all accounts
    const allAccountsThisMonth = await getAllAccountsThisMonth(sellDateStart, sellDateEnd);
    const allAccountsPriorMonths = await getAllAccountsPriorMonths(sellDateStart);

    const thisMonthData = aggregateAccountData(allAccountsThisMonth);
    deposits = thisMonthData.deposits;
    dividends = thisMonthData.dividends;
    capitalGains = thisMonthData.capitalGains;

    priorDivDeposit = calculatePriorDivDeposits(allAccountsPriorMonths);
    priorCapitalGains = calculatePriorCapitalGains(allAccountsPriorMonths);
  }

  return { deposits, dividends, capitalGains, priorDivDeposit, priorCapitalGains };
}

async function getAllAccountsThisMonth(sellDateStart: Date, sellDateEnd: Date): Promise<AccountWithTradesAndDeposits[]> {
  return prisma.accounts.findMany({
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

async function getAllAccountsPriorMonths(sellDateStart: Date): Promise<AccountWithTradesAndDeposits[]> {
  return prisma.accounts.findMany({
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



function handleSummaryRoute(fastify: FastifyInstance): void {
  fastify.get<{ Body: SummaryRequest, Reply: Summary }>('/',
    {
      schema: createSummarySchema(),
    },
    async function handleSummaryRequest(request, reply): Promise<void> {
      const { month, account_id } = request.query as SummaryRequest;

      const { year, monthNum } = parseMonthString(month);
      const { start: sellDateStart, end: sellDateEnd } = calculateDateRange(year, monthNum);

      const summaryData = await calculateSummaryData(account_id, sellDateStart, sellDateEnd);

      const result = await getRiskGroupData(year, monthNum);
      const riskGroupMap = createRiskGroupMap(result);

      const equitiesValue = riskGroupMap.get('Equities');
      const incomeValue = riskGroupMap.get('Income');
      const taxFreeIncomeValue = riskGroupMap.get('Tax Free Income');

      reply.send({
        deposits: summaryData.deposits + summaryData.priorDivDeposit + summaryData.priorCapitalGains,
        dividends: summaryData.dividends,
        capitalGains: summaryData.capitalGains,
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
