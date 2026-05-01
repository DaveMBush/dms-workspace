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

function extractWindowedAmounts(
  history: ProcessedRow[],
  now: Date
): { longAmounts: number[]; shortAmounts: number[] } {
  const fiveYearsAgo = buildFiveYearsAgo(now);
  const oneYearAgo = buildOneYearAgo(now);
  const normalizedAmounts = normalizeToMonthlyEquivalents(history);
  const pairedHistory = history.map(function pairRowWithAmount(row, index) {
    return { row, amount: normalizedAmounts[index] };
  });
  return {
    longAmounts: pairedHistory
      .filter(function isInLongWindow({ row }) {
        return row.date >= fiveYearsAgo;
      })
      .map(function extractLongAmount({ amount }) {
        return amount;
      }),
    shortAmounts: pairedHistory
      .filter(function isInShortWindow({ row }) {
        return row.date >= oneYearAgo;
      })
      .map(function extractShortAmount({ amount }) {
        return amount;
      }),
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
