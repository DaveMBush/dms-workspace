import { FastifyInstance } from 'fastify';

import { prisma } from '../../prisma/prisma-client';
import { createAccountQuery } from '../common/query-utils.function';
import { aggregateAccountData } from './aggregate-account-data.function';
import { calculateDateRange } from './calculate-date-range.function';
import { calculatePriorCapitalGains } from './calculate-prior-capital-gains.function';
import { calculatePriorDivDeposits } from './calculate-prior-div-deposits.function';
import { createRiskGroupMap } from './create-risk-group-map.function';
import { getRiskGroupData } from './get-risk-group-data.function';
import { parseMonthString } from './parse-month-string.function';
import { Summary } from './summary.interface';
import { SummaryRequest } from './summary-request.interface';

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

async function getAccountsThisMonth(
  sellDateStart: Date,
  sellDateEnd: Date,
  accountId?: string
): Promise<AccountWithTradesAndDeposits[]> {
  if (accountId !== undefined) {
    const account = await prisma.accounts.findUnique({
      where: { id: accountId },
      ...createAccountQuery(sellDateStart, sellDateEnd),
    });
    if (!account) {
      throw new Error('Account not found');
    }
    return [account];
  }
  return prisma.accounts.findMany(
    createAccountQuery(sellDateStart, sellDateEnd)
  );
}

async function getAccountsPriorMonths(
  sellDateStart: Date,
  accountId?: string
): Promise<AccountWithTradesAndDeposits[]> {
  const where = accountId !== undefined ? { id: accountId } : undefined;
  return prisma.accounts.findMany({
    ...(where !== undefined ? { where } : {}),
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
  const thisMonth = await getAccountsThisMonth(
    sellDateStart,
    sellDateEnd,
    accountId
  );
  const priorMonths = await getAccountsPriorMonths(sellDateStart, accountId);

  const thisMonthData = aggregateAccountData(thisMonth);
  const priorDivDeposit = calculatePriorDivDeposits(priorMonths);
  const priorCapitalGains = calculatePriorCapitalGains(priorMonths);

  return {
    deposits: thisMonthData.deposits,
    dividends: thisMonthData.dividends,
    capitalGains: thisMonthData.capitalGains,
    priorDivDeposit,
    priorCapitalGains,
  };
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
