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

export interface AuthenticationBenchmark {
  userLookupTime: {
    baseline: number;
    optimized: number;
    improvement: number;
  };
  sessionDataLoadTime: {
    baseline: number;
    optimized: number;
    improvement: number;
  };
  batchAccountLoadTime: {
    baseline: number;
    optimized: number;
    improvement: number;
  };
  totalAuthFlowTime: {
    baseline: number;
    optimized: number;
    improvement: number;
  };
}