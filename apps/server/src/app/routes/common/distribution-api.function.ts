/* eslint-disable @smarttools/one-exported-item-per-file -- Utility file with related distribution API functions */

// Yahoo Finance dividend retrieval has been removed (Story 45.1).
// Dividend data is now sourced exclusively from dividendhistory.net.
// This stub is retained for structural compatibility with callers and tests.

export interface ProcessedRow {
  amount: number;
  date: Date;
}

// eslint-disable-next-line @typescript-eslint/require-await -- stub returns empty array; no async operations needed
export async function fetchDistributionData(
  _: string
): Promise<ProcessedRow[]> {
  return [];
}
