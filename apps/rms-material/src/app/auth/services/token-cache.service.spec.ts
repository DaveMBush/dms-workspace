import { TestBed } from '@angular/core/testing';
import { TokenCacheService } from './token-cache.service';

describe('TokenCacheService', () => {
  let service: TokenCacheService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TokenCacheService);
  });

  afterEach(() => {
    service.clear();
  });

  describe('Basic Cache Operations', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should return null for non-existent key', () => {
      const result = service.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should store and retrieve token', () => {
      const key = 'test-key';
      const token = 'test-token';
      const ttl = 60000; // 1 minute

      service.set(key, token, ttl);
      const result = service.get(key);

      expect(result).toBe(token);
    });

    it('should use default TTL when not specified', () => {
      const key = 'test-key';
      const token = 'test-token';

      service.set(key, token);
      const result = service.get(key);

      expect(result).toBe(token);
    });

    it('should not store empty key or value', () => {
      service.set('', 'token');
      service.set('key', '');

      expect(service.get('')).toBeNull();
      expect(service.get('key')).toBeNull();
    });
  });

  describe('Cache Expiration', () => {
    it('should return null for expired token', async () => {
      const key = 'expired-key';
      const token = 'expired-token';
      const shortTtl = 10; // 10 milliseconds

      service.set(key, token, shortTtl);

      // Wait for token to expire
      await new Promise((resolve) => setTimeout(resolve, 15));

      const result = service.get(key);
      expect(result).toBeNull();
    });

    it('should return valid token before expiration', () => {
      const key = 'valid-key';
      const token = 'valid-token';
      const longTtl = 60000; // 1 minute

      service.set(key, token, longTtl);
      const result = service.get(key);

      expect(result).toBe(token);
    });

    it('should detect when token is near expiry', () => {
      const key = 'near-expiry-key';
      const token = 'near-expiry-token';
      const shortTtl = 4 * 60 * 1000; // 4 minutes (less than 5 minute buffer)

      service.set(key, token, shortTtl);
      const isNearExpiry = service.isTokenNearExpiry(key);

      expect(isNearExpiry).toBe(true);
    });

    it('should not detect near expiry for long-lived tokens', () => {
      const key = 'long-lived-key';
      const token = 'long-lived-token';
      const longTtl = 30 * 60 * 1000; // 30 minutes

      service.set(key, token, longTtl);
      const isNearExpiry = service.isTokenNearExpiry(key);

      expect(isNearExpiry).toBe(false);
    });

    it('should return true for near expiry on non-existent key', () => {
      const isNearExpiry = service.isTokenNearExpiry('non-existent');
      expect(isNearExpiry).toBe(true);
    });
  });

  describe('Cache Management', () => {
    it('should invalidate specific cache entry', () => {
      const key1 = 'key1';
      const key2 = 'key2';
      const token1 = 'token1';
      const token2 = 'token2';

      service.set(key1, token1);
      service.set(key2, token2);

      service.invalidate(key1);

      expect(service.get(key1)).toBeNull();
      expect(service.get(key2)).toBe(token2);
    });

    it('should clear all cache entries', () => {
      const key1 = 'key1';
      const key2 = 'key2';
      const token1 = 'token1';
      const token2 = 'token2';

      service.set(key1, token1);
      service.set(key2, token2);

      service.clear();

      expect(service.get(key1)).toBeNull();
      expect(service.get(key2)).toBeNull();
    });

    it('should get remaining TTL for cache entry', () => {
      const key = 'ttl-key';
      const token = 'ttl-token';
      const ttl = 60000; // 1 minute

      service.set(key, token, ttl);
      const remainingTtl = service.getRemainingTtl(key);

      expect(remainingTtl).toBeGreaterThan(50000); // Should be close to 1 minute
      expect(remainingTtl).toBeLessThanOrEqual(ttl);
    });

    it('should return 0 TTL for non-existent key', () => {
      const remainingTtl = service.getRemainingTtl('non-existent');
      expect(remainingTtl).toBe(0);
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache hits and misses', () => {
      const key = 'stats-key';
      const token = 'stats-token';

      // Initial stats
      let stats = service.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.totalRequests).toBe(0);
      expect(stats.hitRate).toBe(0);

      // Cache miss
      service.get('non-existent');
      stats = service.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(1);
      expect(stats.totalRequests).toBe(1);
      expect(stats.hitRate).toBe(0);

      // Cache set and hit
      service.set(key, token);
      service.get(key);
      stats = service.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.totalRequests).toBe(2);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should track cache size', () => {
      let stats = service.getStats();
      expect(stats.cacheSize).toBe(0);

      service.set('key1', 'token1');
      service.set('key2', 'token2');

      stats = service.getStats();
      expect(stats.cacheSize).toBe(2);
    });

    it('should reset statistics when cleared', () => {
      service.set('key', 'token');
      service.get('key');
      service.get('non-existent');

      let stats = service.getStats();
      expect(stats.hits).toBeGreaterThan(0);
      expect(stats.misses).toBeGreaterThan(0);

      service.clear();

      stats = service.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.totalRequests).toBe(0);
      expect(stats.hitRate).toBe(0);
      expect(stats.cacheSize).toBe(0);
    });
  });

  describe('Concurrent Access Safety', () => {
    it('should handle concurrent read operations', async () => {
      const key = 'concurrent-key';
      const token = 'concurrent-token';

      service.set(key, token);

      // Simulate concurrent reads
      const promises = Array.from({ length: 10 }, () =>
        Promise.resolve(service.get(key))
      );

      const results = await Promise.all(promises);

      // All reads should return the same token
      results.forEach((result) => {
        expect(result).toBe(token);
      });
    });

    it('should handle concurrent write operations', () => {
      const key = 'write-key';
      const tokens = ['token1', 'token2', 'token3', 'token4', 'token5'];

      // Simulate concurrent writes
      tokens.forEach((token, index) => {
        service.set(`${key}-${index}`, token);
      });

      // Verify all tokens were stored
      tokens.forEach((token, index) => {
        expect(service.get(`${key}-${index}`)).toBe(token);
      });
    });

    it('should handle mixed concurrent operations', async () => {
      const key = 'mixed-key';
      const token = 'mixed-token';

      service.set(key, token);

      // Mix of concurrent operations
      const operations = [
        function getKey() {
          return service.get(key);
        },
        function setKey2() {
          service.set(`${key}-2`, `${token}-2`);
          return undefined;
        },
        function getKeyAgain() {
          return service.get(key);
        },
        function invalidateInvalid() {
          service.invalidate(`${key}-invalid`);
          return undefined;
        },
        function getKeyFinal() {
          return service.get(key);
        },
      ];

      const results = await Promise.all(
        operations.map(function mapOperations(op) {
          const result = op();
          return Promise.resolve(result);
        })
      );

      // Verify the get operations returned correct values
      expect(results[0]).toBe(token);
      expect(results[2]).toBe(token);
      expect(results[4]).toBe(token);
    });
  });

  describe('Memory Management', () => {
    it('should clean up expired entries', async () => {
      const key1 = 'cleanup-key1';
      const key2 = 'cleanup-key2';
      const token1 = 'cleanup-token1';
      const token2 = 'cleanup-token2';
      const shortTtl = 10; // 10 milliseconds
      const longTtl = 60000; // 1 minute

      service.set(key1, token1, shortTtl);
      service.set(key2, token2, longTtl);

      let stats = service.getStats();
      expect(stats.cacheSize).toBe(2);

      // Wait for first token to expire
      await new Promise((resolve) => setTimeout(resolve, 15));

      // Access cache to trigger cleanup
      service.get(key1); // This should trigger cleanup

      stats = service.getStats();
      expect(stats.cacheSize).toBe(1);
      expect(service.get(key2)).toBe(token2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined keys gracefully', () => {
      expect(() => service.get(null as any)).not.toThrow();
      expect(() => service.get(undefined as any)).not.toThrow();
      expect(() => service.set(null as any, 'token')).not.toThrow();
      expect(() => service.set(undefined as any, 'token')).not.toThrow();
    });

    it('should handle large number of cache entries', () => {
      const entryCount = 1000;

      // Add many entries
      for (let i = 0; i < entryCount; i++) {
        service.set(`key-${i}`, `token-${i}`);
      }

      const stats = service.getStats();
      expect(stats.cacheSize).toBe(entryCount);

      // Verify random entries
      expect(service.get('key-100')).toBe('token-100');
      expect(service.get('key-500')).toBe('token-500');
      expect(service.get('key-999')).toBe('token-999');
    });
  });
});
