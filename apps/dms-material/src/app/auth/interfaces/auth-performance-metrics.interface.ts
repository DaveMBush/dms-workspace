/**
 * Authentication performance metrics
 */
export interface AuthPerformanceMetrics {
  averageLoginTime: number;
  averageRefreshTime: number;
  averageInterceptorTime: number;
  successRate: number;
  requestVolume: number;
  slowRequestCount: number;
}
