import { buildMonthlyDates } from './build-monthly-dates.helper';
import { generateUniqueId } from './generate-unique-id.helper';
import { getOrCreateDivDepositTypeId } from './get-or-create-div-deposit-type-id.helper';
import { getOrCreateRiskGroupId } from './get-or-create-risk-group-id.helper';
import type { SeederResultBase } from './seeder-result-base.types';
import { initializePrismaClient } from './shared-prisma-client.helper';

const DISTRIBUTIONS_PER_YEAR = 12;
const LAST_PRICE = 10.0;

// Flat: all equal → CV = 0% → 'flat' category
const FLAT_AMOUNTS = [
  1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0,
];

// Volatile: near-palindrome pattern → CV >> 10%, slope = 0, not up-then-down/down-then-up
// Pattern: [2.0, 0.5, 2.0, 0.5, 2.0, 0.5, 0.5, 2.0, 0.5, 2.0, 0.5, 2.0]
// mean=1.25, CV=0.6, normalizedSlope=0 → 'volatile' (mirrors the unit test pattern)
const VOLATILE_AMOUNTS = [
  2.0, 0.5, 2.0, 0.5, 2.0, 0.5, 0.5, 2.0, 0.5, 2.0, 0.5, 2.0,
];

interface StoredVolatilityUpdateSeederResult extends SeederResultBase {
  symbol: string;
  initialCategory: 'flat';
  universeRecord: Record<string, unknown>;
  updateToVolatile(): Promise<void>;
}

interface SeedFlatContext {
  prisma: PrismaClient;
  riskGroupId: string;
  accountId: string;
  divDepositTypeId: string;
  symbol: string;
}

async function seedFlatSymbol(ctx: SeedFlatContext): Promise<string> {
  const universe = await ctx.prisma.universe.create({
    data: {
      symbol: ctx.symbol,
      risk_group_id: ctx.riskGroupId,
      distribution: FLAT_AMOUNTS[FLAT_AMOUNTS.length - 1],
      distributions_per_year: DISTRIBUTIONS_PER_YEAR,
      last_price: LAST_PRICE,
      ex_date: null,
      most_recent_sell_date: null,
      most_recent_sell_price: null,
      expired: false,
      is_closed_end_fund: true,
      volatility_long: 'flat',
      volatility_short: 'flat',
    },
  });

  const dates = buildMonthlyDates(FLAT_AMOUNTS.length);
  await ctx.prisma.divDeposits.createMany({
    data: dates.map(function buildDeposit(date: Date, i: number) {
      return {
        date,
        amount: FLAT_AMOUNTS[i],
        accountId: ctx.accountId,
        divDepositTypeId: ctx.divDepositTypeId,
        universeId: universe.id,
      };
    }),
  });

  return universe.id;
}

function buildUniverseRecord(
  universeId: string,
  symbol: string,
  riskGroupId: string
): Record<string, unknown> {
  return {
    id: universeId,
    symbol,
    distribution: FLAT_AMOUNTS[FLAT_AMOUNTS.length - 1],
    distributions_per_year: DISTRIBUTIONS_PER_YEAR,
    last_price: LAST_PRICE,
    most_recent_sell_date: null,
    most_recent_sell_price: null,
    ex_date: new Date().toISOString(),
    risk_group_id: riskGroupId,
    expired: false,
    is_closed_end_fund: true,
    position: 0,
    avg_purchase_yield_percent: 0,
    volatilityLong: 'flat',
    volatilityShort: 'flat',
  };
}

function buildUpdateToVolatile(
  prisma: PrismaClient,
  universeId: string,
  accountId: string,
  divDepositTypeId: string
): () => Promise<void> {
  return async function updateToVolatile(): Promise<void> {
    await prisma.divDeposits.deleteMany({ where: { universeId } });
    const dates = buildMonthlyDates(VOLATILE_AMOUNTS.length);
    await prisma.divDeposits.createMany({
      data: dates.map(function buildVolatileDeposit(date: Date, i: number) {
        return {
          date,
          amount: VOLATILE_AMOUNTS[i],
          accountId,
          divDepositTypeId,
          universeId,
        };
      }),
    });
  };
}

function suppressError(): undefined {
  return undefined;
}

interface CleanupContext {
  prisma: PrismaClient;
  universeId: string;
  symbol: string;
  accountName: string;
}

async function performCleanup(ctx: CleanupContext): Promise<void> {
  await ctx.prisma.divDeposits
    .deleteMany({ where: { universeId: ctx.universeId } })
    .catch(suppressError);
  await ctx.prisma.universe
    .deleteMany({ where: { symbol: ctx.symbol } })
    .catch(suppressError);
  await ctx.prisma.accounts
    .deleteMany({ where: { name: ctx.accountName } })
    .catch(suppressError);
}

/**
 * Seeds one universe symbol with flat divDeposit history (volatility_long = 'flat').
 * Returns helpers for the trigger-update AC#2 test.
 */
export async function seedStoredVolatilityUpdateData(): Promise<StoredVolatilityUpdateSeederResult> {
  const prisma = await initializePrismaClient();
  const uniqueId = generateUniqueId();
  const symbol = `E2ESVUP${uniqueId}`;
  const accountName = `E2E-SV-UP-${uniqueId}`;
  let universeId = '';
  let accountId = '';

  try {
    const riskGroupId = await getOrCreateRiskGroupId(prisma);
    const divDepositTypeId = await getOrCreateDivDepositTypeId(prisma);
    const acct = await prisma.accounts.create({ data: { name: accountName } });
    accountId = acct.id;
    universeId = await seedFlatSymbol({
      prisma,
      riskGroupId,
      accountId,
      divDepositTypeId,
      symbol,
    });
    const cleanupCtx = { prisma, universeId, symbol, accountName };
    return {
      symbol,
      symbols: [symbol],
      initialCategory: 'flat',
      universeRecord: buildUniverseRecord(universeId, symbol, riskGroupId),
      updateToVolatile: buildUpdateToVolatile(
        prisma,
        universeId,
        accountId,
        divDepositTypeId
      ),
      cleanup: async function cleanup(): Promise<void> {
        try {
          await performCleanup(cleanupCtx);
        } finally {
          await prisma.$disconnect();
        }
      },
    };
  } catch (error) {
    const cleanupCtx = { prisma, universeId, symbol, accountName };
    await performCleanup(cleanupCtx);
    await prisma.$disconnect();
    throw error;
  }
}
