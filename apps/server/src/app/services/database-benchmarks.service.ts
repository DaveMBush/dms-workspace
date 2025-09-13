import { PrismaClient } from '@prisma/client';

import { databasePerformanceService } from './database-performance.service';
import { DatabaseMetrics } from './database-metrics.interface';
import { BenchmarkResults, AuthenticationBenchmark } from './benchmark-results.interface';

class DatabaseBenchmarksService {
  /**
   * Run comprehensive database performance benchmarks
   */
  async runComprehensiveBenchmarks(
    baselineClient: PrismaClient,
    optimizedClient: PrismaClient,
    iterations = 20
  ): Promise<BenchmarkResults> {
    console.log('Starting comprehensive database performance benchmarks...');

    // Baseline performance measurements
    const baselineResults: DatabaseMetrics[] = [];
    for (let i = 0; i < iterations; i++) {
      const metrics = await databasePerformanceService.getPerformanceMetrics(
        baselineClient
      );
      baselineResults.push(metrics);
    }

    // Clear metrics before optimized test
    databasePerformanceService.clearMetrics();

    // Optimized performance measurements
    const optimizedResults: DatabaseMetrics[] = [];
    for (let i = 0; i < iterations; i++) {
      const metrics = await databasePerformanceService.getPerformanceMetrics(
        optimizedClient
      );
      optimizedResults.push(metrics);
    }

    // Calculate averages
    const baseline: DatabaseMetrics = {
      connectionTime: this.average(
        baselineResults.map((r) => r.connectionTime)
      ),
      queryTime: this.average(baselineResults.map((r) => r.queryTime)),
      poolUtilization: this.average(
        baselineResults.map((r) => r.poolUtilization || 0)
      ),
      slowQueries: baselineResults.flatMap((r) => r.slowQueries),
      totalTime: this.average(baselineResults.map((r) => r.totalTime)),
    };

    const optimized: DatabaseMetrics = {
      connectionTime: this.average(
        optimizedResults.map((r) => r.connectionTime)
      ),
      queryTime: this.average(optimizedResults.map((r) => r.queryTime)),
      poolUtilization: this.average(
        optimizedResults.map((r) => r.poolUtilization || 0)
      ),
      slowQueries: optimizedResults.flatMap((r) => r.slowQueries),
      totalTime: this.average(optimizedResults.map((r) => r.totalTime)),
    };

    // Calculate improvements
    const connectionTimeImprovement =
      ((baseline.connectionTime - optimized.connectionTime) /
        baseline.connectionTime) *
      100;
    const queryTimeImprovement =
      ((baseline.queryTime - optimized.queryTime) / baseline.queryTime) * 100;
    const totalTimeImprovement =
      ((baseline.totalTime - optimized.totalTime) / baseline.totalTime) * 100;

    const results: BenchmarkResults = {
      testName: 'Comprehensive Database Performance Benchmark',
      iterations,
      results: {
        baseline,
        optimized,
        improvement: {
          connectionTimeImprovement,
          queryTimeImprovement,
          totalTimeImprovement,
          improvementPercentage: totalTimeImprovement,
        },
      },
      timestamp: new Date(),
    };

    console.log('Benchmark completed:', {
      totalTimeImprovement: `${totalTimeImprovement.toFixed(2)}%`,
      connectionTimeImprovement: `${connectionTimeImprovement.toFixed(2)}%`,
      queryTimeImprovement: `${queryTimeImprovement.toFixed(2)}%`,
    });

    return results;
  }

  /**
   * Benchmark authentication-specific operations
   */
  async benchmarkAuthenticationOperations(
    baselineClient: PrismaClient,
    optimizedClient: PrismaClient,
    iterations = 15
  ): Promise<AuthenticationBenchmark> {
    console.log('Starting authentication-specific benchmarks...');

    // Test user lookup performance
    const userLookupBaseline = await this.measureOperation(
      () =>
        baselineClient.accounts.findMany({
          take: 1,
          select: { id: true, name: true },
        }),
      iterations
    );

    const userLookupOptimized = await this.measureOperation(
      () =>
        optimizedClient.accounts.findMany({
          take: 1,
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
      iterations
    );

    // Test session data loading
    const sessionDataBaseline = await this.measureOperation(async () => {
      const accounts = await baselineClient.accounts.findMany({ take: 1 });
      if (accounts.length > 0) {
        return baselineClient.accounts.findUnique({
          where: { id: accounts[0].id },
          include: {
            trades: { take: 5, orderBy: { buy_date: 'desc' } },
            divDeposits: { take: 5, orderBy: { date: 'desc' } },
          },
        });
      }
      return null;
    }, iterations);

    const sessionDataOptimized = await this.measureOperation(async () => {
      const accounts = await optimizedClient.accounts.findMany({ take: 1 });
      if (accounts.length > 0) {
        return optimizedClient.accounts.findUnique({
          where: { id: accounts[0].id },
          select: {
            id: true,
            name: true,
            trades: {
              take: 5,
              select: { id: true, buy: true, quantity: true, buy_date: true },
              orderBy: { buy_date: 'desc' },
            },
            divDeposits: {
              take: 5,
              select: { id: true, date: true, amount: true },
              orderBy: { date: 'desc' },
            },
          },
        });
      }
      return null;
    }, iterations);

    // Test batch account loading
    const batchAccountBaseline = await this.measureOperation(async () => {
      const accounts = await baselineClient.accounts.findMany({ take: 3 });
      const ids = accounts.map((a) => a.id);
      return baselineClient.accounts.findMany({
        where: { id: { in: ids } },
        include: { trades: true, divDeposits: true },
      });
    }, iterations);

    const batchAccountOptimized = await this.measureOperation(async () => {
      const accounts = await optimizedClient.accounts.findMany({ take: 3 });
      const ids = accounts.map((a) => a.id);
      return optimizedClient.accounts.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          name: true,
          trades: { select: { id: true, sell_date: true } },
          divDeposits: { select: { id: true, date: true } },
        },
        orderBy: { name: 'asc' },
      });
    }, iterations);

    const totalAuthFlowBaseline =
      userLookupBaseline + sessionDataBaseline + batchAccountBaseline;
    const totalAuthFlowOptimized =
      userLookupOptimized + sessionDataOptimized + batchAccountOptimized;

    const benchmark: AuthenticationBenchmark = {
      userLookupTime: {
        baseline: userLookupBaseline,
        optimized: userLookupOptimized,
        improvement:
          ((userLookupBaseline - userLookupOptimized) / userLookupBaseline) *
          100,
      },
      sessionDataLoadTime: {
        baseline: sessionDataBaseline,
        optimized: sessionDataOptimized,
        improvement:
          ((sessionDataBaseline - sessionDataOptimized) / sessionDataBaseline) *
          100,
      },
      batchAccountLoadTime: {
        baseline: batchAccountBaseline,
        optimized: batchAccountOptimized,
        improvement:
          ((batchAccountBaseline - batchAccountOptimized) /
            batchAccountBaseline) *
          100,
      },
      totalAuthFlowTime: {
        baseline: totalAuthFlowBaseline,
        optimized: totalAuthFlowOptimized,
        improvement:
          ((totalAuthFlowBaseline - totalAuthFlowOptimized) /
            totalAuthFlowBaseline) *
          100,
      },
    };

    console.log('Authentication benchmark completed:', {
      totalImprovement: `${benchmark.totalAuthFlowTime.improvement.toFixed(
        2
      )}%`,
      userLookupImprovement: `${benchmark.userLookupTime.improvement.toFixed(
        2
      )}%`,
      sessionDataImprovement: `${benchmark.sessionDataLoadTime.improvement.toFixed(
        2
      )}%`,
      batchAccountImprovement: `${benchmark.batchAccountLoadTime.improvement.toFixed(
        2
      )}%`,
    });

    return benchmark;
  }

  /**
   * Validate 30% performance improvement requirement
   */
  async validatePerformanceImprovement(
    baselineClient: PrismaClient,
    optimizedClient: PrismaClient
  ): Promise<{
    achieved30PercentImprovement: boolean;
    actualImprovement: number;
    benchmarkResults: BenchmarkResults;
    authBenchmark: AuthenticationBenchmark;
  }> {
    const benchmarkResults = await this.runComprehensiveBenchmarks(
      baselineClient,
      optimizedClient
    );
    const authBenchmark = await this.benchmarkAuthenticationOperations(
      baselineClient,
      optimizedClient
    );

    const actualImprovement =
      benchmarkResults.results.improvement.improvementPercentage;
    const achieved30PercentImprovement = actualImprovement >= 30;

    console.log(
      `Performance improvement validation: ${actualImprovement.toFixed(2)}%`
    );
    console.log(
      `30% target ${achieved30PercentImprovement ? 'ACHIEVED' : 'NOT ACHIEVED'}`
    );

    return {
      achieved30PercentImprovement,
      actualImprovement,
      benchmarkResults,
      authBenchmark,
    };
  }

  /**
   * Generate performance regression detection baseline
   */
  async generateRegressionBaseline(
    client: PrismaClient,
    iterations = 25
  ): Promise<{
    averageConnectionTime: number;
    averageQueryTime: number;
    averageTotalTime: number;
    standardDeviation: {
      connectionTime: number;
      queryTime: number;
      totalTime: number;
    };
    timestamp: Date;
  }> {
    const results: DatabaseMetrics[] = [];

    for (let i = 0; i < iterations; i++) {
      const metrics = await databasePerformanceService.getPerformanceMetrics(
        client
      );
      results.push(metrics);
    }

    const averageConnectionTime = this.average(
      results.map((r) => r.connectionTime)
    );
    const averageQueryTime = this.average(results.map((r) => r.queryTime));
    const averageTotalTime = this.average(results.map((r) => r.totalTime));

    return {
      averageConnectionTime,
      averageQueryTime,
      averageTotalTime,
      standardDeviation: {
        connectionTime: this.standardDeviation(
          results.map((r) => r.connectionTime)
        ),
        queryTime: this.standardDeviation(results.map((r) => r.queryTime)),
        totalTime: this.standardDeviation(results.map((r) => r.totalTime)),
      },
      timestamp: new Date(),
    };
  }

  /**
   * Measure operation performance
   */
  private async measureOperation<T>(
    operation: () => Promise<T>,
    iterations: number
  ): Promise<number> {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      await operation();
      const endTime = performance.now();
      times.push(endTime - startTime);
    }

    return this.average(times);
  }

  /**
   * Calculate average of numbers
   */
  private average(numbers: number[]): number {
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  /**
   * Calculate standard deviation
   */
  private standardDeviation(numbers: number[]): number {
    const avg = this.average(numbers);
    const squareDiffs = numbers.map((num) => Math.pow(num - avg, 2));
    const avgSquareDiff = this.average(squareDiffs);
    return Math.sqrt(avgSquareDiff);
  }
}

export const databaseBenchmarksService = new DatabaseBenchmarksService();
