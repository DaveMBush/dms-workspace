import type { PrismaClient } from '@prisma/client';

import { generateUniqueId } from './generate-unique-id.helper';
import { initializePrismaClient } from './shared-prisma-client.helper';
import { createRiskGroups } from './shared-risk-groups.helper';

/** Seed result for the Last $ Open Positions E2E test (Story 99.3). */
interface LastPriceSeederResult {
  /** The account ID to navigate to for the Open Positions tab. */
  accountId: string;
  /** Symbol with a known non-null last price (123.45). */
  symbolA: string;
  /** Symbol with a zero / "missing" last price (0). */
  symbolB: string;
  /** Trade ID for symbolA — used in the API pre-check (POST /api/trades). */
  tradeIdA: string;
  /** Trade ID for symbolB — used in the API pre-check (POST /api/trades). */
  tradeIdB: string;
  /** Cleanup function — removes all seeded records. */
  cleanup(): Promise<void>;
}

async function createSymbolUniverses(
  prisma: PrismaClient,
  symbolA: string,
  symbolB: string,
  riskGroupId: string
): Promise<{ universeAId: string; universeBId: string }> {
  const universeA = await prisma.universe.create({
    data: {
      symbol: symbolA,
      risk_group_id: riskGroupId,
      distribution: 1.0,
      distributions_per_year: 4,
      last_price: 123.45,
      ex_date: new Date('2026-06-15'),
      most_recent_sell_date: null,
      most_recent_sell_price: null,
      expired: false,
      is_closed_end_fund: true,
    },
  });
  const universeB = await prisma.universe.create({
    data: {
      symbol: symbolB,
      risk_group_id: riskGroupId,
      distribution: 1.0,
      distributions_per_year: 4,
      last_price: 0,
      ex_date: new Date('2026-06-15'),
      most_recent_sell_date: null,
      most_recent_sell_price: null,
      expired: false,
      is_closed_end_fund: true,
    },
  });
  return { universeAId: universeA.id, universeBId: universeB.id };
}

async function createSymbolTrades(
  prisma: PrismaClient,
  universeAId: string,
  universeBId: string,
  accountId: string
): Promise<{ tradeIdA: string; tradeIdB: string }> {
  const tradeA = await prisma.trades.create({
    data: {
      universeId: universeAId,
      accountId,
      buy: 100,
      sell: 0,
      buy_date: new Date('2025-01-15'),
      quantity: 10,
      sell_date: null,
    },
  });
  const tradeB = await prisma.trades.create({
    data: {
      universeId: universeBId,
      accountId,
      buy: 50,
      sell: 0,
      buy_date: new Date('2025-03-10'),
      quantity: 5,
      sell_date: null,
    },
  });
  return { tradeIdA: tradeA.id, tradeIdB: tradeB.id };
}

/**
 * Seed two open positions for the Last $ column E2E test (Story 99.3).
 *
 * - symbolA — Universe.last_price = 123.45  (known non-null value; the test
 *             asserts the UI renders "$123.45")
 * - symbolB — Universe.last_price = 0       (represents the missing/zero case;
 *             the test asserts the UI renders "$0.00" and not "null"/"NaN")
 *
 * Both symbols get exactly one open trade so both rows appear on the Open
 * Positions tab.
 */
export async function seedLastPriceE2eData(): Promise<LastPriceSeederResult> {
  const prisma = await initializePrismaClient();
  const uniqueId = generateUniqueId();
  const symbolA = `LP-A-${uniqueId}`;
  const symbolB = `LP-B-${uniqueId}`;
  const symbols = [symbolA, symbolB];
  const accountName = `E2E-LP-Acct-${uniqueId}`;

  let accountId = '';
  let tradeIdA = '';
  let tradeIdB = '';

  try {
    const riskGroups = await createRiskGroups(prisma);
    const riskGroupId = riskGroups.equitiesRiskGroup.id;
    const universeIds = await createSymbolUniverses(
      prisma,
      symbolA,
      symbolB,
      riskGroupId
    );
    const account = await prisma.accounts.create({
      data: { name: accountName },
    });
    accountId = account.id;
    const tradeIds = await createSymbolTrades(
      prisma,
      universeIds.universeAId,
      universeIds.universeBId,
      accountId
    );
    tradeIdA = tradeIds.tradeIdA;
    tradeIdB = tradeIds.tradeIdB;
  } catch (error) {
    await prisma.$disconnect();
    throw error;
  }

  return {
    accountId,
    symbolA,
    symbolB,
    tradeIdA,
    tradeIdB,
    cleanup: async function cleanupLastPriceData(): Promise<void> {
      try {
        await prisma.trades.deleteMany({ where: { accountId } });
        await prisma.accounts.deleteMany({ where: { name: accountName } });
        await prisma.universe.deleteMany({
          where: { symbol: { in: symbols } },
        });
      } finally {
        await prisma.$disconnect();
      }
    },
  };
}
