import type { PrismaClient } from '@prisma/client';

import { createTestDates } from './create-test-dates.helper';
import { generateUniqueId } from './generate-unique-id.helper';
import type { RiskGroups } from './risk-groups.types';
import { initializePrismaClient } from './shared-prisma-client.helper';
import { createRiskGroups } from './shared-risk-groups.helper';
import type { UniverseRecord } from './universe-record.types';

interface SeederResult {
  cleanup(): Promise<void>;
  symbols: string[];
}

/**
 * Epic 67 / Story 67.1 — Row-height measurement seed data.
 *
 * Creates two classes of universe records:
 *   • is_closed_end_fund = false  → no open trades → position = 0
 *     → shouldShowDeleteButton() returns true → mat-icon-button shown in row
 *     → row height is expected to be ~57px (inflated by the icon-button)
 *   • is_closed_end_fund = true   → shouldShowDeleteButton() returns false
 *     → no icon-button in row → row height is expected to be ~52px
 *
 * Having BOTH types visible on the Universe screen simultaneously is what
 * produces the mixed offsetHeight values detected by the failing test in
 * universe-row-heights.spec.ts.
 */

/** Records that will have the mat-icon-button delete action rendered (taller rows). */
function createButtonRows(
  symbols: string[],
  riskGroups: RiskGroups,
  futureDate: Date
): UniverseRecord[] {
  const equitiesId = riskGroups.equitiesRiskGroup.id;
  const incomeId = riskGroups.incomeRiskGroup.id;
  return [
    {
      symbol: symbols[0],
      risk_group_id: equitiesId,
      distribution: 1.0,
      distributions_per_year: 4,
      last_price: 50.0,
      ex_date: futureDate,
      most_recent_sell_date: null,
      most_recent_sell_price: null,
      expired: false,
      is_closed_end_fund: false,
    },
    {
      symbol: symbols[1],
      risk_group_id: incomeId,
      distribution: 0.5,
      distributions_per_year: 12,
      last_price: 20.0,
      ex_date: futureDate,
      most_recent_sell_date: null,
      most_recent_sell_price: null,
      expired: false,
      is_closed_end_fund: false,
    },
    {
      symbol: symbols[2],
      risk_group_id: equitiesId,
      distribution: 2.0,
      distributions_per_year: 4,
      last_price: 80.0,
      ex_date: futureDate,
      most_recent_sell_date: null,
      most_recent_sell_price: null,
      expired: false,
      is_closed_end_fund: false,
    },
  ];
}

/** Records that will NOT have the delete button — no icon-button in the row (normal-height rows). */
function createNoButtonRows(
  symbols: string[],
  riskGroups: RiskGroups,
  futureDate: Date
): UniverseRecord[] {
  const equitiesId = riskGroups.equitiesRiskGroup.id;
  const incomeId = riskGroups.incomeRiskGroup.id;
  return [
    {
      symbol: symbols[3],
      risk_group_id: equitiesId,
      distribution: 1.5,
      distributions_per_year: 4,
      last_price: 60.0,
      ex_date: futureDate,
      most_recent_sell_date: null,
      most_recent_sell_price: null,
      expired: false,
      is_closed_end_fund: true,
    },
    {
      symbol: symbols[4],
      risk_group_id: incomeId,
      distribution: 0.3,
      distributions_per_year: 12,
      last_price: 15.0,
      ex_date: futureDate,
      most_recent_sell_date: null,
      most_recent_sell_price: null,
      expired: false,
      is_closed_end_fund: true,
    },
    {
      symbol: symbols[5],
      risk_group_id: equitiesId,
      distribution: 0.75,
      distributions_per_year: 4,
      last_price: 35.0,
      ex_date: futureDate,
      most_recent_sell_date: null,
      most_recent_sell_price: null,
      expired: false,
      is_closed_end_fund: true,
    },
  ];
}

function createRowHeightRecords(
  symbols: string[],
  riskGroups: RiskGroups
): UniverseRecord[] {
  const { futureDate } = createTestDates();
  return [
    ...createButtonRows(symbols, riskGroups, futureDate),
    ...createNoButtonRows(symbols, riskGroups, futureDate),
  ];
}

async function cleanupRowHeightData(
  prisma: PrismaClient,
  symbols: string[]
): Promise<void> {
  try {
    await prisma.universe.deleteMany({
      where: { symbol: { in: symbols } },
    });
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Seeds universe records for the Epic 67 / Story 67.1 row-height diagnosis test.
 * Returns a cleanup function and the generated symbol names.
 */
export async function seedRowHeightE2eData(): Promise<SeederResult> {
  const prisma = await initializePrismaClient();
  const uniqueId = generateUniqueId();
  const symbols = [
    `RH67BTN1-${uniqueId}`,
    `RH67BTN2-${uniqueId}`,
    `RH67BTN3-${uniqueId}`,
    `RH67NOBTN1-${uniqueId}`,
    `RH67NOBTN2-${uniqueId}`,
    `RH67NOBTN3-${uniqueId}`,
  ];

  try {
    const riskGroups = await createRiskGroups(prisma);
    const records = createRowHeightRecords(symbols, riskGroups);
    await prisma.universe.createMany({ data: records });
  } catch (error) {
    await prisma.$disconnect();
    throw error;
  }

  return {
    cleanup: async function cleanupFunction(): Promise<void> {
      await cleanupRowHeightData(prisma, symbols);
    },
    symbols,
  };
}
