import { FidelityCsvRow } from './fidelity-csv-row.interface';

/**
 * Returns true if the CSV row is a "REVERSE SPLIT R/S TO" row (the old-share removal side
 * of a Fidelity reverse-split pair).
 *
 * These rows carry a negative quantity representing the old share count that was retired.
 * They should be skipped without producing an unknown-transaction warning because they
 * contain no new information beyond what the matching FROM row already provides.
 *
 * Both web and desktop formats are handled:
 *   Web format:     "R/S TO" text is in `row.description`
 *   Desktop format: "R/S TO" text is in `row.action` (the "Description" column)
 */
export function isSplitToRow(row: FidelityCsvRow): boolean {
  return (
    (row.description?.toUpperCase().includes('R/S TO') ||
      row.action?.toUpperCase().includes('R/S TO')) ??
    false
  );
}
