import { FidelityCsvRow } from './fidelity-csv-row.interface';

/**
 * Returns true if the CSV row is a "REVERSE SPLIT R/S FROM" row (the new-share receipt side
 * of a Fidelity reverse-split pair).
 *
 * Both web and desktop formats are handled:
 *   Web format:     "R/S FROM" text is in `row.description`
 *   Desktop format: "R/S FROM" text is in `row.action` (the "Description" column)
 */
export function isSplitFromRow(row: FidelityCsvRow): boolean {
  return (
    (row.description?.toUpperCase().includes('R/S FROM') ||
      row.action?.toUpperCase().includes('R/S FROM')) ??
    false
  );
}
