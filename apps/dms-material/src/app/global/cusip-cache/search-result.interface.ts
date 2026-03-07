import { CusipCacheEntry } from './cusip-cache-entry.interface';

export interface SearchResult {
  entries: CusipCacheEntry[];
  count: number;
}
