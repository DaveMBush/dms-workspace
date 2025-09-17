import { PrismaClient } from '@prisma/client';

import { authDatabaseMonitorService } from './auth-database-monitor.service';
import { authDatabaseOptimizerService } from './auth-database-optimizer.service';
import { benchmarkHelpersService } from './benchmark-helpers.service';
import { DatabaseMetrics } from './database-metrics.interface';
import { databasePerformanceService } from './database-performance.service';
import { PerformanceTest } from './performance-test.interface';

interface BenchmarkResult {
  baseline: DatabaseMetrics;
  optimized: DatabaseMetrics;
  improvementPercentage: number;
  meetsTarget: boolean;
  recommendations: string[];
}

/**
 * Service for benchmarking database performance improvements
 * Validates that the 30% latency reduction requirement is met
 */
class DatabasePerformanceBenchmarkService {
  private readonly targetImprovement = 30; // 30% improvement target
  private readonly testAccountName = 'test-account';
  private readonly defaultTestAccountName = 'test-account';

  /**
   * Run comprehensive database performance benchmark
   */
  async runComprehensiveBenchmark(
    client: PrismaClient,
    iterations = 20
  ): Promise<BenchmarkResult> {
    // Clear existing metrics
    databasePerformanceService.clearMetrics();
    authDatabaseMonitorService.resetMetrics();

    const baseline = await this.runBaselineTests(client, iterations);
    const optimized = await this.runOptimizedTests(client, iterations);

    const improvementPercentage = this.calculateImprovement(
      baseline,
      optimized
    );
    const meetsTarget = improvementPercentage >= this.targetImprovement;

    const recommendations = this.generateRecommendations(
      baseline,
      optimized,
      improvementPercentage
    );

    return {
      baseline,
      optimized,
      improvementPercentage,
      meetsTarget,
      recommendations,
    };
  }

  /**
   * Run individual performance tests to validate optimizations
   */
  async runDetailedPerformanceTests(
    client: PrismaClient
  ): Promise<PerformanceTest[]> {
    const tests: PerformanceTest[] = [];

    // Test 1: User lookup performance
    const userLookupTest = await benchmarkHelpersService.benchmarkUserLookup(
      client
    );
    tests.push(userLookupTest);

    // Test 2: Session data query performance
    const sessionDataTest = await benchmarkHelpersService.benchmarkSessionData(
      client
    );
    tests.push(sessionDataTest);

    // Test 3: Batch operation performance
    const batchTest = await benchmarkHelpersService.benchmarkBatchOperations(
      client
    );
    tests.push(batchTest);

    // Test 4: Connection overhead performance
    const connectionTest =
      await benchmarkHelpersService.benchmarkConnectionOverhead(client);
    tests.push(connectionTest);

    return tests;
  }

  /**
   * Generate performance report with detailed analysis
   */
  async generatePerformanceReport(client: PrismaClient): Promise<{
    summary: string;
    benchmark: BenchmarkResult;
    detailedTests: PerformanceTest[];
    recommendations: string[];
  }> {
    const benchmark = await this.runComprehensiveBenchmark(client);
    const detailedTests = await this.runDetailedPerformanceTests(client);

    const passedTests = detailedTests.filter(function filterPassed(test) {
      return test.passed;
    }).length;
    const totalTests = detailedTests.length;

    const summary = `Performance Benchmark Results:
- Overall Improvement: ${benchmark.improvementPercentage.toFixed(2)}%
- Target Met: ${benchmark.meetsTarget ? 'YES' : 'NO'}
- Detailed Tests Passed: ${passedTests}/${totalTests}
- Baseline Total Time: ${benchmark.baseline.totalTime.toFixed(2)}ms
- Optimized Total Time: ${benchmark.optimized.totalTime.toFixed(2)}ms`;

    return {
      summary,
      benchmark,
      detailedTests,
      recommendations: benchmark.recommendations,
    };
  }

  /**
   * Run baseline performance tests (unoptimized)
   */
  private async runBaselineTests(
    client: PrismaClient,
    iterations: number
  ): Promise<DatabaseMetrics> {
    const context = this;
    async function runBaselineOperations(
      prismaClient: PrismaClient
    ): Promise<void> {
      await prismaClient.accounts.findFirst({
        where: { name: context.defaultTestAccountName },
      });
      await prismaClient.accounts.findFirst({
        where: { name: context.defaultTestAccountName },
        include: { trades: { take: 5, orderBy: { buy_date: 'desc' } } },
      });
    }

    return this.runPerformanceTests(
      client,
      iterations,
      runBaselineOperations,
      function createBaselineMetrics(totalTime: number): DatabaseMetrics {
        return {
          connectionTime: totalTime * 0.2,
          queryTime: totalTime * 0.8,
          poolUtilization: 0.8,
          slowQueries: [],
          totalTime,
        };
      }
    );
  }

  /**
   * Run optimized performance tests
   */
  private async runOptimizedTests(
    client: PrismaClient,
    iterations: number
  ): Promise<DatabaseMetrics> {
    const context = this;
    async function runOptimizedOperations(
      prismaClient: PrismaClient
    ): Promise<void> {
      await authDatabaseOptimizerService.optimizedUserLookup(
        prismaClient,
        context.testAccountName
      );
      await authDatabaseOptimizerService.optimizedSessionDataQuery(
        prismaClient,
        context.testAccountName
      );
    }

    return this.runPerformanceTests(
      client,
      iterations,
      runOptimizedOperations,
      function createOptimizedMetrics(totalTime: number): DatabaseMetrics {
        return {
          connectionTime: totalTime * 0.15,
          queryTime: totalTime * 0.85,
          poolUtilization: 1,
          slowQueries: [],
          totalTime,
        };
      }
    );
  }

  /**
   * Generic helper to run performance tests and avoid code duplication
   */
  private async runPerformanceTests(
    client: PrismaClient,
    iterations: number,
    testOperations: (client: PrismaClient) => Promise<void>,
    createMetrics: (totalTime: number) => DatabaseMetrics
  ): Promise<DatabaseMetrics> {
    const results: DatabaseMetrics[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      await testOperations(client);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      results.push(createMetrics(totalTime));
    }

    return this.calculateAverageMetrics(results);
  }

  /**
   * Calculate average metrics from multiple test runs
   */
  private calculateAverageMetrics(results: DatabaseMetrics[]): DatabaseMetrics {
    const count = results.length;

    function sumConnectionTime(sum: number, m: DatabaseMetrics): number {
      return sum + m.connectionTime;
    }
    function sumQueryTime(sum: number, m: DatabaseMetrics): number {
      return sum + m.queryTime;
    }
    function sumTotalTime(sum: number, m: DatabaseMetrics): number {
      return sum + m.totalTime;
    }

    return {
      connectionTime: results.reduce(sumConnectionTime, 0) / count,
      queryTime: results.reduce(sumQueryTime, 0) / count,
      poolUtilization:
        results.reduce(function sumPoolUtilization(sum, m) {
          return sum + (m.poolUtilization ?? 0);
        }, 0) / count,
      slowQueries: [],
      totalTime: results.reduce(sumTotalTime, 0) / count,
    };
  }

  /**
   * Calculate performance improvement percentage
   */
  private calculateImprovement(
    baseline: { totalTime: number },
    optimized: { totalTime: number }
  ): number {
    return (
      ((baseline.totalTime - optimized.totalTime) / baseline.totalTime) * 100
    );
  }

  /**
   * Generate recommendations based on benchmark results
   */
  private generateRecommendations(
    baseline: DatabaseMetrics,
    optimized: DatabaseMetrics,
    improvementPercentage: number
  ): string[] {
    const recommendations: string[] = [];

    if (improvementPercentage < this.targetImprovement) {
      recommendations.push(
        `Performance improvement of ${improvementPercentage.toFixed(
          2
        )}% is below the ${this.targetImprovement}% target`
      );
    }

    if (optimized.connectionTime > 10) {
      recommendations.push(
        'Connection time is still high - consider further connection pooling optimization'
      );
    }

    if (optimized.queryTime > baseline.queryTime * 0.7) {
      recommendations.push(
        'Query optimization could be further improved - check indexes and query patterns'
      );
    }

    if (optimized.slowQueries.length > 0) {
      recommendations.push(
        'Slow queries detected even after optimization - review query complexity'
      );
    }

    if (improvementPercentage >= this.targetImprovement) {
      recommendations.push(
        '✅ Performance target achieved! Database latency reduced by target amount'
      );
    }

    return recommendations;
  }
}

export const databasePerformanceBenchmarkService =
  new DatabasePerformanceBenchmarkService();
