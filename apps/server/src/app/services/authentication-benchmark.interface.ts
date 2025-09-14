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
