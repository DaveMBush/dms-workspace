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
  const distribution = await getDistribution(symbol);
  const today = new Date();
  let exDateToSet = undefined;
  if (
    distribution?.ex_date &&
    distribution.ex_date instanceof Date &&
    !isNaN(distribution.ex_date.valueOf()) &&
    distribution.ex_date > today
  ) {
    exDateToSet = distribution?.ex_date;
  }
  if (universe) {
    await prisma.universe.update({
      where: { id: universe.id },
      data: {
        risk_group_id: riskGroupId,
        distribution: distribution?.distribution,
        distributions_per_year: distribution?.distributions_per_year,
        last_price: lastPrice,
        most_recent_sell_date: null,
        ex_date: exDateToSet,
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
        ex_date: distribution.ex_date,
        risk: 0,
        expired: false,
      },
    });
  }
}

async function getDistribution(symbol: string, retryCount: number = 0) {
  try {
    if (retryCount > 0) {
      await sleep(1000);
    }
    let exDate = new Date();
    const oneYearAgo = new Date(exDate.valueOf() - (365 * 24 * 60 * 60 * 1000));
    const oneMonthFromNow = new Date(exDate.valueOf() + (31 * 24 * 60 * 60 * 1000));
    const result = await yahooFinance.chart(symbol, {
      period1: oneYearAgo.toISOString().slice(0, 10),
      period2: oneMonthFromNow.toISOString().slice(0, 10),
      events: 'dividends'
    });
    const dividends = result.events?.dividends?.filter((r) => r).map((r) => ({date: new Date(Number(r.date) * 1000), amount: r.amount}));
    let currentDividend = dividends.find((d) => d.date.valueOf() >= Date.now().valueOf());
    if (!currentDividend) {
      currentDividend = dividends[dividends.length - 1];
    }
    const currentIndex = dividends.findIndex((d) => d.date.valueOf() === currentDividend.date.valueOf());
    const previousIndex = currentIndex - 1;
    let perYear = 1;
    if (previousIndex >= 0) {
      perYear = 12;
      const previousDividend = dividends[previousIndex];
      const previousMonth = previousDividend.date.getMonth();
      const currentMonth = currentDividend.date.getMonth();
      if (previousMonth < currentMonth - 1) {
        perYear = 4
      }
    }
    return {
      distribution: currentDividend.amount,
      ex_date: currentDividend.date,
      distributions_per_year: perYear,
    };
  } catch (error) {
    if (retryCount < 3) {
      return getDistribution(symbol, retryCount + 1);
    }
    return null;
  }
}

async function getLastPrice(symbol: string, retryCount: number = 0) {
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
