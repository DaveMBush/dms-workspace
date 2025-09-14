import { DatabaseMetrics } from './database-metrics.interface';

export interface BenchmarkResults {
  testName: string;
  iterations: number;
  results: {
    baseline: DatabaseMetrics;
    optimized: DatabaseMetrics;
    improvement: {
      connectionTimeImprovement: number;
      queryTimeImprovement: number;
      totalTimeImprovement: number;
      improvementPercentage: number;
    };
  };
  timestamp: Date;
}
