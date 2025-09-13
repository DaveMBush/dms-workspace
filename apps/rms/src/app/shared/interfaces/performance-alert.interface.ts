import type { PerformanceMetric } from './performance-metric.interface';

/**
 * Performance alert data
 */
export interface PerformanceAlert {
  type: 'critical' | 'warning';
  metric: PerformanceMetric;
  threshold: number;
  message: string;
  timestamp: number;
}
