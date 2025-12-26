/**
 * Authentication operation timing data
 */
export interface AuthOperationMetric {
  operation: 'interceptor' | 'login' | 'logout' | 'refresh' | 'validate';
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  errorType?: string;
  cacheHit?: boolean;
  correlationId?: string;
}
