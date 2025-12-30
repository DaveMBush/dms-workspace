import { Injectable, signal } from '@angular/core';

import { CacheStats } from './cache-stats.interface';
import { TokenCache } from './token-cache.interface';
import { TokenCacheEntry } from './token-cache-entry.interface';

/**
 * Token caching service to reduce redundant AWS authentication calls
 * Implements in-memory token cache with automatic invalidation
 */
@Injectable({
  providedIn: 'root',
})
export class TokenCacheService implements TokenCache {
  private cache = new Map<string, TokenCacheEntry>();
  private readonly defaultTtl = 30 * 60 * 1000; // 30 minutes in milliseconds

  // Metrics tracking
  private readonly stats = {
    hits: signal(0),
    misses: signal(0),
  };

  /**
   * Get cached token value
   */
  get(key: string): string | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses.update(function updateMisses(misses) {
        return misses + 1;
      });
      return null;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.misses.update(function updateMisses(misses) {
        return misses + 1;
      });
      return null;
    }

    this.stats.hits.update(function updateHits(hits) {
      return hits + 1;
    });
    return entry.value;
  }

  /**
   * Set cached token value with TTL
   */
  set(key: string, value: string, ttl: number = this.defaultTtl): void {
    if (!key || !value) {
      return;
    }

    const entry: TokenCacheEntry = {
      value,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now(),
    };

    this.cache.set(key, entry);

    // Clean up expired entries periodically
    this.cleanupExpiredEntries();
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
    this.stats.hits.set(0);
    this.stats.misses.set(0);
  }

  /**
   * Get cache performance statistics
   */
  getStats(): CacheStats {
    const hits = this.stats.hits();
    const misses = this.stats.misses();
    const totalRequests = hits + misses;
    const hitRate = totalRequests > 0 ? hits / totalRequests : 0;

    return {
      hits,
      misses,
      hitRate,
      totalRequests,
      cacheSize: this.cache.size,
    };
  }

  /**
   * Check if token entry is near expiry (within 5 minutes)
   */
  isTokenNearExpiry(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return true;
    }

    const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    return entry.expiresAt - Date.now() < bufferTime;
  }

  /**
   * Get remaining TTL for cache entry in milliseconds
   */
  getRemainingTtl(key: string): number {
    const entry = this.cache.get(key);
    if (!entry) {
      return 0;
    }

    return Math.max(0, entry.expiresAt - Date.now());
  }

  /**
   * Check if cache entry has expired
   */
  private isExpired(entry: TokenCacheEntry): boolean {
    return Date.now() >= entry.expiresAt;
  }

  /**
   * Clean up expired entries to prevent memory leaks
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}
