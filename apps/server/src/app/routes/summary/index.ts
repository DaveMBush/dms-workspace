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

async function getAvailableMonths(): Promise<Array<{ month: string; label: string }>> {
  // Get all divDeposits with dates
  const divDeposits = await prisma.divDeposits.findMany({
    where: { date: { not: undefined } },
    select: { date: true }
  });

  // Get all trades with sell dates
  const trades = await prisma.trades.findMany({
    where: { sell_date: { not: null } },
    select: { sell_date: true }
  });

  // Extract months from divDeposits
  const divDepositMonths = new Set<string>();
  divDeposits.forEach(function extractDivDepositMonth(deposit) {
    const d = new Date(deposit.date);
    const monthStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    divDepositMonths.add(monthStr);
  });

  // Extract months from trades
  const tradeMonths = new Set<string>();
  trades.forEach(function extractTradeMonth(trade) {
    const d = new Date(trade.sell_date!);
    const monthStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    tradeMonths.add(monthStr);
  });

  // Combine and sort months
  const allMonths = [...divDepositMonths, ...tradeMonths];
  const uniqueMonths = [...new Set(allMonths)];
  const sortedMonths = uniqueMonths.toSorted(function sortMonthsDescending(a, b) {
    return b.localeCompare(a);
  });

  // Format for response
  return sortedMonths.map(function formatMonth(monthStr) {
    const [year, month] = monthStr.split('-');
    return {
      month: monthStr,
      label: `${month}/${year}`
    };
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

      let deposits: number;
      let dividends: number;
      let capitalGains: number;
      let priorDivDeposit: number;
      let priorCapitalGains: number;

      if (account_id) {
        // Single account summary
        const accountThisMonth = await getAccountThisMonth(account_id, sellDateStart, sellDateEnd);
        if (!accountThisMonth) {
          throw new Error('Account not found');
        }

        const accountPriorMonths = await getAccountPriorMonths(account_id, sellDateStart);

        deposits = calculateDeposits(accountThisMonth.divDeposits);
        dividends = calculateDividends(accountThisMonth.divDeposits);
        capitalGains = calculateCapitalGains(accountThisMonth.trades);

        priorDivDeposit = calculatePriorDivDeposits(accountPriorMonths);
        priorCapitalGains = calculatePriorCapitalGains(accountPriorMonths);
      } else {
        // Global summary - aggregate across all accounts
        const allAccountsThisMonth = await getAllAccountsThisMonth(sellDateStart, sellDateEnd);
        const allAccountsPriorMonths = await getAllAccountsPriorMonths(sellDateStart);

        deposits = allAccountsThisMonth.reduce((acc, account) => acc + calculateDeposits(account.divDeposits), 0);
        dividends = allAccountsThisMonth.reduce((acc, account) => acc + calculateDividends(account.divDeposits), 0);
        capitalGains = allAccountsThisMonth.reduce((acc, account) => acc + calculateCapitalGains(account.trades), 0);

        priorDivDeposit = calculatePriorDivDeposits(allAccountsPriorMonths);
        priorCapitalGains = calculatePriorCapitalGains(allAccountsPriorMonths);
      }

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

function handleAvailableMonthsRoute(fastify: FastifyInstance): void {
  fastify.get('/months',
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

export default function registerSummaryRoutes(fastify: FastifyInstance): void {
  handleSummaryRoute(fastify);
  handleAvailableMonthsRoute(fastify);
}
