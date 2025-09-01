import {
  fetchDistributionData,
  type ProcessedRow,
} from '../../common/distribution-api.function';

interface DistributionResult {
  distribution: number;
  ex_date: Date;
  distributions_per_year: number;
}

function findNextOrRecentDistribution(
  rows: ProcessedRow[],
  today: Date
): ProcessedRow {
  const nextOrRecent = rows.find(function findNextDistribution(
    row: ProcessedRow
  ): boolean {
    return row.date >= today;
  });

  if (nextOrRecent) {
    return nextOrRecent;
  }

  return rows[rows.length - 1]; // most recent past
}

function calculateDistributionsPerYear(
  rows: ProcessedRow[],
  today: Date
): number {
  if (rows.length <= 1) {
    return 1;
  }

  const recentRows = rows
    .filter(function filterPastDistributions(row: ProcessedRow): boolean {
      return row.date < today;
    })
    .reverse() // oldest to newest
    .slice(-4);

  if (recentRows.length <= 1) {
    return 1;
  }

  const intervals: number[] = [];
  for (let i = 1; i < recentRows.length; i++) {
    intervals.push(
      (recentRows[i - 1].date.valueOf() - recentRows[i].date.valueOf()) /
        (1000 * 60 * 60 * 24)
    );
  }

  const avgInterval =
    intervals.reduce(function sumIntervals(a: number, b: number): number {
      return a + b;
    }, 0) / intervals.length;

  if (avgInterval < 40) {
    return 12;
  }

  if (avgInterval < 120) {
    return 4;
  }

  return 1;
}

export async function getDistributions(
  symbol: string
): Promise<DistributionResult | undefined> {
  try {
    const rows = await fetchDistributionData(symbol);

    if (rows.length === 0) {
      return undefined;
    }

    const today = new Date();
    const nextOrRecent = findNextOrRecentDistribution(rows, today);
    const perYear = calculateDistributionsPerYear(rows, today);

    return {
      distribution: nextOrRecent.amount,
      ex_date: nextOrRecent.date,
      distributions_per_year: perYear,
    };
  } catch {
    return {
      distribution: 0,
      ex_date: new Date(),
      distributions_per_year: 0,
    };
  }
}
