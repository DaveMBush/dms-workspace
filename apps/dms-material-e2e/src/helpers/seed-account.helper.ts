import { randomUUID } from 'crypto';
import type { PrismaClient } from '@prisma/client';
import { initializePrismaClient } from './shared-prisma-client.helper';

interface UniverseSeed {
  symbol: string;
  riskGroup: string;
  distribution: number;
  distributionsPerYear: number;
  lastPrice: number;
  exDate: Date;
}

// Mirrors the reference data created by tools/create-test-db.js so that a
// per-spec account renders identically to the legacy shared "E2E Test Account".
const UNIVERSE_SEEDS: UniverseSeed[] = [
  {
    symbol: 'TESTEQ1',
    riskGroup: 'Equities',
    distribution: 2.5,
    distributionsPerYear: 4,
    lastPrice: 150.0,
    exDate: new Date('2025-06-15'),
  },
  {
    symbol: 'TESTIN1',
    riskGroup: 'Income',
    distribution: 1.8,
    distributionsPerYear: 12,
    lastPrice: 25.0,
    exDate: new Date('2025-03-01'),
  },
  {
    symbol: 'TESTTF1',
    riskGroup: 'Tax Free Income',
    distribution: 1.2,
    distributionsPerYear: 12,
    lastPrice: 50.0,
    exDate: new Date('2025-09-20'),
  },
];

async function ensureRiskGroup(
  prisma: PrismaClient,
  name: string,
): Promise<string> {
  const existing = await prisma.risk_group.findFirst({ where: { name } });
  if (existing) {
    return existing.id;
  }
  const created = await prisma.risk_group.create({ data: { name } });
  return created.id;
}

async function ensureUniverse(
  prisma: PrismaClient,
  seed: UniverseSeed,
): Promise<string> {
  const existing = await prisma.universe.findFirst({
    where: { symbol: seed.symbol },
  });
  if (existing) {
    return existing.id;
  }
  const riskGroupId = await ensureRiskGroup(prisma, seed.riskGroup);
  const created = await prisma.universe.create({
    data: {
      symbol: seed.symbol,
      risk_group_id: riskGroupId,
      distribution: seed.distribution,
      distributions_per_year: seed.distributionsPerYear,
      last_price: seed.lastPrice,
      ex_date: seed.exDate,
      expired: false,
      is_closed_end_fund: true,
      createdAt: new Date('2099-01-01'),
    },
  });
  return created.id;
}

async function ensureDividendType(prisma: PrismaClient): Promise<string> {
  const existing = await prisma.divDepositType.findFirst({
    where: { name: 'Dividend' },
  });
  if (existing) {
    return existing.id;
  }
  const created = await prisma.divDepositType.create({
    data: { name: 'Dividend' },
  });
  return created.id;
}

async function seedOpenTrades(
  prisma: PrismaClient,
  accountId: string,
  universeIds: Record<string, string>,
): Promise<void> {
  await prisma.trades.createMany({
    data: [
      {
        universeId: universeIds['TESTEQ1'],
        accountId,
        buy: 120.0,
        sell: 0,
        buy_date: new Date('2025-01-15'),
        quantity: 20,
        sell_date: null,
      },
      {
        universeId: universeIds['TESTIN1'],
        accountId,
        buy: 22.0,
        sell: 0,
        buy_date: new Date('2025-02-10'),
        quantity: 100,
        sell_date: null,
      },
      {
        universeId: universeIds['TESTTF1'],
        accountId,
        buy: 45.0,
        sell: 0,
        buy_date: new Date('2025-03-05'),
        quantity: 40,
        sell_date: null,
      },
    ],
  });
}

async function seedClosedTrade(
  prisma: PrismaClient,
  accountId: string,
  universeIds: Record<string, string>,
): Promise<void> {
  await prisma.trades.create({
    data: {
      universeId: universeIds['TESTEQ1'],
      accountId,
      buy: 100.0,
      sell: 130.0,
      buy_date: new Date('2024-06-01'),
      quantity: 10,
      sell_date: new Date('2025-01-20'),
    },
  });
}

async function seedDivDeposits(
  prisma: PrismaClient,
  accountId: string,
  divDepositTypeId: string,
  universeIds: Record<string, string>,
): Promise<void> {
  await prisma.divDeposits.createMany({
    data: [
      {
        date: new Date('2025-01-15'),
        amount: 250.0,
        accountId,
        divDepositTypeId,
        universeId: universeIds['TESTEQ1'],
      },
      {
        date: new Date('2025-02-15'),
        amount: 180.0,
        accountId,
        divDepositTypeId,
        universeId: universeIds['TESTIN1'],
      },
      {
        date: new Date('2025-03-15'),
        amount: 120.0,
        accountId,
        divDepositTypeId,
        universeId: universeIds['TESTTF1'],
      },
    ],
  });
}

async function cleanupAccount(
  prisma: PrismaClient,
  accountId: string,
): Promise<void> {
  try {
    await prisma.trades.deleteMany({ where: { accountId } });
    await prisma.divDeposits.deleteMany({ where: { accountId } });
    await prisma.accounts.delete({ where: { id: accountId } });
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Seeds a unique account with the same reference data as the legacy shared
 * "E2E Test Account" (TESTEQ1/TESTIN1/TESTTF1 universes, open trades, one
 * closed trade, and dividend deposits). Each call creates a fresh account id so
 * specs no longer share a hardcoded UUID. Reference rows (risk groups,
 * universes, div deposit type) are reused when already present. The returned
 * `cleanup` removes the account-scoped rows and disconnects Prisma.
 */
export async function seedAccount(): Promise<{
  accountId: string;
  cleanup(): Promise<void>;
}> {
  const prisma = await initializePrismaClient();

  try {
    const universeIds: Record<string, string> = {};
    for (const seed of UNIVERSE_SEEDS) {
      universeIds[seed.symbol] = await ensureUniverse(prisma, seed);
    }
    const divDepositTypeId = await ensureDividendType(prisma);

    // One UUID for both the account id and its display name so the seeded
    // account can be located from either (a second randomUUID() here would
    // make the name's embedded id differ from the actual row id).
    const accountId = randomUUID();
    const account = await prisma.accounts.create({
      data: { id: accountId, name: `E2E Seeded Account ${accountId}` },
    });

    // Open positions (sell_date is null) — same values as create-test-db.js.
    await seedOpenTrades(prisma, account.id, universeIds);
    // Closed trade (sold positions & capital gains).
    await seedClosedTrade(prisma, account.id, universeIds);
    // Dividend deposits.
    await seedDivDeposits(prisma, account.id, divDepositTypeId, universeIds);

    return {
      accountId: account.id,
      cleanup: async function cleanup(): Promise<void> {
        await cleanupAccount(prisma, account.id);
      },
    };
  } catch (error) {
    await prisma.$disconnect();
    throw error;
  }
}
