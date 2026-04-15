import { logger } from '../../../../utils/structured-logger';
import {
  fetchDistributionData,
  type ProcessedRow,
} from '../../common/distribution-api.function';
import { fetchDividendHistory } from '../../common/dividend-history.service';

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

function intervalToDistributionsPerYear(daysBetween: number): number {
  // ≤7 days accounts for weekly distributions with holiday/weekend shifts
  if (daysBetween <= 7) {
    return 52; // weekly
  }

  // >27 and ≤45 days accounts for monthly with holiday variations
  if (daysBetween > 27 && daysBetween <= 45) {
    return 12; // monthly
  }

  // >45 and ≤180 days for quarterly (allows for holiday shifts in ~90-day intervals)
  if (daysBetween > 45 && daysBetween <= 180) {
    return 4; // quarterly
  }

  return 1; // annual/default (>180 days, ~365-day intervals)
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
    // Fallback: use the 2 nearest future ex-dates to infer cadence
    const futureRows = rows
      .filter(function filterFutureDistributions(row: ProcessedRow): boolean {
        return row.date >= today;
      })
      .sort(function sortAscending(a: ProcessedRow, b: ProcessedRow): number {
        return a.date.valueOf() - b.date.valueOf();
      })
      .slice(0, 2);

    // If we have 1 past row and 1 future row, use them as the interval pair
    if (recentRows.length === 1 && futureRows.length === 1) {
      const crossDaysBetween =
        (futureRows[0].date.valueOf() - recentRows[0].date.valueOf()) /
        (1000 * 60 * 60 * 24);
      return intervalToDistributionsPerYear(crossDaysBetween);
    }

    /* v8 ignore start -- unreachable: rows.length>1 with ≤1 past + <2 future is logically impossible */
    if (futureRows.length < 2) {
      return 1;
    }
    /* v8 ignore stop */

    const futureDaysBetween =
      (futureRows[1].date.valueOf() - futureRows[0].date.valueOf()) /
      (1000 * 60 * 60 * 24);

    return intervalToDistributionsPerYear(futureDaysBetween);
  }

  // Calculate single interval between last 2 past distributions
  const daysBetween =
    Math.abs(recentRows[1].date.valueOf() - recentRows[0].date.valueOf()) /
    (1000 * 60 * 60 * 24);

  return intervalToDistributionsPerYear(daysBetween);
}

export async function getDistributions(
  symbol: string
): Promise<DistributionResult | undefined> {
  try {
    let rows = await fetchDividendHistory(symbol);

    if (rows.length === 0) {
      logger.warn(
        `fetchDividendHistory returned no data for ${symbol}, falling back to Yahoo Finance`,
        { symbol }
      );
      rows = await fetchDistributionData(symbol);
    }

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
