import { FidelityCsvRow } from './fidelity-csv-row.interface';

/**
 * Returns true if the CSV row describes an "in lieu of fractional share" cash payout.
 * Detection is case-insensitive: any description containing "IN LIEU OF FRX SHARE" classifies the row.
 *
 * Example in-lieu description: "IN LIEU OF FRX SHARE EU PAYOUT..."
 */
export function isInLieuRow(row: FidelityCsvRow): boolean {
  return row.description?.toUpperCase().includes('IN LIEU OF FRX SHARE') ?? false;
}
