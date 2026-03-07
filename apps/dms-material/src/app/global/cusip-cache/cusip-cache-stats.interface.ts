export interface CusipCacheStats {
  totalEntries: number;
  entriesBySource: Record<string, number>;
  oldestEntry: string | null;
  newestEntry: string | null;
  recentlyAdded: Array<{
    cusip: string;
    symbol: string;
    source: string;
    resolvedAt: string | null;
  }>;
  timestamp: string;
}
