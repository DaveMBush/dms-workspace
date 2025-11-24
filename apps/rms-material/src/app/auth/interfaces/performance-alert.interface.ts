/**
 * Performance alert from logging service
 */
export interface PerformanceAlert {
  type: 'critical' | 'warning';
  message: string;
  timestamp: number;
  operation: string;
  duration: number;
}
