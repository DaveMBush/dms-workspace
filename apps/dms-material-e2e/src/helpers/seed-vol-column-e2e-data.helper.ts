import type { PrismaClient } from '@prisma/client';

import { generateUniqueId } from './generate-unique-id.helper';
import type { SeederResultBase } from './seeder-result-base.types';
import { initializePrismaClient } from './shared-prisma-client.helper';

const STEADY_AMOUNT = 1.0;
const MONTHS_TO_SEED = 12;

interface VolColumnSeederResult extends SeederResultBase {
  symbol: string;
}

async function getOrCreateRiskGroupId(prisma: PrismaClient): Promise<string> {
  const rg = await prisma.risk_group.upsert({
    where: { name: 'Equities' },
    update: {},
    create: { name: 'Equities' },
  });
  return rg.id;
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

function buildMonthlyDates(): Date[] {
  const dates: Date[] = [];
  const now = new Date();
  for (let monthOffset = MONTHS_TO_SEED - 1; monthOffset >= 0; monthOffset--) {
    const d = new Date(now);
    d.setDate(1);
    d.setMonth(d.getMonth() - monthOffset);
    dates.push(d);
  }
  return dates;
}

function buildUniverseCreateData(
  symbol: string,
  riskGroupId: string
): Record<string, unknown> {
  return {
    symbol,
    // eslint-disable-next-line @typescript-eslint/naming-convention -- database column name
    risk_group_id: riskGroupId,
    distribution: 1.0,
    // eslint-disable-next-line @typescript-eslint/naming-convention -- database column name
    distributions_per_year: 12,
    // eslint-disable-next-line @typescript-eslint/naming-convention -- database column name
    last_price: 10.0,
    // eslint-disable-next-line @typescript-eslint/naming-convention -- database column name
    ex_date: null,
    // eslint-disable-next-line @typescript-eslint/naming-convention -- database column name
    most_recent_sell_date: null,
    // eslint-disable-next-line @typescript-eslint/naming-convention -- database column name
    most_recent_sell_price: null,
    expired: false,
    // eslint-disable-next-line @typescript-eslint/naming-convention -- database column name
    is_closed_end_fund: true,
  };
}

async function cleanupOnError(
  prisma: PrismaClient,
  universeId: string,
  accountId: string
): Promise<void> {
  function suppressError(): undefined {
    return undefined;
  }
  if (universeId !== '') {
    await prisma.divDeposits
      .deleteMany({ where: { universeId } })
      .catch(suppressError);
    await prisma.universe
      .delete({ where: { id: universeId } })
      .catch(suppressError);
  }
  if (accountId !== '') {
    await prisma.accounts
      .delete({ where: { id: accountId } })
      .catch(suppressError);
  }
}

export async function seedVolColumnE2eData(): Promise<VolColumnSeederResult> {
  const prisma = await initializePrismaClient();
  const uniqueId = generateUniqueId();
  const symbol = `E2EVOL${uniqueId}`;
  const accountName = `E2E-VOL-Acct-${uniqueId}`;
  let universeId = '';
  let accountId = '';

  try {
    const riskGroupId = await getOrCreateRiskGroupId(prisma);
    const divDepositTypeId = await getOrCreateDivDepositTypeId(prisma);
    const universe = await prisma.universe.create({
      data: buildUniverseCreateData(symbol, riskGroupId),
    });
    universeId = universe.id;
    const account = await prisma.accounts.create({
      data: { name: accountName },
    });
    accountId = account.id;
    const dates = buildMonthlyDates();
    await prisma.divDeposits.createMany({
      data: dates.map(function buildDepositRecord(date: Date) {
        return {
          date,
          amount: STEADY_AMOUNT,
          accountId,
          divDepositTypeId,
          universeId,
        };
      }),
    });
  } catch (error) {
    await cleanupOnError(prisma, universeId, accountId);
    await prisma.$disconnect();
    throw error;
  }

  return {
    symbol,
    symbols: [symbol],
    cleanup: async function cleanupVolColumnData(): Promise<void> {
      try {
        await prisma.divDeposits.deleteMany({ where: { universeId } });
        await prisma.universe.deleteMany({ where: { symbol } });
        await prisma.accounts.deleteMany({ where: { name: accountName } });
      } finally {
        await prisma.$disconnect();
      }
    },
  };
}
