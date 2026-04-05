import { FidelityCsvRow } from './fidelity-csv-row.interface';

/**
 * Returns true if the CSV row describes a stock split transaction.
 * Detection is case-insensitive: any description containing "SPLIT" classifies the row as a split.
 *
 * Example split description: "REVERSE SPLIT R/S FROM 691543102#REOR M005168075001"
 */
export function isSplitRow(row: FidelityCsvRow): boolean {
  return row.description?.toUpperCase().includes('SPLIT') ?? false;
}
