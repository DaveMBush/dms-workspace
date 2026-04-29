import type { PrismaClient } from '@prisma/client';

import { buildMonthlyDates } from './build-monthly-dates.helper';
import { generateUniqueId } from './generate-unique-id.helper';
import { getOrCreateDivDepositTypeId } from './get-or-create-div-deposit-type-id.helper';
import { getOrCreateRiskGroupId } from './get-or-create-risk-group-id.helper';
import type { SeederResultBase } from './seeder-result-base.types';
import { initializePrismaClient } from './shared-prisma-client.helper';

/**
 * Story 88.4: Seed a held symbol and an unheld symbol, both with pre-stored
 * volatility_long / volatility_short values (direct DB write — verifies the
 * rendering path of the Universe screen for both cases).
 *
 * Held symbol:  universe + account + 12 months of divDeposits + 1 open trade
 *               (sell_date = null). volatility_long = 'steady',
 *               volatility_short = 'steady'.
 *
 * Unheld symbol: universe row only — zero trades, zero divDeposits.
 *                volatility_long = 'increasing',
 *                volatility_short = 'increasing'.
 *
 * NOTE: Volatility values are written directly so the test can run without
 * hitting dividendhistory.net or triggering a universe-sync computation.
 * This verifies the rendering half of the fix; Story 88.3 tests the wiring.
 */

const DISTRIBUTIONS_PER_YEAR = 12;
const LAST_PRICE = 10.0;
const MONTHS_TO_SEED = 12;

// Steady: oscillating ~5% around mean → CV ≈ 5% (between 2% and 10% thresholds)
const STEADY_AMOUNTS = [
  0.95, 1.05, 0.95, 1.05, 0.95, 1.05, 0.95, 1.05, 0.95, 1.05, 0.95, 1.05,
];

export interface HeldAndUnheldSeederResult extends SeederResultBase {
  heldSymbol: string;
  unheldSymbol: string;
}

function suppressError(): undefined {
  return undefined;
}

async function seedHeldSymbol(
  prisma: PrismaClient,
  symbol: string,
  riskGroupId: string,
  accountId: string,
  divDepositTypeId: string,
  universeIds: string[]
): Promise<void> {
  const universe = await prisma.universe.create({
    data: {
      symbol,
      risk_group_id: riskGroupId,
      distribution: STEADY_AMOUNTS[STEADY_AMOUNTS.length - 1],
      distributions_per_year: DISTRIBUTIONS_PER_YEAR,
      last_price: LAST_PRICE,
      ex_date: null,
      most_recent_sell_date: null,
      most_recent_sell_price: null,
      expired: false,
      is_closed_end_fund: true,
      volatility_long: 'steady',
      volatility_short: 'steady',
    },
  });
  universeIds.push(universe.id);

  const dates = buildMonthlyDates(MONTHS_TO_SEED);
  await prisma.divDeposits.createMany({
    data: dates.map(function buildDeposit(date: Date, i: number) {
      return {
        date,
        amount: STEADY_AMOUNTS[i],
        accountId,
        divDepositTypeId,
        universeId: universe.id,
      };
    }),
  });

  // Seed one open trade (sell_date = null) to make this a held symbol
  await prisma.trades.create({
    data: {
      universeId: universe.id,
      accountId,
      buy: LAST_PRICE,
      sell: 0,
      buy_date: new Date('2023-01-01'),
      quantity: 100,
      sell_date: null,
    },
  });
}

async function seedUnheldSymbol(
  prisma: PrismaClient,
  symbol: string,
  riskGroupId: string,
  universeIds: string[]
): Promise<void> {
  const universe = await prisma.universe.create({
    data: {
      symbol,
      risk_group_id: riskGroupId,
      distribution: 1.0,
      distributions_per_year: DISTRIBUTIONS_PER_YEAR,
      last_price: LAST_PRICE,
      ex_date: null,
      most_recent_sell_date: null,
      most_recent_sell_price: null,
      expired: false,
      is_closed_end_fund: true,
      volatility_long: 'increasing',
      volatility_short: 'increasing',
    },
  });
  universeIds.push(universe.id);
  // No divDeposits, no trades — this is the unheld case
}

function buildCleanup(
  prisma: PrismaClient,
  universeIds: string[],
  symbols: string[],
  accountName: string
): () => Promise<void> {
  return async function cleanupHeldAndUnheldData(): Promise<void> {
    try {
      // Delete child records first to avoid FK constraint failures
      if (universeIds.length > 0) {
        await prisma.trades
          .deleteMany({ where: { universeId: { in: universeIds } } })
          .catch(suppressError);
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
    } finally {
      await prisma.$disconnect();
    }
  };
}

/**
 * Seeds two universe symbols for Story 88.4:
 * - heldSymbol: has divDeposits, an open trade, and pre-stored volatility
 * - unheldSymbol: no divDeposits, no trades, but pre-stored volatility
 *
 * Both symbols should display a volatility icon on the Universe screen.
 */
export async function seedVolatilityHeldAndUnheldData(): Promise<HeldAndUnheldSeederResult> {
  const prisma = await initializePrismaClient();
  const uniqueId = generateUniqueId();
  const accountName = `E2E-88-4-${uniqueId}`;
  const heldSymbol = `E2EH884${uniqueId}`.substring(0, 12);
  const unheldSymbol = `E2EU884${uniqueId}`.substring(0, 12);
  const symbols = [heldSymbol, unheldSymbol];
  const universeIds: string[] = [];

  try {
    const riskGroupId = await getOrCreateRiskGroupId(prisma);
    const divDepositTypeId = await getOrCreateDivDepositTypeId(prisma);
    const account = await prisma.accounts.create({
      data: { name: accountName },
    });

    await seedHeldSymbol(
      prisma,
      heldSymbol,
      riskGroupId,
      account.id,
      divDepositTypeId,
      universeIds
    );
    await seedUnheldSymbol(prisma, unheldSymbol, riskGroupId, universeIds);
  } catch (error) {
    // Best-effort cleanup on seed failure
    if (universeIds.length > 0) {
      await prisma.trades
        .deleteMany({ where: { universeId: { in: universeIds } } })
        .catch(suppressError);
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
    await prisma.$disconnect();
    throw error;
  }

  return {
    heldSymbol,
    unheldSymbol,
    symbols,
    cleanup: buildCleanup(prisma, universeIds, symbols, accountName),
  };
}
