import { prisma } from '../prisma/prisma-client';
import { calculateVolatility } from './volatility-calculation.function';

const FIVE_YEARS_MS = 5 * 365 * 24 * 60 * 60 * 1000;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

interface DistributionRecord {
  amount: number;
  date: Date;
}

function buildFiveYearsAgo(now: Date): Date {
  return new Date(now.getTime() - FIVE_YEARS_MS);
}

function buildOneYearAgo(now: Date): Date {
  return new Date(now.getTime() - ONE_YEAR_MS);
}

function filterRecordsSince(
  records: DistributionRecord[],
  threshold: Date
): DistributionRecord[] {
  return records.filter(function isSinceThreshold(record) {
    return record.date >= threshold;
  });
}

function mapAmounts(records: DistributionRecord[]): number[] {
  return records.map(function getAmount(record) {
    return record.amount;
  });
}

export async function recalculateUniverseVolatility(
  universeId: string
): Promise<void> {
  const now = new Date();
  const fiveYearsAgo = buildFiveYearsAgo(now);
  const oneYearAgo = buildOneYearAgo(now);

  const deposits = await prisma.divDeposits.findMany({
    where: {
      universeId,
      deletedAt: null,
      date: { gte: fiveYearsAgo },
    },
    orderBy: { date: 'asc' },
    select: {
      amount: true,
      date: true,
    },
  });

  const oneYearDeposits = filterRecordsSince(deposits, oneYearAgo);
  const volatilityLong = calculateVolatility(mapAmounts(deposits));
  const volatilityShort = calculateVolatility(mapAmounts(oneYearDeposits));

  await prisma.universe.update({
    where: { id: universeId },
    data: {
      volatility_long: volatilityLong,
      volatility_short: volatilityShort,
      volatility_calculated_at: now,
    },
  });
}
