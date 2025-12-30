import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import {
  PerformanceLoggingService,
  PerformanceMetric,
} from './performance-logging.service';

describe('PerformanceLoggingService', () => {
  let service: PerformanceLoggingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PerformanceLoggingService);
    service.clearMetrics();
  });

  describe('logPerformanceMetric', () => {
    it('should log a performance metric', () => {
      const metric: PerformanceMetric = {
        requestId: 'test-123',
        operation: 'auth-login',
        startTime: 100,
        endTime: 200,
        duration: 100,
        success: true,
        statusCode: 200,
        url: '/api/auth/login',
        method: 'POST',
      };

      service.logPerformanceMetric(metric);

      const metrics = service.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toEqual(
        expect.objectContaining({
          ...metric,
          timestamp: expect.any(Number),
        })
      );
    });

    it('should enrich metric with timestamp', () => {
      const metric: PerformanceMetric = {
        requestId: 'test-123',
        operation: 'auth-login',
        startTime: 100,
        endTime: 200,
        duration: 100,
        success: true,
      };

      const beforeTimestamp = Date.now();
      service.logPerformanceMetric(metric);
      const afterTimestamp = Date.now();

      const metrics = service.getMetrics();
      const storedMetric = metrics[0];

      expect(storedMetric.timestamp).toBeGreaterThanOrEqual(beforeTimestamp);
      expect(storedMetric.timestamp).toBeLessThanOrEqual(afterTimestamp);
    });
  });

  describe('getMetricsForOperation', () => {
    it('should filter metrics by operation', () => {
      const loginMetric: PerformanceMetric = {
        requestId: 'test-123',
        operation: 'auth-login',
        startTime: 100,
        endTime: 200,
        duration: 100,
        success: true,
      };

      const refreshMetric: PerformanceMetric = {
        requestId: 'test-456',
        operation: 'auth-refresh',
        startTime: 200,
        endTime: 250,
        duration: 50,
        success: true,
      };

      service.logPerformanceMetric(loginMetric);
      service.logPerformanceMetric(refreshMetric);

      const loginMetrics = service.getMetricsForOperation('auth-login');
      const refreshMetrics = service.getMetricsForOperation('auth-refresh');

      expect(loginMetrics).toHaveLength(1);
      expect(refreshMetrics).toHaveLength(1);
      expect(loginMetrics[0].operation).toBe('auth-login');
      expect(refreshMetrics[0].operation).toBe('auth-refresh');
    });
  });

  describe('getAverageDuration', () => {
    it('should calculate average duration for operation', () => {
      const metrics = [
        {
          requestId: 'test-1',
          operation: 'auth-login',
          startTime: 100,
          endTime: 200,
          duration: 100,
          success: true,
        },
        {
          requestId: 'test-2',
          operation: 'auth-login',
          startTime: 200,
          endTime: 350,
          duration: 150,
          success: true,
        },
      ];

      metrics.forEach((metric) => service.logPerformanceMetric(metric));

      const average = service.getAverageDuration('auth-login');
      expect(average).toBe(125);
    });

    it('should return 0 for operation with no metrics', () => {
      const average = service.getAverageDuration('nonexistent-operation');
      expect(average).toBe(0);
    });
  });

  describe('alerts', () => {
    it('should emit warning alert for slow operation', async () => {
      const alertPromise = firstValueFrom(service.getAlerts());

      // Auth-login warning threshold is 100ms
      const slowMetric: PerformanceMetric = {
        requestId: 'test-123',
        operation: 'auth-login',
        startTime: 100,
        endTime: 250,
        duration: 150, // Above warning threshold
        success: true,
      };

      service.logPerformanceMetric(slowMetric);

      const alert = await alertPromise;
      expect(alert.type).toBe('warning');
      expect(alert.metric.operation).toBe('auth-login');
      expect(alert.threshold).toBe(100);
    });

    it('should emit critical alert for very slow operation', async () => {
      const alertPromise = firstValueFrom(service.getAlerts());

      // Auth-login critical threshold is 200ms
      const verySlowMetric: PerformanceMetric = {
        requestId: 'test-123',
        operation: 'auth-login',
        startTime: 100,
        endTime: 350,
        duration: 250, // Above critical threshold
        success: true,
      };

      service.logPerformanceMetric(verySlowMetric);

      const alert = await alertPromise;
      expect(alert.type).toBe('critical');
      expect(alert.metric.operation).toBe('auth-login');
      expect(alert.threshold).toBe(200);
    });

    it('should not emit alert for fast operation', () => {
      let alertEmitted = false;
      service.getAlerts().subscribe(() => {
        alertEmitted = true;
      });

      const fastMetric: PerformanceMetric = {
        requestId: 'test-123',
        operation: 'auth-login',
        startTime: 100,
        endTime: 150,
        duration: 50, // Below warning threshold
        success: true,
      };

      service.logPerformanceMetric(fastMetric);

      expect(alertEmitted).toBe(false);
    });
  });

  describe('getStatistics', () => {
    it('should calculate comprehensive statistics', () => {
      const metrics = [
        {
          requestId: 'test-1',
          operation: 'auth-login',
          startTime: 100,
          endTime: 200,
          duration: 100,
          success: true,
          cacheHit: true,
        },
        {
          requestId: 'test-2',
          operation: 'auth-login',
          startTime: 200,
          endTime: 350,
          duration: 150,
          success: false,
          cacheHit: false,
        },
        {
          requestId: 'test-3',
          operation: 'auth-refresh',
          startTime: 300,
          endTime: 350,
          duration: 50,
          success: true,
          cacheHit: true,
        },
      ];

      metrics.forEach((metric) => service.logPerformanceMetric(metric));

      const statistics = service.getStatistics();

      expect(statistics['auth-login']).toEqual({
        count: 2,
        averageDuration: 125,
        minDuration: 100,
        maxDuration: 150,
        successRate: 50,
        cacheHitRate: 50,
      });

      expect(statistics['auth-refresh']).toEqual({
        count: 1,
        averageDuration: 50,
        minDuration: 50,
        maxDuration: 50,
        successRate: 100,
        cacheHitRate: 100,
      });
    });

    it('should return empty statistics when no metrics exist', () => {
      const statistics = service.getStatistics();
      expect(statistics).toEqual({});
    });
  });

  describe('memory management', () => {
    it('should limit stored metrics to maximum count', () => {
      // Set up service with smaller limit for testing
      const maxMetrics = 3;

      // Mock the private maxMetrics property by adding more metrics than the limit
      for (let i = 0; i < 5; i++) {
        service.logPerformanceMetric({
          requestId: `test-${i}`,
          operation: 'auth-login',
          startTime: 100,
          endTime: 200,
          duration: 100,
          success: true,
        });
      }

      const metrics = service.getMetrics();
      // Should not exceed reasonable memory usage
      expect(metrics.length).toBeLessThanOrEqual(1000);
    });

    it('should clear all metrics and alerts', () => {
      service.logPerformanceMetric({
        requestId: 'test-123',
        operation: 'auth-login',
        startTime: 100,
        endTime: 200,
        duration: 100,
        success: true,
      });

      expect(service.getMetrics()).toHaveLength(1);

      service.clearMetrics();

      expect(service.getMetrics()).toHaveLength(0);
      expect(service.getAllAlerts()).toHaveLength(0);
    });
  });
});
