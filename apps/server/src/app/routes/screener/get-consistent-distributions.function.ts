import {
  fetchDistributionData,
  type ProcessedRow,
} from '../common/distribution-api.function';

function filterPastDistributions(rows: ProcessedRow[]): ProcessedRow[] {
  const today = new Date();
  return rows.filter(function isPastDistribution(row: ProcessedRow): boolean {
    return row.date <= today;
  });
}

function removeDuplicateDates(rows: ProcessedRow[]): ProcessedRow[] {
  const seen = new Set<number>();
  const unique: ProcessedRow[] = [];

  for (const row of rows) {
    const dateValue = row.date.valueOf();
    if (!seen.has(dateValue)) {
      seen.add(dateValue);
      unique.push(row);
    }
  }

  return unique;
}

function isProperlyOrdered(rows: ProcessedRow[]): boolean {
  if (rows.length < 2) {
    return true; // Single row or empty is considered ordered
  }

  for (let i = 0; i < rows.length - 1; i++) {
    if (rows[i].date >= rows[i + 1].date) {
      return false; // Found out-of-order pair
    }
  }

  return true;
}

function hasDecliningTrend(recentExDates: ProcessedRow[]): boolean {
  if (recentExDates.length < 3) {
    return false; // Not enough data to determine trend
  }

  const currentDistribution = recentExDates[2].amount; // Most recent
  const previousDistribution = recentExDates[1].amount; // Middle
  const distributionBeforePrevious = recentExDates[0].amount; // Oldest

  return (
    currentDistribution < previousDistribution &&
    previousDistribution < distributionBeforePrevious
  );
}

export async function getConsistentDistributions(
  symbol: string
): Promise<boolean> {
  const rows = await fetchDistributionData(symbol);

  if (rows.length === 0) {
    return false;
  }

  // Filter to only include past distributions (exclude future dividends)
  const pastDistributions = filterPastDistributions(rows);

  // Remove duplicate dates to ensure we're analyzing unique distributions
  const uniqueDistributions = removeDuplicateDates(pastDistributions);

  if (uniqueDistributions.length < 3) {
    return true; // Not enough unique past data to determine trend
  }

  // Validate that distributions are properly ordered (oldest to newest)
  if (!isProperlyOrdered(uniqueDistributions)) {
    return false; // Cannot determine trend with invalid data ordering
  }

  const recentExDates = uniqueDistributions.slice(-3);

  // eslint-disable-next-line @typescript-eslint/return-await -- Async function returning boolean value
  return !hasDecliningTrend(recentExDates);
}
