/* eslint-disable @smarttools/one-exported-item-per-file -- Utility file with related distribution API functions */

// Yahoo Finance dividend retrieval has been removed (Story 45.1).
// Dividend data is now sourced exclusively from dividendhistory.org.
// This stub is retained for structural compatibility with callers and tests.

export interface ProcessedRow {
  amount: number;
  date: Date;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- stub retained for compatibility
export async function fetchDistributionData(
  symbol: string
): Promise<ProcessedRow[]> {
  return [];
}
