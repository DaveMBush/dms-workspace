import { FastifyInstance } from 'fastify';
import { prisma } from '../../prisma/prisma-client';
import { Settings } from './settings.interface';
import { RiskGroup } from './risk-group.interface';
import yahooFinance from 'yahoo-finance2';

yahooFinance.suppressNotices(['yahooSurvey']);

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function (fastify: FastifyInstance): Promise<void> {

  // Route to fetch accounts by IDs
  // Path: POST /api/accounts
  fastify.post<{ Body: Settings, Reply: void }>('/',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            equities: { type: 'string' },
            income: { type: 'string' },
            tax_free_income: { type: 'string' },
          },
        },
      },
    },
    async function (request, reply): Promise<void> {
      console.log('HANDLER: POST /api/settings');
      const { equities, income, taxFreeIncome } = request.body;

      const riskGroup: RiskGroup[] = [];
      const riskGroups = await prisma.risk_group.findMany();
      if (riskGroups.length === 0) {
        riskGroup[0] = await prisma.risk_group.create({
          data: {
            name: 'Equities'
          },
        });
        riskGroup[1] = await prisma.risk_group.create({
          data: {
            name: 'Income'
          },
        });
        riskGroup[2] = await prisma.risk_group.create({
          data: {
            name: 'Tax Free Income'
          },
        });
      } else {
        riskGroup[0] = riskGroups.find(riskGroup => riskGroup.name === 'Equities')!;
        riskGroup[1] = riskGroups.find(riskGroup => riskGroup.name === 'Income')!;
        riskGroup[2] = riskGroups.find(riskGroup => riskGroup.name === 'Tax Free Income')!;
      }
      try {
        [equities, income, taxFreeIncome]
          .forEach((value, index) => {
            if(!value || value.length === 0) {
              return;
            }
            const symbols = value
              .split(/\r?\n/)      // Split on both \n and \r\n
              .map(s => s.trim())  // Remove extra spaces from each line
              .filter(Boolean);
            symbols.forEach(async (symbol) => {
              addOrUpdateSymbol(symbol, riskGroup[index].id);
            });
          });
      } catch (error) {
        reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );
}

async function addOrUpdateSymbol(symbol: string, riskGroupId: string) {
  const universe = await prisma.universe.findFirst({
    where: {
      symbol: symbol,
    },
  });
  const lastPrice = await getLastPrice(symbol);
  const exDate = await getExDate(symbol);
  const distribution = await getDistribution(symbol, exDate);
  if (universe) {
    await prisma.universe.update({
      where: { id: universe.id },
      data: {
        risk_group_id: riskGroupId,
        distribution: distribution?.distribution,
        distributions_per_year: distribution?.distributions_per_year,
        last_price: lastPrice,
        most_recent_sell_date: null,
        ex_date: exDate,
        risk: 0,
        expired: false,
      },
    });
  } else {
    await prisma.universe.create({
      data: {
        symbol: symbol,
        risk_group_id: riskGroupId,
        distribution: distribution?.distribution,
        distributions_per_year: distribution?.distributions_per_year,
        last_price: lastPrice,
        most_recent_sell_date: null,
        ex_date: exDate,
        risk: 0,
        expired: false,
      },
    });
  }
}

async function getDistribution(symbol: string, exDate: Date, retryCount: number = 0) {
  try {
    if (retryCount > 0) {
      await sleep(1000);
    }
    const oneYearAgo = new Date(exDate.valueOf() - (365 * 24 * 60 * 60 * 1000));
    const oneDayFromNow = new Date(exDate.valueOf() + (24 * 60 * 60 * 1000));
    const result = await yahooFinance.chart(symbol, { period1: oneYearAgo, period2: oneDayFromNow, events: 'dividends' });
    const dividends = result.events?.dividends?.filter((r) => r);
    let currentDividend = dividends.find((d) => d.date == exDate);
    if (!currentDividend) {
      currentDividend = dividends[dividends.length - 1];
    }
    const previousMonth = new Date(currentDividend.date);
    previousMonth.setMonth(previousMonth.getMonth() - 1);
    const previousMonthDividends = dividends.filter((d) => d.date > previousMonth);
    const previousMonthDividend = previousMonthDividends[0];
    let perYear = 12;
    if (previousMonthDividend.date == currentDividend.date) {
      perYear = 4
    }
    return {
      distribution: currentDividend.amount,
      ex_date: currentDividend.date,
      distributions_per_year: perYear,
    };
  } catch (error) {
    if (retryCount < 3) {
      return getDistribution(symbol, exDate, retryCount + 1);
    }
    return null;
  }
}

async function getExDate(symbol: string, retryCount: number = 0) {
  try {
    if (retryCount > 0) {
      await sleep(1000);
    }
    const quote = await yahooFinance.quoteSummary(symbol, { modules: [ "calendarEvents" ] });
    return quote.calendarEvents.exDividendDate;
  } catch (error) {
    if (retryCount < 3) {
      return getExDate(symbol, retryCount + 1);
    }
    return null;
  }
}

async function getLastPrice(symbol: string, retryCount: number = 0) {
  // using yahoo-finance2 get:
  // - last price
  // - current ex-date
  // - current distribution
  // - distributions per year (is this monthly, quarterly, yearly?)
  try {
    if (retryCount > 0) {
      await sleep(1000);
    }
    const quote = await yahooFinance.quote(symbol);
    return quote.regularMarketPrice;
  } catch (error) {
    if (retryCount < 3) {
      return getLastPrice(symbol, retryCount + 1);
    }
    return null;
  }
}
