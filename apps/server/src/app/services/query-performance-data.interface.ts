export interface QueryPerformanceData {
  startTime: number;
  endTime: number;
  duration: number;
  query: string;
  params?: unknown[];
}
