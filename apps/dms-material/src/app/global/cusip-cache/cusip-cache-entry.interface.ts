export interface CusipCacheEntry {
  id: string;
  cusip: string;
  symbol: string;
  source: string;
  resolvedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
