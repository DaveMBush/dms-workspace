import type { Prisma, PrismaClient } from '@prisma/client';

import { generateUniqueId } from './generate-unique-id.helper';
import type { SeederResultBase } from './seeder-result-base.types';
import { initializePrismaClient } from './shared-prisma-client.helper';

const DISTRIBUTIONS_PER_YEAR = 12;
const LAST_PRICE = 10.0;
const FLAT_AMOUNTS = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
const UP_THEN_DOWN_AMOUNTS = [1, 2, 3, 4, 5, 6, 6, 5, 4, 3, 2, 1];
const DOWN_THEN_UP_AMOUNTS = [6, 5, 4, 3, 2, 1, 1, 2, 3, 4, 5, 6];

interface VolatilityNewCategoriesSeederResult extends SeederResultBase {
  flatSymbol: string;
  upThenDownSymbol: string;
  downThenUpSymbol: string;
}

interface SeedCategoryPlan {
  symbol: string;
  amounts: number[];
}

interface SeedCategoryContext {
  prisma: PrismaClient;
  riskGroupId: string;
  accountId: string;
  divDepositTypeId: string;
  universeIds: string[];
}

interface SeedRuntimeData {
  accountName: string;
  seedPlans: SeedCategoryPlan[];
  universeIds: string[];
}

async function getOrCreateRiskGroupId(prisma: PrismaClient): Promise<string> {
  const riskGroup = await prisma.risk_group.upsert({
    where: { name: 'Equities' },
    update: {},
    create: { name: 'Equities' },
  });
  return riskGroup.id;
}

async function getOrCreateDivDepositTypeId(
  prisma: PrismaClient
): Promise<string> {
  const existing = await prisma.divDepositType.findFirst({
    where: { name: 'Dividend' },
  });
  if (existing !== null) {
    return existing.id;
  }

  const created = await prisma.divDepositType.create({
    data: { name: 'Dividend' },
  });
  return created.id;
}

function buildMonthlyDates(totalMonths: number): Date[] {
  const dates: Date[] = [];
  const now = new Date();

  for (let monthOffset = totalMonths - 1; monthOffset >= 0; monthOffset--) {
    const date = new Date(now);
    date.setDate(1);
    date.setMonth(date.getMonth() - monthOffset);
    dates.push(date);
  }

  return dates;
}

function buildUniverseCreateData(
  symbol: string,
  riskGroupId: string,
  currentDistribution: number
): Prisma.universeUncheckedCreateInput {
  return {
    symbol,
    risk_group_id: riskGroupId,
    distribution: currentDistribution,
    distributions_per_year: DISTRIBUTIONS_PER_YEAR,
    last_price: LAST_PRICE,
    ex_date: null,
    most_recent_sell_date: null,
    most_recent_sell_price: null,
    expired: false,
    is_closed_end_fund: true,
  };
}

function buildSeedPlans(uniqueId: string): SeedCategoryPlan[] {
  return [
    {
      symbol: `E2EFLT${uniqueId}`,
      amounts: FLAT_AMOUNTS,
    },
    {
      symbol: `E2EUTD${uniqueId}`,
      amounts: UP_THEN_DOWN_AMOUNTS,
    },
    {
      symbol: `E2EDTU${uniqueId}`,
      amounts: DOWN_THEN_UP_AMOUNTS,
    },
  ];
}

function extractSymbols(seedPlans: SeedCategoryPlan[]): string[] {
  return seedPlans.map(function extractSymbol(plan: SeedCategoryPlan) {
    return plan.symbol;
  });
}

function createSeedRuntimeData(): SeedRuntimeData {
  const uniqueId = generateUniqueId();

  return {
    accountName: `E2E-VOL-CATS-${uniqueId}`,
    seedPlans: buildSeedPlans(uniqueId),
    universeIds: [],
  };
}

async function seedUniverseCategory(
  context: SeedCategoryContext,
  plan: SeedCategoryPlan
): Promise<void> {
  const universe = await context.prisma.universe.create({
    data: buildUniverseCreateData(
      plan.symbol,
      context.riskGroupId,
      plan.amounts[plan.amounts.length - 1]
    ),
  });

  context.universeIds.push(universe.id);

  const dates = buildMonthlyDates(plan.amounts.length);
  await context.prisma.divDeposits.createMany({
    data: dates.map(function buildDepositRecord(date: Date, index: number) {
      return {
        date,
        amount: plan.amounts[index],
        accountId: context.accountId,
        divDepositTypeId: context.divDepositTypeId,
        universeId: universe.id,
      };
    }),
  });
}

async function createSeedCategoryContext(
  prisma: PrismaClient,
  accountName: string,
  universeIds: string[]
): Promise<SeedCategoryContext> {
  const riskGroupId = await getOrCreateRiskGroupId(prisma);
  const divDepositTypeId = await getOrCreateDivDepositTypeId(prisma);
  const account = await prisma.accounts.create({
    data: { name: accountName },
  });

  return {
    prisma,
    riskGroupId,
    accountId: account.id,
    divDepositTypeId,
    universeIds,
  };
}

async function seedAllCategories(
  context: SeedCategoryContext,
  seedPlans: SeedCategoryPlan[]
): Promise<void> {
  for (const plan of seedPlans) {
    await seedUniverseCategory(context, plan);
  }
}

async function cleanupOnError(
  prisma: PrismaClient,
  universeIds: string[],
  symbols: string[],
  accountName: string
): Promise<void> {
  function suppressError(): undefined {
    return undefined;
  }

  if (universeIds.length > 0) {
    await prisma.divDeposits
      .deleteMany({ where: { universeId: { in: universeIds } } })
      .catch(suppressError);
  }

  if (symbols.length > 0) {
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
  return async function cleanupVolatilityNewCategoriesData(): Promise<void> {
    try {
      await prisma.divDeposits.deleteMany({
        where: { universeId: { in: universeIds } },
      });
      await prisma.universe.deleteMany({
        where: {
          symbol: {
            in: symbols,
          },
        },
      });
      await prisma.accounts.deleteMany({ where: { name: accountName } });
    } finally {
      await prisma.$disconnect();
    }
  };
}

export async function seedVolatilityNewCategoriesData(): Promise<VolatilityNewCategoriesSeederResult> {
  const prisma = await initializePrismaClient();
  const runtimeData = createSeedRuntimeData();
  const symbols = extractSymbols(runtimeData.seedPlans);

  try {
    const context = await createSeedCategoryContext(
      prisma,
      runtimeData.accountName,
      runtimeData.universeIds
    );
    await seedAllCategories(context, runtimeData.seedPlans);
  } catch (error) {
    await cleanupOnError(
      prisma,
      runtimeData.universeIds,
      symbols,
      runtimeData.accountName
    );
    await prisma.$disconnect();
    throw error;
  }

  return {
    flatSymbol: runtimeData.seedPlans[0].symbol,
    upThenDownSymbol: runtimeData.seedPlans[1].symbol,
    downThenUpSymbol: runtimeData.seedPlans[2].symbol,
    symbols,
    cleanup: buildCleanup(
      prisma,
      runtimeData.universeIds,
      symbols,
      runtimeData.accountName
    ),
  };
}
