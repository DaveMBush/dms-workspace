import { FastifyInstance } from 'fastify';
import { prisma } from '../../prisma/prisma-client';
import { Settings } from './settings.interface';
import { RiskGroup } from './common/risk-group.interface';
import yahooFinance from 'yahoo-finance2';
import { getLastPrice } from './common/get-last-price.function';
import { getDistribution } from './common/get-distribution.function';
import { getDistributions } from './common/get-distributions.function';

yahooFinance.suppressNotices(['yahooSurvey']);

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
        const groupValues = [equities, income, taxFreeIncome];

        // Gather all symbols from all groups
        const allSymbols = groupValues
          .flatMap(value =>
            value
              ? value.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
              : []
          );

        await Promise.all(
          groupValues.map(async (value, index) => {
            if (!value || value.length === 0) {
              return;
            }
            const symbols = value
              .split(/\r?\n/)
              .map(s => s.trim())
              .filter(Boolean);

            await Promise.all(
              symbols.map(symbol => addOrUpdateSymbol(symbol, riskGroup[index].id))
            );
          })
        );

        // Mark all other symbols as expired, but only if not already expired
        await prisma.universe.updateMany({
          where: {
            symbol: {
              notIn: allSymbols,
            },
            expired: false,
          },
          data: {
            expired: true,
          },
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
  const distribution = await getDistributions(symbol);
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
    if (distribution === undefined) {
      return;
    }
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
