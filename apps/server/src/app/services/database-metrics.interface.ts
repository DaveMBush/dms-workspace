export interface DatabaseMetrics {
  connectionTime: number;
  queryTime: number;
  poolUtilization?: number;
  slowQueries: SlowQuery[];
  totalTime: number;
}

export interface SlowQuery {
  query: string;
  duration: number;
  timestamp: Date;
  params?: unknown[];
}

export interface QueryPerformanceData {
  startTime: number;
  endTime: number;
  duration: number;
  query: string;
  params?: unknown[];
}
