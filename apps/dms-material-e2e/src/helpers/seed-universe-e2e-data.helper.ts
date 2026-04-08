import type { PrismaClient } from '@prisma/client';

import { generateUniqueId } from './generate-unique-id.helper';
import type { RiskGroups } from './risk-groups.types';
import { fetchUniverseIds } from './shared-fetch-universe-ids.helper';
import { initializePrismaClient } from './shared-prisma-client.helper';
import { createRiskGroups } from './shared-risk-groups.helper';
import type { UniverseRecord } from './universe-record.types';

interface SeederResult {
  cleanup(): Promise<void>;
  symbols: string[];
  accountNames: string[];
}

function createRecord(opts: {
  symbol: string;
  riskGroupId: string;
  distribution: number;
  distPerYear: number;
  lastPrice: number;
  exDate: Date | null;
  expired: boolean;
}): UniverseRecord {
  return {
    symbol: opts.symbol,
    risk_group_id: opts.riskGroupId,
    distribution: opts.distribution,
    distributions_per_year: opts.distPerYear,
    last_price: opts.lastPrice,
    ex_date: opts.exDate,
    most_recent_sell_date: null,
    most_recent_sell_price: null,
    expired: opts.expired,
    is_closed_end_fund: true,
  };
}

function createFirstBatch(
  symbols: string[],
  eq: string,
  inc: string,
  tf: string
): UniverseRecord[] {
  return [
    createRecord({
      symbol: symbols[0],
      riskGroupId: eq,
      distribution: 2.0,
      distPerYear: 4,
      lastPrice: 100.0,
      exDate: new Date('2026-06-15'),
      expired: false,
    }),
    createRecord({
      symbol: symbols[1],
      riskGroupId: inc,
      distribution: 0.5,
      distPerYear: 12,
      lastPrice: 25.0,
      exDate: new Date('2026-03-01'),
      expired: false,
    }),
    createRecord({
      symbol: symbols[2],
      riskGroupId: tf,
      distribution: 1.0,
      distPerYear: 4,
      lastPrice: 40.0,
      exDate: new Date('2026-09-20'),
      expired: false,
    }),
  ];
}

function createSecondBatch(
  symbols: string[],
  riskGroups: { eq: string; inc: string }
): UniverseRecord[] {
  return [
    createRecord({
      symbol: symbols[3],
      riskGroupId: riskGroups.eq,
      distribution: 1.5,
      distPerYear: 4,
      lastPrice: 50.0,
      // Fixed date clearly before symbols[0]'s 2026-06-15, so secondary-sort
      // assertions remain valid regardless of when the tests are run.
      exDate: new Date('2026-04-15'),
      expired: true,
    }),
    createRecord({
      symbol: symbols[4],
      riskGroupId: riskGroups.inc,
      distribution: 0.3,
      distPerYear: 12,
      lastPrice: 15.0,
      exDate: new Date('2026-01-15'),
      expired: false,
    }),
  ];
}

function createUniverseRecords(
  symbols: string[],
  riskGroups: RiskGroups
): UniverseRecord[] {
  const eq = riskGroups.equitiesRiskGroup.id;
  const inc = riskGroups.incomeRiskGroup.id;
  const tf = riskGroups.taxFreeIncomeRiskGroup.id;

  return [
    ...createFirstBatch(symbols, eq, inc, tf),
    ...createSecondBatch(symbols, { eq, inc }),
  ];
}

function buildTradeData(
  acctId: string,
  uId: string,
  prices: [number, number],
  meta: [string, number, string | null]
): Record<string, unknown> {
  return {
    universeId: uId,
    accountId: acctId,
    buy: prices[0],
    sell: prices[1],
    buy_date: new Date(meta[0]),
    quantity: meta[1],
    sell_date: meta[2] !== null ? new Date(meta[2]) : null,
  };
}

async function createAllTrades(
  prisma: PrismaClient,
  accts: string[],
  uIds: string[]
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma createMany requires untyped batch data
  const data: any[] = [
    buildTradeData(accts[0], uIds[0], [80, 0], ['2025-06-01', 10, null]),
    buildTradeData(
      accts[0],
      uIds[0],
      [85, 90],
      ['2025-03-01', 5, '2026-01-15']
    ),
    buildTradeData(accts[0], uIds[1], [20, 0], ['2025-09-01', 50, null]),
    buildTradeData(accts[1], uIds[0], [95, 0], ['2025-08-01', 3, null]),
    buildTradeData(
      accts[1],
      uIds[0],
      [100, 110],
      ['2025-05-01', 2, '2026-02-20']
    ),
    buildTradeData(
      accts[1],
      uIds[1],
      [22, 30],
      ['2025-07-01', 20, '2026-01-10']
    ),
  ];
  await prisma.trades.createMany({ data });
}

async function createAccountsAndTrades(
  prisma: PrismaClient,
  universeIds: string[],
  accountNames: string[]
): Promise<{ accountIds: string[] }> {
  const account1 = await prisma.accounts.create({
    data: { name: accountNames[0] },
  });
  const account2 = await prisma.accounts.create({
    data: { name: accountNames[1] },
  });
  await createAllTrades(prisma, [account1.id, account2.id], universeIds);
  return { accountIds: [account1.id, account2.id] };
}

function generateTestNames(uniqueId: string): {
  symbols: string[];
  accountNames: string[];
} {
  return {
    symbols: [
      `UAAA-${uniqueId}`,
      `UBBB-${uniqueId}`,
      `UCCC-${uniqueId}`,
      `UDDD-${uniqueId}`,
      `UEEE-${uniqueId}`,
    ],
    accountNames: [`E2E-Acct1-${uniqueId}`, `E2E-Acct2-${uniqueId}`],
  };
}

export async function seedUniverseE2eData(): Promise<SeederResult> {
  const prisma = await initializePrismaClient();
  const uniqueId = generateUniqueId();
  const { symbols, accountNames } = generateTestNames(uniqueId);
  let accountIds: string[] = [];

  try {
    const riskGroups = await createRiskGroups(prisma);
    await prisma.universe.createMany({
      data: createUniverseRecords(symbols, riskGroups),
    });
    const universeIds = await fetchUniverseIds(prisma, symbols);
    const result = await createAccountsAndTrades(
      prisma,
      universeIds,
      accountNames
    );
    accountIds = result.accountIds;
  } catch (error) {
    await prisma.$disconnect();
    throw error;
  }

  return {
    cleanup: async function cleanupFunction(): Promise<void> {
      try {
        await prisma.trades.deleteMany({
          where: { accountId: { in: accountIds } },
        });
        await prisma.accounts.deleteMany({
          where: { name: { in: accountNames } },
        });
        await prisma.universe.deleteMany({
          where: { symbol: { in: symbols } },
        });
      } finally {
        await prisma.$disconnect();
      }
    },
    symbols,
    accountNames,
  };
}
