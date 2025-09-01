import { Universe } from '../../store/universe/universe.interface';

/**
 * Returns true if the row should be dimmed: expired or most_recent_sell_date is today or previous trading day.
 */
export function isRowDimmed(row: Universe): boolean {
  if (row.expired) {
    return true;
  }
  if (row.most_recent_sell_date === null) {
    return false;
  }
  const today = new Date();
  if (row.most_recent_sell_date.length < 10) {
    return false;
  }
  const mostRecent = new Date(row.most_recent_sell_date);
  // Normalize to yyyy-mm-dd
  function toYMD(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
  if (toYMD(mostRecent) === toYMD(today)) {
    return true;
  }
  // Previous trading day logic
  const prev = new Date(today);
  prev.setDate(today.getDate() - 1);
  // If today is Monday, previous trading day is Friday
  if (today.getDay() === 1) {
    prev.setDate(today.getDate() - 3);
  }
  return toYMD(mostRecent) === toYMD(prev);
}
