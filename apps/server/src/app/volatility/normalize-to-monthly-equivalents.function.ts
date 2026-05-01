import type { ProcessedRow } from '../routes/common/distribution-api.function';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_MONTH = 30;
const MIN_MULTIPLIER = 1;
const MAX_MULTIPLIER = 12;

export function normalizeToMonthlyEquivalents(
  history: ProcessedRow[]
): number[] {
  return history.map(function normalizeRow(row, index) {
    if (index === 0) {
      return row.amount;
    }
    const intervalDays =
      (row.date.getTime() - history[index - 1].date.getTime()) / MS_PER_DAY;
    const multiplier = Math.min(
      MAX_MULTIPLIER,
      Math.max(MIN_MULTIPLIER, Math.round(intervalDays / DAYS_PER_MONTH))
    );
    return row.amount / multiplier;
  });
}
