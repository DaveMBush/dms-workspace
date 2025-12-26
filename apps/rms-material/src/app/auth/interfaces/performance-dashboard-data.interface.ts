import type { AuthPerformanceMetrics } from './auth-performance-metrics.interface';
import type { CachePerformanceMetrics } from './cache-performance-metrics.interface';
import type { PerformanceAlert } from './performance-alert.interface';
import type { SystemPerformanceMetrics } from './system-performance-metrics.interface';

/**
 * Dashboard performance data structure
 */
export interface PerformanceDashboardData {
  authMetrics: AuthPerformanceMetrics;
  cacheMetrics: CachePerformanceMetrics;
  systemMetrics: SystemPerformanceMetrics;
  alerts: PerformanceAlert[];
  timestamp: number;
}
