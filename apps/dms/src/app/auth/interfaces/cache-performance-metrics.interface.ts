/**
 * Cache performance metrics
 */
export interface CachePerformanceMetrics {
  hitRate: number;
  missRate: number;
  totalRequests: number;
  averageRetrievalTime: number;
  cacheSize: number;
  evictionCount: number;
}
