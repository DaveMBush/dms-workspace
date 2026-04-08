import { FidelityCsvRow } from './fidelity-csv-row.interface';

/**
 * Returns true if the CSV row describes a stock split transaction.
 * Detection is case-insensitive and checks both the action and description fields
 * to handle both Fidelity web and desktop export formats.
 *
 * Web format:  split text is in `row.description` (e.g. "REVERSE SPLIT R/S FROM …")
 * Desktop format: split text is in `row.action`  (the "Description" column)
 */
export function isSplitRow(row: FidelityCsvRow): boolean {
  return (
    (row.description?.toUpperCase().includes('SPLIT') ||
      row.action?.toUpperCase().includes('SPLIT')) ??
    false
  );
}
