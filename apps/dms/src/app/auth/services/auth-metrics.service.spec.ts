/* eslint-disable @typescript-eslint/unbound-method -- Required for Vitest mocking in tests */
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { vi } from 'vitest';

import { PerformanceLoggingService } from '../../shared/services/performance-logging.service';
import { AuthMetricsService } from './auth-metrics.service';

describe('AuthMetricsService', () => {
  let service: AuthMetricsService;
  let mockPerformanceLogging: PerformanceLoggingService;

  beforeEach(() => {
    mockPerformanceLogging = {
      logPerformanceMetric: vi.fn(),
    } as unknown as PerformanceLoggingService;

    TestBed.configureTestingModule({
      providers: [
        {
          provide: PerformanceLoggingService,
          useValue: mockPerformanceLogging,
        },
      ],
    });

    service = TestBed.inject(AuthMetricsService);
    service.clearMetrics();
  });

  describe('startOperation', () => {
    it('should return timing function and record metric', async () => {
      const endTiming = service.startOperation('login', 'correlation-123');

      // Simulate some time passing
      await new Promise((resolve) => setTimeout(resolve, 10));

      endTiming(true, undefined, true);

      const metrics = service.getMetricsForOperation('login');
      expect(metrics).toHaveLength(1);

      const metric = metrics[0];
      expect(metric.operation).toBe('login');
      expect(metric.success).toBe(true);
      expect(metric.cacheHit).toBe(true);
      expect(metric.correlationId).toBe('correlation-123');
      expect(metric.duration).toBeGreaterThan(0);
    });

    it('should record failed operation with error type', () => {
      const endTiming = service.startOperation('refresh');

      endTiming(false, 'network-error');

      const metrics = service.getMetricsForOperation('refresh');
      const metric = metrics[0];

      expect(metric.success).toBe(false);
      expect(metric.errorType).toBe('network-error');
      expect(metric.cacheHit).toBeUndefined();
    });
  });

  describe('recordAuthOperation', () => {
    it('should record operation with provided duration', () => {
      service.recordAuthOperation('logout', 75, true, {
        cacheHit: false,
        correlationId: 'test-456',
      });

      const metrics = service.getMetricsForOperation('logout');
      expect(metrics).toHaveLength(1);

      const metric = metrics[0];
      expect(metric.operation).toBe('logout');
      expect(metric.duration).toBe(75);
      expect(metric.success).toBe(true);
      expect(metric.cacheHit).toBe(false);
      expect(metric.correlationId).toBe('test-456');
    });

    it('should record failed operation with error', () => {
      service.recordAuthOperation('validate', 200, false, {
        errorType: 'token-expired',
      });

      const metrics = service.getMetricsForOperation('validate');
      const metric = metrics[0];

      expect(metric.success).toBe(false);
      expect(metric.errorType).toBe('token-expired');
    });
  });

  describe('getPerformanceSummary', () => {
    it('should return empty summary when no metrics exist', () => {
      const summary = service.getPerformanceSummary();

      expect(summary.totalOperations).toBe(0);
      expect(summary.averageDuration).toBe(0);
      expect(summary.successRate).toBe(100);
      expect(summary.cacheHitRate).toBe(0);
      expect(summary.slowOperationCount).toBe(0);
      expect(summary.errorBreakdown).toEqual({});
      expect(summary.operationBreakdown).toEqual({});
    });

    it('should calculate comprehensive performance summary', () => {
      const operations = [
        { operation: 'login', duration: 120, success: true, cacheHit: true },
        {
          operation: 'login',
          duration: 80,
          success: false,
          errorType: 'invalid-credentials',
          cacheHit: false,
        },
        { operation: 'refresh', duration: 30, success: true, cacheHit: true },
        {
          operation: 'refresh',
          duration: 70,
          success: true,
          cacheHit: undefined,
        },
        { operation: 'logout', duration: 25, success: true },
      ] as const;

      operations.forEach((op) => {
        service.recordAuthOperation(op.operation, op.duration, op.success, {
          errorType: 'errorType' in op ? op.errorType : undefined,
          cacheHit: op.cacheHit,
        });
      });

      const summary = service.getPerformanceSummary();

      expect(summary.totalOperations).toBe(5);
      expect(summary.averageDuration).toBe(65); // (120+80+30+70+25)/5
      expect(summary.successRate).toBe(80); // 4 successful out of 5
      expect(summary.cacheHitRate).toBeCloseTo(66.67, 1); // 2 hits out of 3 with cache data
      expect(summary.slowOperationCount).toBe(3); // > 50ms threshold

      expect(summary.errorBreakdown).toEqual({
        'invalid-credentials': 1,
      });

      expect(summary.operationBreakdown).toHaveProperty('login');
      expect(summary.operationBreakdown).toHaveProperty('refresh');
      expect(summary.operationBreakdown).toHaveProperty('logout');

      const loginStats = summary.operationBreakdown.login;
      expect(loginStats.count).toBe(2);
      expect(loginStats.averageDuration).toBe(100);
      expect(loginStats.successRate).toBe(50);
      expect(loginStats.cacheHitRate).toBe(50);
    });
  });

  describe('getMetricsForOperation', () => {
    it('should filter metrics by operation type', () => {
      service.recordAuthOperation('login', 100, true);
      service.recordAuthOperation('refresh', 50, true);
      service.recordAuthOperation('login', 150, false);

      const loginMetrics = service.getMetricsForOperation('login');
      const refreshMetrics = service.getMetricsForOperation('refresh');

      expect(loginMetrics).toHaveLength(2);
      expect(refreshMetrics).toHaveLength(1);

      loginMetrics.forEach((metric) => {
        expect(metric.operation).toBe('login');
      });

      expect(refreshMetrics[0].operation).toBe('refresh');
    });
  });

  describe('getOperationStream', () => {
    it('should emit metrics as they are recorded', async () => {
      const streamPromise = firstValueFrom(service.getOperationStream());

      service.recordAuthOperation('validate', 45, true, {
        correlationId: 'stream-test',
      });

      const emittedMetric = await streamPromise;

      expect(emittedMetric.operation).toBe('validate');
      expect(emittedMetric.duration).toBe(45);
      expect(emittedMetric.correlationId).toBe('stream-test');
    });
  });

  describe('getRecentMetrics', () => {
    it('should return metrics from recent time period', () => {
      const now = performance.now();

      // Record some metrics
      service.recordAuthOperation('login', 100, true);
      service.recordAuthOperation('refresh', 50, true);

      const recentMetrics = service.getRecentMetrics(1); // Last 1 minute

      expect(recentMetrics).toHaveLength(2);
      recentMetrics.forEach((metric) => {
        expect(metric.endTime).toBeGreaterThanOrEqual(now - 60000);
      });
    });
  });

  describe('getMetricsInTimeRange', () => {
    it('should return metrics within specified time range', () => {
      const startTime = performance.now();

      service.recordAuthOperation('login', 100, true);

      const endTime = performance.now();

      service.recordAuthOperation('refresh', 50, true);

      const rangeMetrics = service.getMetricsInTimeRange(startTime, endTime);

      expect(rangeMetrics).toHaveLength(1);
      expect(rangeMetrics[0].operation).toBe('login');
    });
  });

  describe('integration with PerformanceLoggingService', () => {
    it('should log metrics to performance logging service', () => {
      service.recordAuthOperation('login', 120, true, {
        cacheHit: true,
        correlationId: 'test-correlation',
      });

      expect(mockPerformanceLogging.logPerformanceMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'test-correlation',
          operation: 'auth-login',
          duration: 120,
          success: true,
          cacheHit: true,
        })
      );
    });

    it('should generate request ID when correlation ID not provided', () => {
      service.recordAuthOperation('refresh', 50, true);

      expect(mockPerformanceLogging.logPerformanceMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: expect.stringMatching(/^auth-\d+$/),
          operation: 'auth-refresh',
        })
      );
    });
  });

  describe('memory management', () => {
    it('should clear all metrics', () => {
      service.recordAuthOperation('login', 100, true);
      service.recordAuthOperation('refresh', 50, true);

      expect(service.getMetricsForOperation('login')).toHaveLength(1);
      expect(service.getMetricsForOperation('refresh')).toHaveLength(1);

      service.clearMetrics();

      expect(service.getMetricsForOperation('login')).toHaveLength(0);
      expect(service.getMetricsForOperation('refresh')).toHaveLength(0);
    });
  });
});
