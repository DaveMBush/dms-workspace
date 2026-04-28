import { prisma } from '../prisma/prisma-client';
import type { ProcessedRow } from '../routes/common/distribution-api.function';
import { calculateVolatility } from './volatility-calculation.function';

const FIVE_YEARS_MS = 5 * 365 * 24 * 60 * 60 * 1000;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function buildFiveYearsAgo(now: Date): Date {
  return new Date(now.getTime() - FIVE_YEARS_MS);
}

function buildOneYearAgo(now: Date): Date {
  return new Date(now.getTime() - ONE_YEAR_MS);
}

function filterRecordsSince(
  records: ProcessedRow[],
  threshold: Date
): ProcessedRow[] {
  return records.filter(function isSinceThreshold(record) {
    return record.date >= threshold;
  });
}

function mapAmounts(records: ProcessedRow[]): number[] {
  return records.map(function getAmount(record) {
    return record.amount;
  });
}

function extractWindowedAmounts(
  history: ProcessedRow[],
  now: Date
): { longAmounts: number[]; shortAmounts: number[] } {
  const fiveYearsAgo = buildFiveYearsAgo(now);
  const oneYearAgo = buildOneYearAgo(now);
  const longRows = filterRecordsSince(history, fiveYearsAgo);
  const shortRows = filterRecordsSince(history, oneYearAgo);
  return {
    longAmounts: mapAmounts(longRows),
    shortAmounts: mapAmounts(shortRows),
  };
}

export async function recalculateUniverseVolatility(
  universeId: string,
  history: ProcessedRow[]
): Promise<void> {
  const now = new Date();
  const { longAmounts, shortAmounts } = extractWindowedAmounts(history, now);

  const volatilityLong = calculateVolatility(longAmounts);
  const volatilityShort = calculateVolatility(shortAmounts);

  await prisma.universe.update({
    where: { id: universeId },
    data: {
      volatility_long: volatilityLong,
      volatility_short: volatilityShort,
      volatility_calculated_at: now,
    },
  });
}
