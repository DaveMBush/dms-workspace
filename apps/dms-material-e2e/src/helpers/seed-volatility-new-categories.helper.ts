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

async function seedUniverseCategory(
  prisma: PrismaClient,
  plan: SeedCategoryPlan,
  riskGroupId: string,
  accountId: string,
  divDepositTypeId: string,
  universeIds: string[]
): Promise<void> {
  const universe = await prisma.universe.create({
    data: buildUniverseCreateData(
      plan.symbol,
      riskGroupId,
      plan.amounts[plan.amounts.length - 1]
    ),
  });

  universeIds.push(universe.id);

  const dates = buildMonthlyDates(plan.amounts.length);
  await prisma.divDeposits.createMany({
    data: dates.map(function buildDepositRecord(date: Date, index: number) {
      return {
        date,
        amount: plan.amounts[index],
        accountId,
        divDepositTypeId,
        universeId: universe.id,
      };
    }),
  });
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

export async function seedVolatilityNewCategoriesData(): Promise<VolatilityNewCategoriesSeederResult> {
  const prisma = await initializePrismaClient();
  const uniqueId = generateUniqueId();
  const seedPlans = buildSeedPlans(uniqueId);
  const accountName = `E2E-VOL-CATS-${uniqueId}`;
  const universeIds: string[] = [];

  try {
    const riskGroupId = await getOrCreateRiskGroupId(prisma);
    const divDepositTypeId = await getOrCreateDivDepositTypeId(prisma);
    const account = await prisma.accounts.create({
      data: { name: accountName },
    });

    for (const plan of seedPlans) {
      await seedUniverseCategory(
        prisma,
        plan,
        riskGroupId,
        account.id,
        divDepositTypeId,
        universeIds
      );
    }
  } catch (error) {
    await cleanupOnError(
      prisma,
      universeIds,
      seedPlans.map(function extractSymbol(plan: SeedCategoryPlan) {
        return plan.symbol;
      }),
      accountName
    );
    await prisma.$disconnect();
    throw error;
  }

  return {
    flatSymbol: seedPlans[0].symbol,
    upThenDownSymbol: seedPlans[1].symbol,
    downThenUpSymbol: seedPlans[2].symbol,
    symbols: seedPlans.map(function extractSymbol(plan: SeedCategoryPlan) {
      return plan.symbol;
    }),
    cleanup:
      async function cleanupVolatilityNewCategoriesData(): Promise<void> {
        try {
          await prisma.divDeposits.deleteMany({
            where: { universeId: { in: universeIds } },
          });
          await prisma.universe.deleteMany({
            where: {
              symbol: {
                in: seedPlans.map(function extractSymbol(
                  plan: SeedCategoryPlan
                ) {
                  return plan.symbol;
                }),
              },
            },
          });
          await prisma.accounts.deleteMany({ where: { name: accountName } });
        } finally {
          await prisma.$disconnect();
        }
      },
  };
}
