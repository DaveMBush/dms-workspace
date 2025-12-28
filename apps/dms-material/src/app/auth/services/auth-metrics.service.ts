import { inject, Injectable, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';

import { PerformanceLoggingService } from '../../shared/services/performance-logging.service';
import { storeMetricsWithLimit } from '../../shared/utils/metrics-storage.function';
import type { AuthOperationMetric } from '../interfaces/auth-operation-metric.interface';
import type { AuthOperationStats } from '../interfaces/auth-operation-stats.interface';
import type { AuthPerformanceSummary } from '../interfaces/auth-performance-summary.interface';

/**
 * Service for tracking authentication-specific performance metrics
 */
@Injectable({
  providedIn: 'root',
})
export class AuthMetricsService {
  private readonly performanceLogging = inject(PerformanceLoggingService);

  private readonly metrics = signal<AuthOperationMetric[]>([]);
  private readonly operationSubject = new Subject<AuthOperationMetric>();

  private readonly maxMetrics = 500;
  private readonly slowOperationThreshold = 50; // ms

  /**
   * Start timing an authentication operation
   */
  startOperation(
    operation: AuthOperationMetric['operation'],
    correlationId?: string
  ): (success: boolean, errorType?: string, cacheHit?: boolean) => void {
    const startTime = performance.now();
    const service = this;

    return function endOperationTiming(
      success: boolean,
      errorType?: string,
      cacheHit?: boolean
    ) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      const metric: AuthOperationMetric = {
        operation,
        startTime,
        endTime,
        duration,
        success,
        errorType,
        cacheHit,
        correlationId,
      };

      service.recordMetric(metric);
    };
  }

  /**
   * Record authentication operation timing
   */
  recordAuthOperation(
    operation: AuthOperationMetric['operation'],
    duration: number,
    success: boolean,
    options?: {
      errorType?: string;
      cacheHit?: boolean;
      correlationId?: string;
    }
  ): void {
    const endTime = performance.now();
    const startTime = endTime - duration;

    const metric: AuthOperationMetric = {
      operation,
      startTime,
      endTime,
      duration,
      success,
      errorType: options?.errorType,
      cacheHit: options?.cacheHit,
      correlationId: options?.correlationId,
    };

    this.recordMetric(metric);
  }

  /**
   * Get performance summary for authentication operations
   */
  getPerformanceSummary(): AuthPerformanceSummary {
    const allMetrics = this.metrics();

    if (allMetrics.length === 0) {
      return this.getEmptySummary();
    }

    const successfulOperations = allMetrics.filter(function filterSuccessful(
      metric
    ) {
      return metric.success;
    });

    const operationsWithCache = allMetrics.filter(function filterWithCache(
      metric
    ) {
      return metric.cacheHit !== undefined;
    });

    const cacheHits = operationsWithCache.filter(function filterCacheHits(
      metric
    ) {
      return metric.cacheHit === true;
    });

    const serviceThreshold = this.slowOperationThreshold;
    const slowOperations = allMetrics.filter(function filterSlowOperations(
      metric
    ) {
      return metric.duration > serviceThreshold;
    });

    const totalDuration = allMetrics.reduce(function sumDurations(sum, metric) {
      return sum + metric.duration;
    }, 0);

    return {
      totalOperations: allMetrics.length,
      averageDuration: totalDuration / allMetrics.length,
      successRate: (successfulOperations.length / allMetrics.length) * 100,
      cacheHitRate:
        operationsWithCache.length > 0
          ? (cacheHits.length / operationsWithCache.length) * 100
          : 0,
      slowOperationCount: slowOperations.length,
      errorBreakdown: this.generateErrorBreakdown(allMetrics),
      operationBreakdown: this.generateOperationBreakdown(allMetrics),
    };
  }

  /**
   * Get metrics for a specific operation type
   */
  getMetricsForOperation(
    operation: AuthOperationMetric['operation']
  ): AuthOperationMetric[] {
    return this.metrics().filter(function filterByOperation(metric) {
      return metric.operation === operation;
    });
  }

  /**
   * Get real-time stream of authentication operations
   */
  getOperationStream(): Observable<AuthOperationMetric> {
    return this.operationSubject.asObservable();
  }

  /**
   * Clear all stored metrics
   */
  clearMetrics(): void {
    this.metrics.set([]);
  }

  /**
   * Get metrics within a time range
   */
  getMetricsInTimeRange(
    startTime: number,
    endTime: number
  ): AuthOperationMetric[] {
    return this.metrics().filter(function filterByTime(metric) {
      return metric.endTime >= startTime && metric.endTime <= endTime;
    });
  }

  /**
   * Get recent metrics (last N minutes)
   */
  getRecentMetrics(minutes: number): AuthOperationMetric[] {
    const cutoffTime = performance.now() - minutes * 60 * 1000;
    return this.metrics().filter(function filterRecent(metric) {
      return metric.endTime >= cutoffTime;
    });
  }

  /**
   * Record a metric and emit it to subscribers
   */
  private recordMetric(metric: AuthOperationMetric): void {
    // Store in local collection
    this.storeMetricWithLimit(metric);

    // Also log to performance logging service
    this.performanceLogging.logPerformanceMetric({
      requestId: metric.correlationId ?? `auth-${Date.now()}`,
      operation: `auth-${metric.operation}`,
      startTime: metric.startTime,
      endTime: metric.endTime,
      duration: metric.duration,
      success: metric.success,
      cacheHit: metric.cacheHit,
    });

    // Emit to subscribers
    this.operationSubject.next(metric);
  }

  /**
   * Generate error breakdown statistics
   */
  private generateErrorBreakdown(
    metrics: AuthOperationMetric[]
  ): Record<string, number> {
    const errorMetrics = metrics.filter(function filterErrors(metric) {
      return !metric.success && metric.errorType !== undefined;
    });

    return errorMetrics.reduce(function countErrors(
      breakdown: Record<string, number>,
      metric
    ) {
      const errorType = metric.errorType!;
      breakdown[errorType] = (breakdown[errorType] || 0) + 1;
      return breakdown;
    },
    {});
  }

  /**
   * Generate operation breakdown statistics
   */
  private generateOperationBreakdown(
    metrics: AuthOperationMetric[]
  ): Record<string, AuthOperationStats> {
    const operations = Array.from(
      new Set(
        metrics.map(function extractOperation(metric) {
          return metric.operation;
        })
      )
    );

    return operations.reduce(function createBreakdown(
      breakdown: Record<string, AuthOperationStats>,
      operation
    ) {
      const operationMetrics = metrics.filter(function filterByOp(metric) {
        return metric.operation === operation;
      });

      breakdown[operation] = createAuthOperationStats(operationMetrics);

      return breakdown;
    },
    {});
  }

  /**
   * Store metric with size limit
   */
  private storeMetricWithLimit(metric: AuthOperationMetric): void {
    const currentMetrics = this.metrics();
    const newMetrics = storeMetricsWithLimit(
      currentMetrics,
      metric,
      this.maxMetrics
    );
    this.metrics.set(newMetrics);
  }

  /**
   * Calculate average duration from array of durations
   */
  private calculateAverageDuration(durations: number[]): number {
    return durations.length > 0
      ? durations.reduce(function sum(a, b) {
          return a + b;
        }, 0) / durations.length
      : 0;
  }

  /**
   * Calculate success rate percentage
   */
  private calculateSuccessRate(total: number, successful: number): number {
    return total > 0 ? (successful / total) * 100 : 100;
  }

  /**
   * Calculate cache hit rate percentage
   */
  private calculateCacheHitRate(totalWithCache: number, hits: number): number {
    return totalWithCache > 0 ? (hits / totalWithCache) * 100 : 0;
  }

  /**
   * Get empty summary for when no metrics exist
   */
  private getEmptySummary(): AuthPerformanceSummary {
    return {
      totalOperations: 0,
      averageDuration: 0,
      successRate: 100,
      cacheHitRate: 0,
      slowOperationCount: 0,
      errorBreakdown: {},
      operationBreakdown: {},
    };
  }
}

/**
 * Create statistics for auth operation metrics
 */
function createAuthOperationStats(
  operationMetrics: AuthOperationMetric[]
): AuthOperationStats {
  const durations = operationMetrics.map(function extractDuration(metric) {
    return metric.duration;
  });

  const successfulOps = operationMetrics.filter(function filterSuccessful(
    metric
  ) {
    return metric.success;
  });

  const opsWithCache = operationMetrics.filter(function filterWithCache(
    metric
  ) {
    return metric.cacheHit !== undefined;
  });

  const cacheHits = opsWithCache.filter(function filterCacheHits(metric) {
    return metric.cacheHit === true;
  });

  const avgDuration =
    durations.length > 0
      ? durations.reduce(function sum(a, b) {
          return a + b;
        }, 0) / durations.length
      : 0;

  return {
    count: operationMetrics.length,
    averageDuration: avgDuration,
    minDuration: durations.length > 0 ? Math.min(...durations) : 0,
    maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
    successRate:
      operationMetrics.length > 0
        ? (successfulOps.length / operationMetrics.length) * 100
        : 0,
    cacheHitRate:
      opsWithCache.length > 0
        ? (cacheHits.length / opsWithCache.length) * 100
        : 0,
  };
}
