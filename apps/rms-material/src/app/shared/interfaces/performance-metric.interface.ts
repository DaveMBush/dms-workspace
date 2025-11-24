/**
 * Performance metric data structure
 */
export interface PerformanceMetric {
  requestId: string;
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  statusCode?: number;
  url?: string;
  method?: string;
  cacheHit?: boolean;
  timestamp?: number;
}
