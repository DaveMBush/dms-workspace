import { prisma } from '../prisma/prisma-client';
import type { ProcessedRow } from '../routes/common/distribution-api.function';
import { normalizeToMonthlyEquivalents } from './normalize-to-monthly-equivalents.function';
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

function extractWindowedAmounts(
  history: ProcessedRow[],
  now: Date
): { longAmounts: number[]; shortAmounts: number[] } {
  const fiveYearsAgo = buildFiveYearsAgo(now);
  const oneYearAgo = buildOneYearAgo(now);
  const longRows = filterRecordsSince(history, fiveYearsAgo);
  const shortRows = filterRecordsSince(history, oneYearAgo);
  return {
    longAmounts: normalizeToMonthlyEquivalents(longRows),
    shortAmounts: normalizeToMonthlyEquivalents(shortRows),
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
