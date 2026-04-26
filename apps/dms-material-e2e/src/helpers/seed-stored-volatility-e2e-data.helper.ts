import { buildMonthlyDates } from './build-monthly-dates.helper';
import { generateUniqueId } from './generate-unique-id.helper';
import { getOrCreateDivDepositTypeId } from './get-or-create-div-deposit-type-id.helper';
import { getOrCreateRiskGroupId } from './get-or-create-risk-group-id.helper';
import type { SeederResultBase } from './seeder-result-base.types';
import { initializePrismaClient } from './shared-prisma-client.helper';

const DISTRIBUTIONS_PER_YEAR = 12;
const LAST_PRICE = 10.0;

// Steady: oscillating ~5% around mean → CV ≈ 5% (between 2% and 10% thresholds)
const STEADY_AMOUNTS = [
  0.95, 1.05, 0.95, 1.05, 0.95, 1.05, 0.95, 1.05, 0.95, 1.05, 0.95, 1.05,
];

// Increasing: linear ramp → positive normalised slope > 0.001 threshold
const INCREASING_AMOUNTS = [
  0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6,
];

// Volatile: alternating high/low → CV >> 10%, no clear trend, no reversal
const VOLATILE_AMOUNTS = [
  0.5, 2.0, 0.3, 1.8, 0.4, 2.1, 0.6, 1.9, 0.5, 2.0, 0.4, 1.8,
];

interface StoredVolatilitySeederResult extends SeederResultBase {
  steadySymbol: string;
  increasingSymbol: string;
  volatileSymbol: string;
}

interface SeedPlan {
  symbol: string;
  amounts: number[];
  volatilityLong: string;
}

interface SeedContext {
  prisma: PrismaClient;
  riskGroupId: string;
  accountId: string;
  divDepositTypeId: string;
}

async function seedOnePlan(
  ctx: SeedContext,
  plan: SeedPlan,
  universeIds: string[]
): Promise<void> {
  const currentDist = plan.amounts[plan.amounts.length - 1];
  const universe = await ctx.prisma.universe.create({
    data: {
      symbol: plan.symbol,
      risk_group_id: ctx.riskGroupId,
      distribution: currentDist,
      distributions_per_year: DISTRIBUTIONS_PER_YEAR,
      last_price: LAST_PRICE,
      ex_date: null,
      most_recent_sell_date: null,
      most_recent_sell_price: null,
      expired: false,
      is_closed_end_fund: true,
      volatility_long: plan.volatilityLong,
      volatility_short: plan.volatilityLong,
    },
  });
  universeIds.push(universe.id);
  const dates = buildMonthlyDates(plan.amounts.length);
  await ctx.prisma.divDeposits.createMany({
    data: dates.map(function buildDeposit(date: Date, i: number) {
      return {
        date,
        amount: plan.amounts[i],
        accountId: ctx.accountId,
        divDepositTypeId: ctx.divDepositTypeId,
        universeId: universe.id,
      };
    }),
  });
}

function buildSeedPlans(uniqueId: string): SeedPlan[] {
  return [
    {
      symbol: `E2ESVST${uniqueId}`,
      amounts: STEADY_AMOUNTS,
      volatilityLong: 'steady',
    },
    {
      symbol: `E2ESVIC${uniqueId}`,
      amounts: INCREASING_AMOUNTS,
      volatilityLong: 'increasing',
    },
    {
      symbol: `E2ESVVL${uniqueId}`,
      amounts: VOLATILE_AMOUNTS,
      volatilityLong: 'volatile',
    },
  ];
}

function suppressError(): undefined {
  return undefined;
}

async function cleanupOnError(
  prisma: PrismaClient,
  universeIds: string[],
  symbols: string[],
  accountName: string
): Promise<void> {
  if (universeIds.length > 0) {
    await prisma.divDeposits
      .deleteMany({ where: { universeId: { in: universeIds } } })
      .catch(suppressError);
    await prisma.universe
      .deleteMany({ where: { symbol: { in: symbols } } })
      .catch(suppressError);
  }
  await prisma.accounts
    .deleteMany({ where: { name: accountName } })
    .catch(suppressError);
}

function buildCleanup(
  prisma: PrismaClient,
  universeIds: string[],
  symbols: string[],
  accountName: string
): () => Promise<void> {
  return async function cleanupStoredVolatilityData(): Promise<void> {
    try {
      await prisma.divDeposits.deleteMany({
        where: { universeId: { in: universeIds } },
      });
      await prisma.universe.deleteMany({ where: { symbol: { in: symbols } } });
      await prisma.accounts.deleteMany({ where: { name: accountName } });
    } finally {
      await prisma.$disconnect();
    }
  };
}

async function seedAllPlans(
  ctx: SeedContext,
  plans: SeedPlan[],
  universeIds: string[]
): Promise<void> {
  for (const plan of plans) {
    await seedOnePlan(ctx, plan, universeIds);
  }
}

/**
 * Seeds three universe symbols each with 12 months of div-deposit history
 * and a pre-stored volatility_long value (steady / increasing / volatile).
 */
export async function seedStoredVolatilityData(): Promise<StoredVolatilitySeederResult> {
  const prisma = await initializePrismaClient();
  const uniqueId = generateUniqueId();
  const accountName = `E2E-SV-${uniqueId}`;
  const plans = buildSeedPlans(uniqueId);
  const symbols = plans.map(function toSymbol(p: SeedPlan) {
    return p.symbol;
  });
  const universeIds: string[] = [];

  try {
    const riskGroupId = await getOrCreateRiskGroupId(prisma);
    const divDepositTypeId = await getOrCreateDivDepositTypeId(prisma);
    const acct = await prisma.accounts.create({ data: { name: accountName } });
    await seedAllPlans(
      { prisma, riskGroupId, accountId: acct.id, divDepositTypeId },
      plans,
      universeIds
    );
  } catch (error) {
    await cleanupOnError(prisma, universeIds, symbols, accountName);
    await prisma.$disconnect();
    throw error;
  }

  return {
    steadySymbol: plans[0].symbol,
    increasingSymbol: plans[1].symbol,
    volatileSymbol: plans[2].symbol,
    symbols,
    cleanup: buildCleanup(prisma, universeIds, symbols, accountName),
  };
}
