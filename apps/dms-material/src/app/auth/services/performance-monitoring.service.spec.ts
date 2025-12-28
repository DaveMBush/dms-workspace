import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { vi } from 'vitest';

import { PerformanceLoggingService } from '../../shared/services/performance-logging.service';
import { PerformanceMonitoringService } from './performance-monitoring.service';
import { TokenCacheService } from './token-cache.service';

describe('PerformanceMonitoringService', () => {
  let service: PerformanceMonitoringService;
  let mockPerformanceLogging: PerformanceLoggingService;
  let mockTokenCache: TokenCacheService;

  beforeEach(() => {
    mockPerformanceLogging = {
      getMetrics: vi.fn().mockReturnValue([]),
      getMetricsForOperation: vi.fn().mockReturnValue([]),
      getStatistics: vi.fn().mockReturnValue({}),
      getAllAlerts: vi.fn().mockReturnValue([]),
    } as unknown as PerformanceLoggingService;

    mockTokenCache = {
      getStats: vi.fn().mockReturnValue({
        cacheSize: 10,
        hitRate: 0.85,
        totalRequests: 100,
      }),
    } as unknown as TokenCacheService;

    TestBed.configureTestingModule({
      providers: [
        {
          provide: PerformanceLoggingService,
          useValue: mockPerformanceLogging,
        },
        { provide: TokenCacheService, useValue: mockTokenCache },
      ],
    });

    service = TestBed.inject(PerformanceMonitoringService);
  });

  describe('getCurrentDashboardData', () => {
    it('should generate dashboard data with auth metrics', () => {
      const mockLoginMetrics = [
        { duration: 120, success: true },
        { duration: 80, success: true },
        { duration: 200, success: false },
      ];

      const mockRefreshMetrics = [
        { duration: 30, success: true },
        { duration: 45, success: true },
      ];

      mockPerformanceLogging.getMetricsForOperation.mockImplementation(
        (operation: string) => {
          if (operation === 'auth-login') {
            return mockLoginMetrics;
          }
          if (operation === 'auth-refresh') {
            return mockRefreshMetrics;
          }
          if (operation === 'auth-general') {
            return [];
          }
          return [];
        }
      );

      const dashboardData = service.getCurrentDashboardData();

      expect(dashboardData.authMetrics).toEqual({
        averageLoginTime: expect.closeTo(133.33, 2), // (120+80+200)/3
        averageRefreshTime: 37.5, // (30+45)/2
        averageInterceptorTime: 0,
        successRate: 80, // 4 successful out of 5
        requestVolume: 5,
        slowRequestCount: 2, // >100ms
      });
    });

    it('should generate cache metrics from token cache stats', () => {
      const mockCacheMetrics = [
        { cacheHit: true, duration: 5 },
        { cacheHit: false, duration: 15 },
        { cacheHit: true, duration: 3 },
      ];

      mockPerformanceLogging.getMetrics.mockReturnValue(mockCacheMetrics);

      const dashboardData = service.getCurrentDashboardData();

      expect(dashboardData.cacheMetrics).toEqual({
        hitRate: expect.closeTo(66.67, 2), // 2 hits out of 3
        missRate: expect.closeTo(33.33, 2), // 1 miss out of 3
        totalRequests: 3,
        averageRetrievalTime: expect.closeTo(7.67, 2), // (5+15+3)/3
        cacheSize: 10,
        evictionCount: 0, // Not tracked in current CacheStats implementation
      });
    });

    it('should generate system metrics', () => {
      const mockAllMetrics = [
        { duration: 100, success: true, timestamp: Date.now() },
        { duration: 200, success: false, timestamp: Date.now() },
        { duration: 150, success: true, timestamp: Date.now() },
      ];

      mockPerformanceLogging.getMetrics.mockReturnValue(mockAllMetrics);

      const dashboardData = service.getCurrentDashboardData();

      expect(dashboardData.systemMetrics).toEqual({
        averageResponseTime: 150, // (100+200+150)/3
        errorRate: expect.closeTo(33.33, 2), // 1 error out of 3
        throughput: expect.closeTo(0.6, 2), // 3 requests in 5-minute window
        activeRequests: 0,
      });
    });

    it('should convert alerts to dashboard format', () => {
      const mockAlerts = [
        {
          type: 'warning' as const,
          message: 'Slow login detected',
          timestamp: 1234567890,
          metric: { operation: 'auth-login', duration: 150 },
        },
      ];

      mockPerformanceLogging.getAllAlerts.mockReturnValue(mockAlerts);

      const dashboardData = service.getCurrentDashboardData();

      expect(dashboardData.alerts).toEqual([
        {
          type: 'warning',
          message: 'Slow login detected',
          timestamp: 1234567890,
          operation: 'auth-login',
          duration: 150,
        },
      ]);
    });
  });

  describe('getDashboardData', () => {
    it('should return observable that emits dashboard data', async () => {
      // Set up a timer mock to control the interval
      vi.useFakeTimers();

      const dashboardStream = service.getDashboardData();
      const dataPromise = firstValueFrom(dashboardStream);

      // Advance timer to trigger first emission
      vi.advanceTimersByTime(5000);

      const data = await dataPromise;

      expect(data).toHaveProperty('authMetrics');
      expect(data).toHaveProperty('cacheMetrics');
      expect(data).toHaveProperty('systemMetrics');
      expect(data).toHaveProperty('alerts');
      expect(data.timestamp).toBeGreaterThan(0);

      vi.useRealTimers();
    });
  });

  describe('detectRegressions', () => {
    beforeEach(() => {
      // Set up baseline metrics
      service.setBaselineMetrics({
        'auth-login': 100,
        'auth-refresh': 50,
      });
    });

    it('should detect major performance regression', () => {
      mockPerformanceLogging.getStatistics.mockReturnValue({
        'auth-login': { averageDuration: 220 }, // 120% increase from baseline
        'auth-refresh': { averageDuration: 45 }, // No regression
      });

      const regressions = service.detectRegressions();

      expect(regressions).toHaveLength(1);
      expect(regressions[0]).toEqual({
        operation: 'auth-login',
        currentAverage: 220,
        baselineAverage: 100,
        percentageChange: 120,
        significance: 'major',
        detectedAt: expect.any(Number),
      });
    });

    it('should detect moderate performance regression', () => {
      mockPerformanceLogging.getStatistics.mockReturnValue({
        'auth-refresh': { averageDuration: 80 }, // 60% increase from baseline
      });

      const regressions = service.detectRegressions();

      expect(regressions).toHaveLength(1);
      expect(regressions[0].significance).toBe('moderate');
      expect(regressions[0].percentageChange).toBe(60);
    });

    it('should detect minor performance regression', () => {
      mockPerformanceLogging.getStatistics.mockReturnValue({
        'auth-login': { averageDuration: 130 }, // 30% increase from baseline
      });

      const regressions = service.detectRegressions();

      expect(regressions).toHaveLength(1);
      expect(regressions[0].significance).toBe('minor');
      expect(regressions[0].percentageChange).toBe(30);
    });

    it('should not detect regression for improved performance', () => {
      mockPerformanceLogging.getStatistics.mockReturnValue({
        'auth-login': { averageDuration: 80 }, // 20% decrease from baseline
      });

      const regressions = service.detectRegressions();

      expect(regressions).toHaveLength(0);
    });

    it('should not detect regression below threshold', () => {
      mockPerformanceLogging.getStatistics.mockReturnValue({
        'auth-login': { averageDuration: 110 }, // 10% increase, below 20% threshold
      });

      const regressions = service.detectRegressions();

      expect(regressions).toHaveLength(0);
    });
  });

  describe('exportMetrics', () => {
    it('should export comprehensive metrics data', () => {
      const mockDashboardData = {
        authMetrics: { averageLoginTime: 120 },
        cacheMetrics: { hitRate: 85 },
        systemMetrics: { averageResponseTime: 150 },
        alerts: [{ type: 'warning', message: 'Test alert' }],
        timestamp: 1234567890,
      };

      // Mock the private method by setting up the dependencies
      mockPerformanceLogging.getMetricsForOperation.mockReturnValue([]);
      mockPerformanceLogging.getMetrics.mockReturnValue([]);
      mockPerformanceLogging.getAllAlerts.mockReturnValue([]);

      const exportedData = service.exportMetrics();

      expect(exportedData).toHaveProperty('metrics');
      expect(exportedData).toHaveProperty('alerts');
      expect(exportedData).toHaveProperty('regressions');
      expect(exportedData).toHaveProperty('timestamp');
      expect(exportedData.format).toBe('rms-performance-v1');
    });
  });

  describe('isPerformanceHealthy', () => {
    it('should return true for healthy performance', () => {
      // Set up healthy metrics for auth operations
      mockPerformanceLogging.getMetricsForOperation.mockImplementation(
        (operation: string) => {
          if (operation === 'auth-login') {
            return [{ duration: 50, success: true }];
          }
          if (operation === 'auth-refresh') {
            return [{ duration: 60, success: true }];
          }
          if (operation === 'auth-general') {
            return [{ duration: 30, success: true }];
          }
          return [];
        }
      );

      // Set up healthy cache and system metrics
      mockPerformanceLogging.getMetrics.mockReturnValue([
        { cacheHit: true, duration: 5, success: true, timestamp: Date.now() },
        { cacheHit: true, duration: 8, success: true, timestamp: Date.now() },
        { cacheHit: true, duration: 6, success: true, timestamp: Date.now() },
        { cacheHit: true, duration: 7, success: true, timestamp: Date.now() },
      ]);

      mockPerformanceLogging.getAllAlerts.mockReturnValue([]);

      const isHealthy = service.isPerformanceHealthy();

      expect(isHealthy).toBe(true);
    });

    it('should return false for critical alerts', () => {
      mockPerformanceLogging.getAllAlerts.mockReturnValue([
        {
          type: 'critical',
          message: 'Critical performance issue',
          timestamp: Date.now(),
          metric: { operation: 'auth-login', duration: 500 },
        },
      ]);

      const isHealthy = service.isPerformanceHealthy();

      expect(isHealthy).toBe(false);
    });

    it('should return false for low success rate', () => {
      // Set up low success rate scenario
      mockPerformanceLogging.getMetricsForOperation.mockReturnValue([
        { duration: 100, success: false },
        { duration: 100, success: false },
        { duration: 100, success: false },
        { duration: 100, success: true },
      ]);

      mockPerformanceLogging.getMetrics.mockReturnValue([]);
      mockPerformanceLogging.getAllAlerts.mockReturnValue([]);

      const isHealthy = service.isPerformanceHealthy();

      expect(isHealthy).toBe(false);
    });
  });
});
