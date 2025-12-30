import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { TokenCacheService } from './services/token-cache.service';
import { SessionManagerService } from './services/session-manager.service';
import { TokenRefreshService } from './services/token-refresh.service';
import { fetchAuthSession } from '@aws-amplify/auth';

import { vi, MockedFunction } from 'vitest';

// Mock AWS Amplify
vi.mock('@aws-amplify/auth', () => ({
  fetchAuthSession: vi.fn(),
  getCurrentUser: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const mockFetchAuthSession = fetchAuthSession as MockedFunction<
  typeof fetchAuthSession
>;

describe('AuthService Performance Benchmarks', () => {
  let authService: AuthService;
  let tokenCacheService: TokenCacheService;

  // Mock session data
  const mockSessionData = {
    tokens: {
      accessToken: {
        toString: () => 'mock-access-token-12345',
        payload: {
          exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        },
      },
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService,
        TokenCacheService,
        {
          provide: SessionManagerService,
          useValue: {
            startSession: vi.fn(),
            expireSession: vi.fn(),
            isActive: vi.fn().mockReturnValue(true),
            getSessionStats: vi.fn().mockReturnValue({ status: 'active' }),
            sessionEvents: {
              pipe: vi.fn().mockReturnValue({ subscribe: vi.fn() }),
            },
            isRememberMeSession: vi.fn().mockReturnValue(false),
          },
        },
        {
          provide: TokenRefreshService,
          useValue: {
            refreshToken: vi.fn().mockResolvedValue(true),
            getTokenExpiration: vi.fn().mockReturnValue(Date.now() + 3600000),
            isTokenNearExpiry: vi.fn().mockReturnValue(false),
          },
        },
      ],
    });

    authService = TestBed.inject(AuthService);
    tokenCacheService = TestBed.inject(TokenCacheService);

    // Reset mocks and cache
    vi.clearAllMocks();
    tokenCacheService.clear();

    // Setup default mock response
    mockFetchAuthSession.mockResolvedValue(mockSessionData as any);
  });

  describe('Token Retrieval Performance', () => {
    it('should demonstrate performance improvement with caching', async () => {
      const iterations = 100;

      // Simulate AWS delay (original problem: 6 seconds, we'll use 60ms for testing)
      const awsDelay = 60; // milliseconds
      mockFetchAuthSession.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockSessionData as any), awsDelay);
          })
      );

      // Benchmark without cache (first call)
      const startTimeUncached = performance.now();
      await authService.getAccessToken();
      const uncachedTime = performance.now() - startTimeUncached;

      // Benchmark with cache (subsequent calls)
      const cachedTimes: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await authService.getAccessToken();
        const endTime = performance.now();
        cachedTimes.push(endTime - startTime);
      }

      const averageCachedTime =
        cachedTimes.reduce((sum, time) => sum + time, 0) / iterations;
      const performanceImprovement =
        ((uncachedTime - averageCachedTime) / uncachedTime) * 100;

      // Performance assertions
      expect(uncachedTime).toBeGreaterThan(awsDelay - 10); // Should include AWS delay
      expect(averageCachedTime).toBeLessThan(10); // Cache hits should be under 10ms
      expect(performanceImprovement).toBeGreaterThan(80); // Should be >80% improvement

      // Verify cache is working
      const stats = tokenCacheService.getStats();
      expect(stats.hits).toBe(iterations);
      expect(stats.misses).toBe(1); // Only the first call should be a miss
      expect(stats.hitRate).toBeGreaterThan(0.9); // >90% hit rate

      // Only one AWS call should have been made
      expect(mockFetchAuthSession).toHaveBeenCalledTimes(1);

      console.log(`Performance Benchmark Results:
        - Uncached call time: ${uncachedTime.toFixed(2)}ms
        - Average cached call time: ${averageCachedTime.toFixed(2)}ms
        - Performance improvement: ${performanceImprovement.toFixed(1)}%
        - Cache hit rate: ${(stats.hitRate * 100).toFixed(1)}%
        - AWS API calls: ${mockFetchAuthSession.mock.calls.length}`);
    });

    it('should meet performance targets (<500ms for account operations)', async () => {
      // Simulate real-world scenario with multiple concurrent requests
      const concurrentRequests = 10;

      // First request to warm the cache
      await authService.getAccessToken();

      // Measure concurrent cache hits (simulating account operations)
      const startTime = performance.now();
      const promises = Array.from({ length: concurrentRequests }, () =>
        authService.getAccessToken()
      );

      await Promise.all(promises);
      const totalTime = performance.now() - startTime;
      const averageTime = totalTime / concurrentRequests;

      // Performance targets from story
      expect(totalTime).toBeLessThan(500); // Total time under 500ms
      expect(averageTime).toBeLessThan(50); // Average per request under 50ms

      const stats = tokenCacheService.getStats();
      expect(stats.hitRate).toBeGreaterThan(0.9); // >90% hit rate target

      console.log(`Account Operations Performance:
        - Total time for ${concurrentRequests} operations: ${totalTime.toFixed(
        2
      )}ms
        - Average time per operation: ${averageTime.toFixed(2)}ms
        - Cache hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
    });

    it('should demonstrate interceptor performance improvement', async () => {
      // Simulate interceptor calling getAccessToken repeatedly
      const requestCount = 50;

      // Simulate high-frequency requests like an interceptor would make
      const requestTimes: number[] = [];

      for (let i = 0; i < requestCount; i++) {
        const startTime = performance.now();
        const token = await authService.getAccessToken();
        const endTime = performance.now();

        expect(token).toBeTruthy();
        requestTimes.push(endTime - startTime);
      }

      const averageRequestTime =
        requestTimes.reduce((sum, time) => sum + time, 0) / requestCount;
      const maxRequestTime = Math.max(...requestTimes);

      // Interceptor performance targets
      expect(averageRequestTime).toBeLessThan(10); // <10ms per request target
      expect(maxRequestTime).toBeLessThan(20); // Even max time should be reasonable

      const stats = tokenCacheService.getStats();
      expect(stats.hits).toBe(requestCount - 1); // All but first should be hits

      console.log(`Interceptor Performance Simulation:
        - Average request time: ${averageRequestTime.toFixed(2)}ms
        - Max request time: ${maxRequestTime.toFixed(2)}ms
        - Cache efficiency: ${(
          (stats.hits / stats.totalRequests) *
          100
        ).toFixed(1)}%`);
    });
  });

  describe('Cache Behavior Under Load', () => {
    it('should handle concurrent access without performance degradation', async () => {
      const concurrentRequests = 10;

      // First request to warm the cache
      await authService.getAccessToken();

      const startTime = performance.now();

      // Make concurrent requests (these should all be cache hits)
      const promises = Array.from({ length: concurrentRequests }, () =>
        authService.getAccessToken()
      );

      await Promise.all(promises);
      const totalTime = performance.now() - startTime;

      const averageTimePerRequest = totalTime / concurrentRequests;

      // Performance should remain good under concurrent load
      expect(averageTimePerRequest).toBeLessThan(15); // Even under load, keep <15ms avg

      const stats = tokenCacheService.getStats();
      // Should have high hit rate (all but first request should be hits)
      expect(stats.hitRate).toBeGreaterThan(0.8); // Should maintain >80% hit rate

      console.log(`Concurrent Load Test:
        - ${concurrentRequests} concurrent requests
        - Total time: ${totalTime.toFixed(2)}ms
        - Average time per request: ${averageTimePerRequest.toFixed(2)}ms
        - Cache hit rate: ${(stats.hitRate * 100).toFixed(1)}%
        - Total requests: ${stats.totalRequests}
        - Cache hits: ${stats.hits}
        - Cache misses: ${stats.misses}`);
    });
  });

  describe('Memory Efficiency', () => {
    it('should maintain reasonable memory usage with cache cleanup', async () => {
      const initialStats = tokenCacheService.getStats();
      expect(initialStats.cacheSize).toBe(0);

      // Fill cache with tokens
      for (let i = 0; i < 10; i++) {
        tokenCacheService.set(`test-key-${i}`, `test-token-${i}`, 1000); // 1 second TTL
      }

      let stats = tokenCacheService.getStats();
      expect(stats.cacheSize).toBe(10);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Trigger cleanup by accessing cache
      await authService.getAccessToken();

      stats = tokenCacheService.getStats();
      expect(stats.cacheSize).toBe(1); // Should only have the fresh token

      console.log(`Memory Management Test:
        - Cache cleaned up expired entries automatically
        - Final cache size: ${stats.cacheSize}`);
    });
  });
});
