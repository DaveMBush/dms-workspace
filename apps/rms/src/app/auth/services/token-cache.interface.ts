import { CacheStats } from './cache-stats.interface';

export interface TokenCache {
  get(key: string): string | null;
  set(key: string, value: string, ttl: number): void;
  invalidate(key: string): void;
  clear(): void;
  getStats(): CacheStats;
}
