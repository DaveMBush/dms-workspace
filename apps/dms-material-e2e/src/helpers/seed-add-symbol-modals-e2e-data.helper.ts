import type { PrismaClient } from '@prisma/client';

import { initializePrismaClient } from './shared-prisma-client.helper';
import { createRiskGroups } from './shared-risk-groups.helper';

const UNIV_IN_CANDIDATES = ['IUNIV', 'AINUV', 'BUNIV', 'CINUV', 'DINUV'];
const UNIV_OUT_CANDIDATES = ['ZZZZZ', 'QQQQQ', 'XXXXX'];

interface SeederResult {
  accountId: string;
  riskGroupId: string;
  universeInSymbol: string;
  universeOutSymbol: string;
  cleanup(): Promise<void>;
}

async function pickAvailableSymbol(
  prisma: PrismaClient,
  candidates: string[]
): Promise<string> {
  for (const candidate of candidates) {
    const existing = await prisma.universe.findFirst({
      where: { symbol: candidate },
      select: { id: true },
    });
    if (existing === null) {
      return candidate;
    }
  }
  throw new Error(
    `All candidate symbols are already in use: ${candidates.join(
      ', '
    )}. Cannot seed test data.`
  );
}

export async function seedAddSymbolModalsE2eData(): Promise<SeederResult> {
  const prisma = await initializePrismaClient();

  let accountId = '';
  let universeInSymbol = '';
  let universeOutSymbol = '';
  let riskGroupId = '';

  try {
    const riskGroups = await createRiskGroups(prisma);
    riskGroupId = riskGroups.equitiesRiskGroup.id;

    universeInSymbol = await pickAvailableSymbol(prisma, UNIV_IN_CANDIDATES);
    universeOutSymbol = await pickAvailableSymbol(
      prisma,
      UNIV_OUT_CANDIDATES.filter(function notSameAsIn(c: string): boolean {
        return c !== universeInSymbol;
      })
    );

    await prisma.universe.create({
      data: {
        symbol: universeInSymbol,
        risk_group_id: riskGroupId,
        distribution: 1.0,
        distributions_per_year: 4,
        last_price: 100.0,
        ex_date: new Date('2026-06-15'),
        most_recent_sell_date: null,
        most_recent_sell_price: null,
        expired: false,
        is_closed_end_fund: true,
      },
    });

    const universeRow = await prisma.universe.findFirst({
      where: { symbol: universeInSymbol },
      select: { id: true },
    });
    if (universeRow === null) {
      throw new Error(
        `Failed to find universe row for symbol: ${universeInSymbol}`
      );
    }

    const account = await prisma.accounts.create({
      data: { name: `E2E-ASM-${universeInSymbol}` },
    });
    accountId = account.id;

    await prisma.trades.create({
      data: {
        universeId: universeRow.id,
        accountId,
        buy: 100.0,
        sell: 0,
        buy_date: new Date('2025-01-15'),
        quantity: 10,
        sell_date: null,
      },
    });

    // Verify UNIV_OUT is indeed not in the Universe
    const outCheck = await prisma.universe.findFirst({
      where: { symbol: universeOutSymbol },
      select: { id: true },
    });
    if (outCheck !== null) {
      throw new Error(
        `universeOutSymbol ${universeOutSymbol} is unexpectedly present in the Universe. Cannot seed test data.`
      );
    }
  } catch (error) {
    await prisma.$disconnect();
    throw error;
  }

  return {
    accountId,
    riskGroupId,
    universeInSymbol,
    universeOutSymbol,
    cleanup: async function cleanupAddSymbolModalsData(): Promise<void> {
      try {
        await prisma.trades.deleteMany({
          where: { accountId },
        });
        await prisma.accounts.deleteMany({
          where: { id: accountId },
        });
        await prisma.universe.deleteMany({
          where: { symbol: universeInSymbol },
        });
      } finally {
        await prisma.$disconnect();
      }
    },
  };
}
