import { FastifyInstance } from 'fastify';

import { prisma } from '../../prisma/prisma-client';
import { ensureRiskGroupsExist } from './common/ensure-risk-groups-exist.function';
import { getDistributions } from './common/get-distributions.function';
import { getLastPrice } from './common/get-last-price.function';
import { Settings } from './settings.interface';

type PrismaRiskGroup = Awaited<
  ReturnType<typeof prisma.risk_group.findMany>
>[number];
type PrismaUniverse = Awaited<ReturnType<typeof prisma.universe.findFirst>>;

interface Distribution {
  distribution: number;
  distributions_per_year: number;
  ex_date: Date;
}

function parseSymbols(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map(function trimSymbol(s) {
      return s.trim();
    })
    .filter(function filterEmpty(v) {
      return v;
    });
}

function getAllSymbols(groupValues: string[]): string[] {
  return groupValues.flatMap(function processValue(groupValue) {
    if (!groupValue) {
      return [];
    }
    return parseSymbols(groupValue);
  });
}

async function processSymbolGroup(
  symbols: string[],
  riskGroupId: string
): Promise<void> {
  for (const symbol of symbols) {
    await addOrUpdateSymbol(symbol, riskGroupId);
  }
}

async function processAllSymbolGroups(
  groupValues: string[],
  riskGroups: PrismaRiskGroup[]
): Promise<void> {
  for (let index = 0; index < groupValues.length; index++) {
    const groupValue = groupValues[index];
    if (!groupValue || groupValue.length === 0) {
      continue;
    }
    const symbols = parseSymbols(groupValue);
    await processSymbolGroup(symbols, riskGroups[index].id);
  }
}

async function markExpiredSymbols(allSymbols: string[]): Promise<void> {
  await prisma.universe.updateMany({
    where: {
      symbol: {
        notIn: allSymbols,
      },
      expired: false,
      is_closed_end_fund: true,
    },
    data: {
      expired: true,
    },
  });
}

function shouldSetExDate(
  distribution: Distribution | undefined,
  today: Date
): boolean {
  return Boolean(
    distribution?.ex_date &&
      distribution.ex_date instanceof Date &&
      !isNaN(distribution.ex_date.valueOf()) &&
      distribution.ex_date > today
  );
}

function getExDateToSet(
  distribution: Distribution | undefined,
  today: Date
): Date | undefined {
  if (shouldSetExDate(distribution, today)) {
    return distribution!.ex_date;
  }
  return undefined;
}

interface UpdateUniverseData {
  universe: PrismaUniverse;
  riskGroupId: string;
  lastPrice: number | null | undefined;
  distribution: Distribution | undefined;
  exDateToSet: Date | undefined;
}

async function updateExistingUniverse(data: UpdateUniverseData): Promise<void> {
  if (data.distribution === undefined || !data.universe) {
    return;
  }
  await prisma.universe.update({
    where: { id: data.universe.id },
    data: {
      risk_group_id: data.riskGroupId,
      distribution: data.distribution.distribution,
      distributions_per_year: data.distribution.distributions_per_year,
      last_price: data.lastPrice ?? 0,
      most_recent_sell_date: null,
      ex_date: data.exDateToSet,
      expired: false,
    },
  });
}

async function createNewUniverse(
  symbol: string,
  riskGroupId: string,
  lastPrice: number | null | undefined,
  distribution: Distribution | undefined
): Promise<void> {
  const { createUniverseRecord } = await import(
    '../common/universe-operations.function'
  );
  await createUniverseRecord({ symbol, riskGroupId, lastPrice, distribution });
}

async function addOrUpdateSymbol(
  symbol: string,
  riskGroupId: string
): Promise<void> {
  const universe = await prisma.universe.findFirst({
    where: { symbol },
  });

  const lastPrice = await getLastPrice(symbol);
  const distribution = await getDistributions(symbol);
  const today = new Date();
  const exDateToSet = getExDateToSet(distribution, today);

  if (universe) {
    await updateExistingUniverse({
      universe,
      riskGroupId,
      lastPrice,
      distribution,
      exDateToSet,
    });
  } else {
    await createNewUniverse(symbol, riskGroupId, lastPrice, distribution);
  }
}

async function handleSettingsRequest(
  request: { body: Settings },
  reply: { status(code: number): { send(data: { error: string }): void } }
): Promise<void> {
  const { equities, income, taxFreeIncome } = request.body;

  const riskGroups = await ensureRiskGroupsExist();
  const groupValues = [equities, income, taxFreeIncome];
  const allSymbols = getAllSymbols(groupValues);

  try {
    await processAllSymbolGroups(groupValues, riskGroups);
    await markExpiredSymbols(allSymbols);
  } catch {
    reply.status(500).send({ error: 'Internal server error' });
  }
}

function handleSettingsRoute(fastify: FastifyInstance): void {
  fastify.post<{ Body: Settings }>(
    '/',
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
    handleSettingsRequest
  );
}

export default function registerSettingsRoutes(fastify: FastifyInstance): void {
  handleSettingsRoute(fastify);
}
