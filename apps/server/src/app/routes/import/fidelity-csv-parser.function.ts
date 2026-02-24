import { FidelityCsvRow } from './fidelity-csv-row.interface';

/**
 * Parses a Fidelity CSV transaction export string into structured rows.
 *
 * @param csv - Raw CSV content from Fidelity export
 * @returns Array of parsed CSV rows
 * @throws Error if CSV format is invalid
 *
 * @remarks
 * This is a stub for TDD RED phase. Implementation will be added in Story AR.1.
 */
export function parseFidelityCsv(csv: string): FidelityCsvRow[] {
  throw new Error(`Not implemented - TDD RED phase stub: ${csv.length}`);
}
