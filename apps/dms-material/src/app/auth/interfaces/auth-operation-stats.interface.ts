/**
 * Statistics for a specific auth operation type
 */
export interface AuthOperationStats {
  count: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  successRate: number;
  cacheHitRate: number;
}
