import type { AuthOperationStats } from './auth-operation-stats.interface';

/**
 * Authentication performance summary
 */
export interface AuthPerformanceSummary {
  totalOperations: number;
  averageDuration: number;
  successRate: number;
  cacheHitRate: number;
  slowOperationCount: number;
  errorBreakdown: Record<string, number>;
  operationBreakdown: Record<string, AuthOperationStats>;
}
