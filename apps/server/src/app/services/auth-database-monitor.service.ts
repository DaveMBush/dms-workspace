import { PrismaClient } from '@prisma/client';

import { DatabaseMetrics } from './database-metrics.interface';
import { databasePerformanceService } from './database-performance.service';

interface AuthDatabaseMetrics extends DatabaseMetrics {
  authOperationCount: number;
  averageAuthQueryTime: number;
  authConnectionEfficiency: number;
  sessionDataQueryTime: number;
}

interface AuthOperationMetrics {
  userLookups: number;
  sessionQueries: number;
  batchOperations: number;
  validationChecks: number;
  totalAuthOperations: number;
  averageResponseTime: number;
}

/**
 * Enhanced database performance monitoring for authentication operations
 */
class AuthDatabaseMonitorService {
  private authOperationCounters = {
    userLookups: 0,
    sessionQueries: 0,
    batchOperations: 0,
    validationChecks: 0,
  };

  private authQueryTimes: number[] = [];
  private sessionQueryTimes: number[] = [];

  /**
   * Record an authentication database operation
   */
  recordAuthOperation(
    operationType: keyof typeof this.authOperationCounters,
    duration: number
  ): void {
    this.authOperationCounters[operationType]++;
    this.authQueryTimes.push(duration);

    if (operationType === 'sessionQueries') {
      this.sessionQueryTimes.push(duration);
    }
  }

  /**
   * Get comprehensive authentication database metrics
   */
  async getAuthDatabaseMetrics(
    client: PrismaClient
  ): Promise<AuthDatabaseMetrics> {
    const baseMetrics = await databasePerformanceService.getPerformanceMetrics(
      client
    );

    const authOperationCount = Object.values(this.authOperationCounters).reduce(
      function sum(a, b) {
        return a + b;
      },
      0
    );

    const averageAuthQueryTime =
      this.authQueryTimes.length > 0
        ? this.authQueryTimes.reduce(function sum(a, b) {
            return a + b;
          }, 0) / this.authQueryTimes.length
        : 0;

    const sessionDataQueryTime =
      this.sessionQueryTimes.length > 0
        ? this.sessionQueryTimes.reduce(function sum(a, b) {
            return a + b;
          }, 0) / this.sessionQueryTimes.length
        : 0;

    // Calculate connection efficiency for auth operations
    const authConnectionEfficiency =
      authOperationCount > 0
        ? (authOperationCount /
            (baseMetrics.connectionTime + baseMetrics.queryTime)) *
          100
        : 0;

    return {
      ...baseMetrics,
      authOperationCount,
      averageAuthQueryTime,
      authConnectionEfficiency,
      sessionDataQueryTime,
    };
  }

  /**
   * Get detailed authentication operation statistics
   */
  getAuthOperationMetrics(): AuthOperationMetrics {
    const totalAuthOperations = Object.values(
      this.authOperationCounters
    ).reduce(function sum(a, b) {
      return a + b;
    }, 0);

    const averageResponseTime =
      this.authQueryTimes.length > 0
        ? this.authQueryTimes.reduce(function sum(a, b) {
            return a + b;
          }, 0) / this.authQueryTimes.length
        : 0;

    return {
      ...this.authOperationCounters,
      totalAuthOperations,
      averageResponseTime,
    };
  }

  /**
   * Monitor authentication database health
   */
  async monitorAuthDatabaseHealth(client: PrismaClient): Promise<{
    healthy: boolean;
    authPerformanceOk: boolean;
    connectionHealthy: boolean;
    slowAuthQueries: number;
    recommendations: string[];
  }> {
    const metrics = await this.getAuthDatabaseMetrics(client);
    const operationStats = this.getAuthOperationMetrics();

    const authPerformanceThreshold = 100; // ms
    const slowQueryThreshold = 50; // ms

    const authPerformanceOk =
      metrics.averageAuthQueryTime < authPerformanceThreshold;
    const connectionHealthy = metrics.connectionTime < 20; // ms
    const slowAuthQueries = this.authQueryTimes.filter(function filterSlow(
      time
    ) {
      return time > slowQueryThreshold;
    }).length;

    const recommendations: string[] = [];

    if (!authPerformanceOk) {
      recommendations.push(
        'Consider optimizing authentication queries or adding indexes'
      );
    }

    if (!connectionHealthy) {
      recommendations.push(
        'Database connection overhead is high - check connection pooling'
      );
    }

    if (slowAuthQueries > operationStats.totalAuthOperations * 0.1) {
      recommendations.push(
        'High number of slow authentication queries detected'
      );
    }

    if (metrics.authConnectionEfficiency < 50) {
      recommendations.push('Low connection efficiency for auth operations');
    }

    return {
      healthy: authPerformanceOk && connectionHealthy,
      authPerformanceOk,
      connectionHealthy,
      slowAuthQueries,
      recommendations,
    };
  }

  /**
   * Get authentication performance summary for monitoring dashboards
   */
  getAuthPerformanceSummary(): {
    summary: string;
    metrics: AuthOperationMetrics;
    performance: {
      averageAuthTime: number;
      averageSessionTime: number;
      efficiencyRating: 'excellent' | 'good' | 'needs_improvement' | 'poor';
    };
  } {
    const operationMetrics = this.getAuthOperationMetrics();
    const averageSessionTime =
      this.sessionQueryTimes.length > 0
        ? this.sessionQueryTimes.reduce(function sum(a, b) {
            return a + b;
          }, 0) / this.sessionQueryTimes.length
        : 0;

    let efficiencyRating: 'excellent' | 'good' | 'needs_improvement' | 'poor';

    if (operationMetrics.averageResponseTime < 25) {
      efficiencyRating = 'excellent';
    } else if (operationMetrics.averageResponseTime < 50) {
      efficiencyRating = 'good';
    } else if (operationMetrics.averageResponseTime < 100) {
      efficiencyRating = 'needs_improvement';
    } else {
      efficiencyRating = 'poor';
    }

    const summary =
      `Auth DB Operations: ${operationMetrics.totalAuthOperations}, ` +
      `Avg Response: ${operationMetrics.averageResponseTime.toFixed(2)}ms, ` +
      `Rating: ${efficiencyRating}`;

    return {
      summary,
      metrics: operationMetrics,
      performance: {
        averageAuthTime: operationMetrics.averageResponseTime,
        averageSessionTime,
        efficiencyRating,
      },
    };
  }

  /**
   * Reset monitoring metrics for testing
   */
  resetMetrics(): void {
    this.authOperationCounters = {
      userLookups: 0,
      sessionQueries: 0,
      batchOperations: 0,
      validationChecks: 0,
    };
    this.authQueryTimes = [];
    this.sessionQueryTimes = [];
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetricsForMonitoring(): {
    timestamp: string;
    authOperations: AuthOperationMetrics;
    performance: {
      averageAuthTime: number;
      p95AuthTime: number;
      slowQueryCount: number;
      efficiencyScore: number;
    };
  } {
    const operationMetrics = this.getAuthOperationMetrics();

    // Calculate 95th percentile
    const sortedTimes = [...this.authQueryTimes].sort(function sortAscending(
      a,
      b
    ) {
      return a - b;
    });
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p95AuthTime = sortedTimes[p95Index] || 0;

    const slowQueryCount = this.authQueryTimes.filter(function filterSlow(
      time
    ) {
      return time > 50;
    }).length;

    // Calculate efficiency score (0-100)
    const efficiencyScore = Math.max(
      0,
      100 - operationMetrics.averageResponseTime
    );

    return {
      timestamp: new Date().toISOString(),
      authOperations: operationMetrics,
      performance: {
        averageAuthTime: operationMetrics.averageResponseTime,
        p95AuthTime,
        slowQueryCount,
        efficiencyScore,
      },
    };
  }
}

export const authDatabaseMonitorService = new AuthDatabaseMonitorService();
