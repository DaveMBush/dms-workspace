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
    .slice(-2); // Use last 2 distributions only (most recent)

  if (recentRows.length <= 1) {
    return 1;
  }

  // Calculate single interval between last 2 distributions
  const daysBetween =
    Math.abs(recentRows[1].date.valueOf() - recentRows[0].date.valueOf()) /
    (1000 * 60 * 60 * 24);

  // Detect frequency based on interval
  // ≤7 days accounts for weekly distributions with holiday/weekend shifts
  if (daysBetween <= 7) {
    return 52; // weekly
  }

  // >27 and ≤45 days accounts for monthly with holiday variations
  if (daysBetween > 27 && daysBetween <= 45) {
    return 12; // monthly
  }

  // >45 days for quarterly (allows for holiday shifts)
  if (daysBetween > 45) {
    return 4; // quarterly
  }

  return 1; // annual/default
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
