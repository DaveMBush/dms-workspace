import { Injectable, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';

import type { PerformanceAlert } from '../interfaces/performance-alert.interface';
import type { PerformanceMetric } from '../interfaces/performance-metric.interface';
import type { PerformanceThresholds } from '../interfaces/performance-thresholds.interface';
import { storeMetricsWithLimit } from '../utils/metrics-storage.function';

/**
 * Service for logging and monitoring performance metrics
 */
@Injectable({
  providedIn: 'root',
})
export class PerformanceLoggingService {
  private readonly metrics = signal<PerformanceMetric[]>([]);
  private readonly alerts = signal<PerformanceAlert[]>([]);
  private readonly alertSubject = new Subject<PerformanceAlert>();

  private readonly thresholds: Record<string, PerformanceThresholds> = {
    'auth-login': { warning: 100, critical: 200 },
    'auth-refresh': { warning: 50, critical: 100 },
    'auth-logout': { warning: 50, critical: 100 },
    'auth-general': { warning: 10, critical: 20 },
    'api-get': { warning: 200, critical: 500 },
    'api-post': { warning: 300, critical: 750 },
    'api-put': { warning: 300, critical: 750 },
    'api-delete': { warning: 100, critical: 250 },
  };

  /**
   * Maximum number of metrics to keep in memory
   */
  private readonly maxMetrics = 1000;

  /**
   * Log a performance metric
   */
  logPerformanceMetric(metric: PerformanceMetric): void {
    const enrichedMetric = this.enrichMetric(metric);
    this.storeMetric(enrichedMetric);
    this.checkThresholds(enrichedMetric);
    this.logToConsole(enrichedMetric);
  }

  /**
   * Get all performance metrics
   */
  getMetrics(): PerformanceMetric[] {
    return this.metrics();
  }

  /**
   * Get metrics for a specific operation
   */
  getMetricsForOperation(operation: string): PerformanceMetric[] {
    return this.metrics().filter(function filterByOperation(metric) {
      return metric.operation === operation;
    });
  }

  /**
   * Get average duration for an operation
   */
  getAverageDuration(operation: string): number {
    const operationMetrics = this.getMetricsForOperation(operation);
    if (operationMetrics.length === 0) {
      return 0;
    }

    const totalDuration = operationMetrics.reduce(function sumDurations(
      sum,
      metric
    ) {
      return sum + metric.duration;
    },
    0);

    return totalDuration / operationMetrics.length;
  }

  /**
   * Get performance alerts stream
   */
  getAlerts(): Observable<PerformanceAlert> {
    return this.alertSubject.asObservable();
  }

  /**
   * Get all stored alerts
   */
  getAllAlerts(): PerformanceAlert[] {
    return this.alerts();
  }

  /**
   * Clear all metrics and alerts
   */
  clearMetrics(): void {
    this.metrics.set([]);
    this.alerts.set([]);
  }

  /**
   * Get performance statistics
   */
  getStatistics(): Record<string, unknown> {
    const allMetrics = this.metrics();
    const operations = this.extractUniqueOperations(allMetrics);
    return this.buildStatisticsForOperations(allMetrics, operations);
  }

  /**
   * Extract unique operations from metrics
   */
  private extractUniqueOperations(metrics: PerformanceMetric[]): string[] {
    return Array.from(
      new Set(
        metrics.map(function extractOperation(metric) {
          return metric.operation;
        })
      )
    );
  }

  /**
   * Build statistics for each operation
   */
  private buildStatisticsForOperations(
    allMetrics: PerformanceMetric[],
    operations: string[]
  ): Record<string, unknown> {
    return operations.reduce(function buildStats(
      stats: Record<string, unknown>,
      operation
    ) {
      const operationMetrics = allMetrics.filter(function filterByOp(metric) {
        return metric.operation === operation;
      });

      stats[operation] = createOperationStatistics(operationMetrics);
      return stats;
    },
    {});
  }

  /**
   * Enrich metric with timestamp and additional data
   */
  private enrichMetric(metric: PerformanceMetric): PerformanceMetric {
    return {
      ...metric,
      timestamp: Date.now(),
    };
  }

  /**
   * Store metric in memory with size limit
   */
  private storeMetric(metric: PerformanceMetric): void {
    const currentMetrics = this.metrics();
    const newMetrics = storeMetricsWithLimit(
      currentMetrics,
      metric,
      this.maxMetrics
    );
    this.metrics.set(newMetrics);
  }

  /**
   * Check if metric exceeds thresholds and create alerts
   */
  private checkThresholds(metric: PerformanceMetric): void {
    const threshold = this.thresholds[metric.operation];
    if (threshold === undefined) {
      return;
    }

    if (metric.duration > threshold.critical) {
      this.createAlert('critical', metric, threshold.critical);
    } else if (metric.duration > threshold.warning) {
      this.createAlert('warning', metric, threshold.warning);
    }
  }

  /**
   * Create and emit performance alert
   */
  private createAlert(
    type: 'critical' | 'warning',
    metric: PerformanceMetric,
    thresholdValue: number
  ): void {
    const alert: PerformanceAlert = {
      type,
      metric,
      threshold: thresholdValue,
      message: `${type.toUpperCase()}: ${
        metric.operation
      } took ${metric.duration.toFixed(2)}ms (threshold: ${thresholdValue}ms)`,
      timestamp: Date.now(),
    };

    const currentAlerts = this.alerts();
    const newAlerts = [alert, ...currentAlerts];

    // Keep only the most recent 100 alerts
    if (newAlerts.length > 100) {
      newAlerts.splice(100);
    }

    this.alerts.set(newAlerts);
    this.alertSubject.next(alert);
  }

  /**
   * Log performance metric to console for debugging
   */
  private logToConsole(metric: PerformanceMetric): void {
    // Performance logging disabled in production
    // Metrics are tracked in memory instead
    if (!metric.success || metric.duration > 1000) {
      // Only log critical issues
      // Logging disabled to avoid console noise in production
    }
  }
}

/**
 * Create statistics object for a single operation
 */
function createOperationStatistics(operationMetrics: PerformanceMetric[]): {
  count: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  successRate: number;
  cacheHitRate: number;
} {
  const durations = operationMetrics.map(function extractDuration(metric) {
    return metric.duration;
  });

  const successfulRequests = operationMetrics.filter(function filterSuccessful(
    metric
  ) {
    return metric.success;
  });

  const cacheHits = operationMetrics.filter(function filterCacheHits(metric) {
    return metric.cacheHit === true;
  });

  return {
    count: operationMetrics.length,
    averageDuration:
      durations.length > 0
        ? durations.reduce(function sum(a, b) {
            return a + b;
          }, 0) / durations.length
        : 0,
    minDuration: durations.length > 0 ? Math.min(...durations) : 0,
    maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
    successRate:
      operationMetrics.length > 0
        ? (successfulRequests.length / operationMetrics.length) * 100
        : 0,
    cacheHitRate:
      operationMetrics.length > 0
        ? (cacheHits.length / operationMetrics.length) * 100
        : 0,
  };
}
