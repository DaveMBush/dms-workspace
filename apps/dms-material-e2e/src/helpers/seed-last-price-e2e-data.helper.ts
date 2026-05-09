/* eslint-disable @typescript-eslint/naming-convention -- Property names match Prisma/database column names */
import { generateUniqueId } from './generate-unique-id.helper';
import { initializePrismaClient } from './shared-prisma-client.helper';
import { createRiskGroups } from './shared-risk-groups.helper';

/** Seed result for the Last $ Open Positions E2E test (Story 99.3). */
export interface LastPriceSeederResult {
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

    // Symbol A: last_price 123.45 — the value the test asserts on.
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

    // Symbol B: last_price 0 — represents the "missing/null" price case.
    // Universe.last_price is a non-nullable Float, so 0 is the closest
    // representation; the server's `?? 0` guard also routes null → 0.
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

    const account = await prisma.accounts.create({
      data: { name: accountName },
    });
    accountId = account.id;

    // Create trades individually so we can capture each trade's generated ID.
    // (createMany does not return created records in SQLite.)
    const tradeA = await prisma.trades.create({
      data: {
        universeId: universeA.id,
        accountId,
        buy: 100,
        sell: 0,
        buy_date: new Date('2025-01-15'),
        quantity: 10,
        sell_date: null,
      },
    });
    tradeIdA = tradeA.id;

    const tradeB = await prisma.trades.create({
      data: {
        universeId: universeB.id,
        accountId,
        buy: 50,
        sell: 0,
        buy_date: new Date('2025-03-10'),
        quantity: 5,
        sell_date: null,
      },
    });
    tradeIdB = tradeB.id;
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
/* eslint-enable @typescript-eslint/naming-convention */
