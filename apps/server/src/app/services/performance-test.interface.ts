export interface PerformanceTest {
  name: string;
  description: string;
  baselineTime: number;
  optimizedTime: number;
  improvement: number;
  passed: boolean;
}
