import { inject, Injectable, signal } from '@angular/core';
import { interval, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { PerformanceLoggingService } from '../../shared/services/performance-logging.service';
import type { AuthPerformanceMetrics } from '../interfaces/auth-performance-metrics.interface';
import type { CachePerformanceMetrics } from '../interfaces/cache-performance-metrics.interface';
import type { PerformanceAlert } from '../interfaces/performance-alert.interface';
import type { PerformanceDashboardData } from '../interfaces/performance-dashboard-data.interface';
import type { PerformanceRegression } from '../interfaces/performance-regression.interface';
import type { SystemPerformanceMetrics } from '../interfaces/system-performance-metrics.interface';
import { TokenCacheService } from './token-cache.service';

/**
 * Service for monitoring and aggregating performance data
 */
@Injectable({
  providedIn: 'root',
})
export class PerformanceMonitoringService {
  private readonly performanceLogging = inject(PerformanceLoggingService);
  private readonly tokenCache = inject(TokenCacheService);

  private readonly dashboardData = signal<PerformanceDashboardData | null>(
    null
  );

  private readonly regressions = signal<PerformanceRegression[]>([]);

  private readonly baselineMetrics = new Map<string, number>();
  private readonly regressionThresholds = {
    minor: 20, // 20% increase
    moderate: 50, // 50% increase
    major: 100, // 100% increase
  };

  /**
   * Get real-time dashboard data
   */
  getDashboardData(): Observable<PerformanceDashboardData> {
    const service = this;
    return interval(5000).pipe(
      map(function generateData() {
        return service.generateDashboardData();
      })
    );
  }

  /**
   * Get current dashboard data snapshot
   */
  getCurrentDashboardData(): PerformanceDashboardData {
    return this.generateDashboardData();
  }

  /**
   * Get performance regressions
   */
  getPerformanceRegressions(): PerformanceRegression[] {
    return this.regressions();
  }

  /**
   * Set baseline metrics for regression detection
   */
  setBaselineMetrics(metrics: Record<string, number>): void {
    const baselineMap = this.baselineMetrics;
    Object.entries(metrics).forEach(function setBaseline([operation, average]) {
      baselineMap.set(operation, average);
    });
  }

  /**
   * Detect performance regressions
   */
  detectRegressions(): PerformanceRegression[] {
    const statistics = this.performanceLogging.getStatistics();
    const detectedRegressions: PerformanceRegression[] = [];

    const baselineMap = this.baselineMetrics;
    const detectedList = detectedRegressions;
    const service = this;
    Object.entries(statistics).forEach(function processRegressions([
      operation,
      stats,
    ]) {
      const currentAverage = (stats as { averageDuration: number })
        .averageDuration;
      const baselineAverage = baselineMap.get(operation);

      if (baselineAverage !== undefined && currentAverage > baselineAverage) {
        const percentageChange =
          ((currentAverage - baselineAverage) / baselineAverage) * 100;
        const significance =
          service.determineRegressionSignificance(percentageChange);

        if (significance !== null) {
          detectedList.push({
            operation,
            currentAverage,
            baselineAverage,
            percentageChange,
            significance,
            detectedAt: Date.now(),
          });
        }
      }
    });

    this.regressions.set(detectedRegressions);
    return detectedRegressions;
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics(): Record<string, unknown> {
    const dashboardData = this.generateDashboardData();
    const regressions = this.getPerformanceRegressions();

    return {
      metrics: {
        auth: dashboardData.authMetrics,
        cache: dashboardData.cacheMetrics,
        system: dashboardData.systemMetrics,
      },
      alerts: dashboardData.alerts,
      regressions,
      timestamp: dashboardData.timestamp,
      format: 'rms-performance-v1',
    };
  }

  /**
   * Check if system performance is healthy
   */
  isPerformanceHealthy(): boolean {
    const data = this.generateDashboardData();
    const criticalAlerts = data.alerts.filter(function filterCritical(alert) {
      return alert.type === 'critical';
    });

    return (
      criticalAlerts.length === 0 &&
      data.authMetrics.successRate > 95 &&
      data.cacheMetrics.hitRate > 80 &&
      data.systemMetrics.errorRate < 5
    );
  }

  /**
   * Generate dashboard data from current metrics
   */
  private generateDashboardData(): PerformanceDashboardData {
    const authMetrics = this.generateAuthMetrics();
    const cacheMetrics = this.generateCacheMetrics();
    const systemMetrics = this.generateSystemMetrics();
    const alerts = this.convertAlertsFormat();

    return {
      authMetrics,
      cacheMetrics,
      systemMetrics,
      alerts,
      timestamp: Date.now(),
    };
  }

  /**
   * Generate authentication performance metrics
   */
  private generateAuthMetrics(): AuthPerformanceMetrics {
    const loginMetrics =
      this.performanceLogging.getMetricsForOperation('auth-login');
    const refreshMetrics =
      this.performanceLogging.getMetricsForOperation('auth-refresh');
    const interceptorMetrics =
      this.performanceLogging.getMetricsForOperation('auth-general');

    const allAuthMetrics = [
      ...loginMetrics,
      ...refreshMetrics,
      ...interceptorMetrics,
    ];

    const successfulRequests = allAuthMetrics.filter(function filterSuccessful(
      metric
    ) {
      return metric.success;
    });

    const slowRequests = allAuthMetrics.filter(function filterSlow(metric) {
      return metric.duration > 100;
    });

    return {
      averageLoginTime: this.calculateAverage(loginMetrics),
      averageRefreshTime: this.calculateAverage(refreshMetrics),
      averageInterceptorTime: this.calculateAverage(interceptorMetrics),
      successRate:
        allAuthMetrics.length > 0
          ? (successfulRequests.length / allAuthMetrics.length) * 100
          : 100,
      requestVolume: allAuthMetrics.length,
      slowRequestCount: slowRequests.length,
    };
  }

  /**
   * Generate cache performance metrics
   */
  private generateCacheMetrics(): CachePerformanceMetrics {
    const cacheStats = this.tokenCache.getStats();
    const cacheMetrics = this.performanceLogging
      .getMetrics()
      .filter(function filterCacheMetrics(metric) {
        return metric.cacheHit !== undefined;
      });

    const hitCount = cacheMetrics.filter(function filterHits(metric) {
      return metric.cacheHit === true;
    }).length;

    const totalCacheRequests = cacheMetrics.length;

    return {
      hitRate:
        totalCacheRequests > 0 ? (hitCount / totalCacheRequests) * 100 : 0,
      missRate:
        totalCacheRequests > 0
          ? ((totalCacheRequests - hitCount) / totalCacheRequests) * 100
          : 0,
      totalRequests: totalCacheRequests,
      averageRetrievalTime: this.calculateAverage(cacheMetrics),
      cacheSize: cacheStats.cacheSize,
      evictionCount: 0, // Not tracked in current CacheStats
    };
  }

  /**
   * Generate system performance metrics
   */
  private generateSystemMetrics(): SystemPerformanceMetrics {
    const allMetrics = this.performanceLogging.getMetrics();
    const errorMetrics = allMetrics.filter(function filterErrors(metric) {
      return !metric.success;
    });

    const recentMetrics = allMetrics.filter(function filterRecent(metric) {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      return (metric.timestamp ?? 0) > fiveMinutesAgo;
    });

    return {
      averageResponseTime: this.calculateAverage(allMetrics),
      errorRate:
        allMetrics.length > 0
          ? (errorMetrics.length / allMetrics.length) * 100
          : 0,
      throughput: recentMetrics.length / 5, // requests per minute (5-minute window)
      activeRequests: 0, // This would need to be tracked separately
    };
  }

  /**
   * Convert performance logging alerts to dashboard format
   */
  private convertAlertsFormat(): PerformanceAlert[] {
    return this.performanceLogging
      .getAllAlerts()
      .map(function convertAlert(alert) {
        return {
          type: alert.type,
          message: alert.message,
          timestamp: alert.timestamp,
          operation: alert.metric.operation,
          duration: alert.metric.duration,
        };
      });
  }

  /**
   * Calculate average duration from metrics
   */
  private calculateAverage(metrics: { duration: number }[]): number {
    if (metrics.length === 0) {
      return 0;
    }

    const total = metrics.reduce(function sumDurations(sum, metric) {
      return sum + metric.duration;
    }, 0);

    return total / metrics.length;
  }

  /**
   * Determine the significance of a performance regression
   */
  private determineRegressionSignificance(
    percentageChange: number
  ): 'major' | 'minor' | 'moderate' | null {
    if (percentageChange >= this.regressionThresholds.major) {
      return 'major';
    }
    if (percentageChange >= this.regressionThresholds.moderate) {
      return 'moderate';
    }
    if (percentageChange >= this.regressionThresholds.minor) {
      return 'minor';
    }
    return null;
  }
}
