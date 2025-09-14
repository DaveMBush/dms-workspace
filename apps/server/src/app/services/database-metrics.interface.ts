import { SlowQuery } from './slow-query.interface';

export interface DatabaseMetrics {
  connectionTime: number;
  queryTime: number;
  poolUtilization?: number;
  slowQueries: SlowQuery[];
  totalTime: number;
}
