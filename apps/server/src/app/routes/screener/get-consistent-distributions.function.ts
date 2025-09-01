import {
  fetchDistributionData,
  type ProcessedRow,
} from '../common/distribution-api.function';

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

  const recentExDates = rows.slice(-3);

  if (recentExDates.length < 3) {
    return true; // Not enough data to determine trend
  }

  return !hasDecliningTrend(recentExDates);
}
