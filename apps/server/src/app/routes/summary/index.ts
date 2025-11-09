import { Prisma } from '@prisma/client';
import { FastifyInstance } from 'fastify';

import { prisma } from '../../prisma/prisma-client';
import { createAccountQuery } from '../common/query-utils.function';
import { aggregateAccountData } from './aggregate-account-data.function';
import { calculateDateRange } from './calculate-date-range.function';
import { calculatePriorCapitalGains } from './calculate-prior-capital-gains.function';
import { calculatePriorDivDeposits } from './calculate-prior-div-deposits.function';
import { createRiskGroupMap } from './create-risk-group-map.function';
import { parseMonthString } from './parse-month-string.function';
import { Summary } from './summary.interface';
import { SummaryRequest } from './summary-request.interface';

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

async function getAccountThisMonth(
  accountId: string,
  sellDateStart: Date,
  sellDateEnd: Date
): Promise<AccountWithTradesAndDeposits | null> {
  return prisma.accounts.findUnique({
    where: { id: accountId },
    ...createAccountQuery(sellDateStart, sellDateEnd),
  });
}

async function getAccountPriorMonths(
  accountId: string,
  sellDateStart: Date
): Promise<AccountWithTradesAndDeposits[]> {
  return prisma.accounts.findMany({
    where: {
      id: accountId,
    },
    include: {
      trades: {
        where: {
          sell_date: {
            lt: sellDateStart,
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

interface RawRiskGroupResult {
  riskGroupId?: string;
  riskGroupName?: string;
  totalCostBasis?: number | string;
  tradeCount?: number | string;
}

async function getRiskGroupData(
  year: number,
  monthNum: number,
  accountId?: string
): Promise<RiskGroupResult[]> {
  const rawResults = await prisma.$queryRaw<RawRiskGroupResult[]>`
    SELECT
      rg.id as riskGroupId,
      rg.name as riskGroupName,
      SUM(t.buy * t.quantity) as totalCostBasis,
      COUNT(t.id) as tradeCount
    FROM trades t
    JOIN universe u ON t."universeId" = u.id
    JOIN risk_group rg ON u.risk_group_id = rg.id
    WHERE (t.sell_date IS NULL OR
          (t.sell_date >= ${new Date(year, monthNum - 1, 1)} AND
            t.sell_date < ${new Date(year, monthNum, 0)}))
      ${
        accountId! ? Prisma.sql`AND t."accountId" = ${accountId}` : Prisma.empty
      }
    GROUP BY rg.id, rg.name
  `;

  // Convert PostgreSQL string results to numbers and handle column name differences
  function transformRiskGroupResult(row: RawRiskGroupResult): RiskGroupResult {
    return {
      riskGroupId: row.riskGroupId ?? row.riskGroupId ?? '',
      riskGroupName: row.riskGroupName ?? row.riskGroupName ?? '',
      totalCostBasis: Number(row.totalCostBasis ?? row.totalCostBasis ?? 0),
      tradeCount: Number(row.tradeCount ?? row.tradeCount ?? 0),
    };
  }

  return rawResults.map(transformRiskGroupResult);
}

async function calculateSingleAccountSummaryData(
  accountId: string,
  sellDateStart: Date,
  sellDateEnd: Date
): Promise<{
  deposits: number;
  dividends: number;
  capitalGains: number;
  priorDivDeposit: number;
  priorCapitalGains: number;
}> {
  const accountThisMonth = await getAccountThisMonth(
    accountId,
    sellDateStart,
    sellDateEnd
  );
  if (!accountThisMonth) {
    throw new Error('Account not found');
  }

  const accountPriorMonths = await getAccountPriorMonths(
    accountId,
    sellDateStart
  );

  const singleAccountData = aggregateAccountData([accountThisMonth]);
  const priorDivDeposit = calculatePriorDivDeposits(accountPriorMonths);
  const priorCapitalGains = calculatePriorCapitalGains(accountPriorMonths);

  return {
    deposits: singleAccountData.deposits,
    dividends: singleAccountData.dividends,
    capitalGains: singleAccountData.capitalGains,
    priorDivDeposit,
    priorCapitalGains,
  };
}

async function calculateGlobalSummaryData(
  sellDateStart: Date,
  sellDateEnd: Date
): Promise<{
  deposits: number;
  dividends: number;
  capitalGains: number;
  priorDivDeposit: number;
  priorCapitalGains: number;
}> {
  const allAccountsThisMonth = await getAllAccountsThisMonth(
    sellDateStart,
    sellDateEnd
  );
  const allAccountsPriorMonths = await getAllAccountsPriorMonths(sellDateStart);

  const thisMonthData = aggregateAccountData(allAccountsThisMonth);
  const priorDivDeposit = calculatePriorDivDeposits(allAccountsPriorMonths);
  const priorCapitalGains = calculatePriorCapitalGains(allAccountsPriorMonths);

  return {
    deposits: thisMonthData.deposits,
    dividends: thisMonthData.dividends,
    capitalGains: thisMonthData.capitalGains,
    priorDivDeposit,
    priorCapitalGains,
  };
}

async function calculateSummaryData(
  accountId: string | undefined,
  sellDateStart: Date,
  sellDateEnd: Date
): Promise<{
  deposits: number;
  dividends: number;
  capitalGains: number;
  priorDivDeposit: number;
  priorCapitalGains: number;
}> {
  if (accountId !== undefined) {
    return calculateSingleAccountSummaryData(
      accountId,
      sellDateStart,
      sellDateEnd
    );
  }
  return calculateGlobalSummaryData(sellDateStart, sellDateEnd);
}

async function getAllAccountsThisMonth(
  sellDateStart: Date,
  sellDateEnd: Date
): Promise<AccountWithTradesAndDeposits[]> {
  return prisma.accounts.findMany(
    createAccountQuery(sellDateStart, sellDateEnd)
  );
}

async function getAllAccountsPriorMonths(
  sellDateStart: Date
): Promise<AccountWithTradesAndDeposits[]> {
  return prisma.accounts.findMany({
    include: {
      trades: {
        where: {
          sell_date: {
            lt: sellDateStart,
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
  fastify.get<{ Body: SummaryRequest; Reply: Summary }>(
    '/',
    {
      schema: createSummarySchema(),
    },
    async function handleSummaryRequest(request, reply): Promise<void> {
      const { month, account_id } = request.query as SummaryRequest;

      const { year, monthNum } = parseMonthString(month);
      const { start: sellDateStart, end: sellDateEnd } = calculateDateRange(
        year,
        monthNum
      );

      const summaryData = await calculateSummaryData(
        account_id,
        sellDateStart,
        sellDateEnd
      );

      const result = await getRiskGroupData(year, monthNum, account_id);
      const riskGroupMap = createRiskGroupMap(result);

      const equitiesValue = riskGroupMap.get('Equities');
      const incomeValue = riskGroupMap.get('Income');
      const taxFreeIncomeValue = riskGroupMap.get('Tax Free Income');

      reply.send({
        deposits:
          summaryData.deposits +
          summaryData.priorDivDeposit +
          summaryData.priorCapitalGains,
        dividends: summaryData.dividends,
        capitalGains: summaryData.capitalGains,
        equities: equitiesValue !== undefined ? equitiesValue : 0,
        income: incomeValue !== undefined ? incomeValue : 0,
        tax_free_income:
          taxFreeIncomeValue !== undefined ? taxFreeIncomeValue : 0,
      });
    }
  );
}

export default function registerSummaryRoutes(fastify: FastifyInstance): void {
  handleSummaryRoute(fastify);
}
