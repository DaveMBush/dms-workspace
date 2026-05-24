import type { PrismaClient } from '@prisma/client';

import { generateUniqueId } from './generate-unique-id.helper';
import type { SeederResultBase } from './seeder-result-base.types';
import { fetchUniverseIds } from './shared-fetch-universe-ids.helper';
import { initializePrismaClient } from './shared-prisma-client.helper';
import { createRiskGroups } from './shared-risk-groups.helper';

/**
 * Seeds four universe rows covering the expired-no-open filter permutations
 * defined in Epic 109 / Story 109.3:
 *
 *   (a) EXNO — expired=true,  no open trades  → ABSENT from universe screen
 *   (b) EXOP — expired=true,  1 open trade    → PRESENT
 *   (c) ACNO — expired=false, no trades       → PRESENT
 *   (d) ACOP — expired=false, 1 open trade    → PRESENT
 */
export interface ExpiredFilterSeederResult extends SeederResultBase {
  /** Symbol that must be ABSENT (a): expired + no open trades. */
  absentSymbol: string;
  /** Symbols that must be PRESENT: (b), (c), (d). */
  presentSymbols: string[];
}

async function createUniverseRecord(
  prisma: PrismaClient,
  symbol: string,
  riskGroupId: string,
  expired: boolean
): Promise<void> {
  await prisma.universe.create({
    data: {
      symbol,
      risk_group_id: riskGroupId,
      distribution: 0.1,
      distributions_per_year: 12,
      last_price: 10.0,
      ex_date: new Date('2026-06-15'),
      most_recent_sell_date: null,
      most_recent_sell_price: null,
      expired,
      is_closed_end_fund: true,
    },
  });
}

async function createOpenTrade(
  prisma: PrismaClient,
  accountId: string,
  universeId: string
): Promise<void> {
  await prisma.trades.create({
    data: {
      universeId,
      accountId,
      buy: 10.0,
      sell: 0,
      buy_date: new Date('2025-01-01'),
      quantity: 10,
      sell_date: null,
    },
  });
}

export async function seedExpiredFilterE2eData(): Promise<ExpiredFilterSeederResult> {
  const prisma = await initializePrismaClient();
  const uid = generateUniqueId();

  // Use short prefixes so symbol text fits comfortably in the filter input.
  const symbolExNo = `EXNO-${uid}`; // (a) expired, no open → ABSENT
  const symbolExOp = `EXOP-${uid}`; // (b) expired, with open → PRESENT
  const symbolAcNo = `ACNO-${uid}`; // (c) active, no open → PRESENT
  const symbolAcOp = `ACOP-${uid}`; // (d) active, with open → PRESENT

  const allSymbols = [symbolExNo, symbolExOp, symbolAcNo, symbolAcOp];
  const accountName = `E2E-ExpFlt-${uid}`;

  let accountId = '';

  try {
    const riskGroups = await createRiskGroups(prisma);
    const rgId = riskGroups.equitiesRiskGroup.id;

    // Create the four universe records.
    await createUniverseRecord(prisma, symbolExNo, rgId, true);
    await createUniverseRecord(prisma, symbolExOp, rgId, true);
    await createUniverseRecord(prisma, symbolAcNo, rgId, false);
    await createUniverseRecord(prisma, symbolAcOp, rgId, false);

    // Resolve their IDs for trade creation.
    const universeIds = await fetchUniverseIds(prisma, allSymbols);
    const idExOp = universeIds[allSymbols.indexOf(symbolExOp)];
    const idAcOp = universeIds[allSymbols.indexOf(symbolAcOp)];

    // Create account for the trades.
    const account = await prisma.accounts.create({
      data: { name: accountName },
    });
    accountId = account.id;

    // (b) expired + open trade
    await createOpenTrade(prisma, accountId, idExOp);
    // (d) active + open trade
    await createOpenTrade(prisma, accountId, idAcOp);
  } catch (error) {
    await prisma.$disconnect();
    throw error;
  }

  return {
    symbols: allSymbols,
    absentSymbol: symbolExNo,
    presentSymbols: [symbolExOp, symbolAcNo, symbolAcOp],
    cleanup: async function cleanupExpiredFilterData(): Promise<void> {
      try {
        if (accountId) {
          await prisma.trades.deleteMany({ where: { accountId } });
          await prisma.accounts.deleteMany({ where: { id: accountId } });
        }
        await prisma.universe.deleteMany({
          where: { symbol: { in: allSymbols } },
        });
      } finally {
        await prisma.$disconnect();
      }
    },
  };
}
