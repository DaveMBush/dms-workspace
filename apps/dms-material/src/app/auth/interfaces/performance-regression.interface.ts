/**
 * Performance regression data
 */
export interface PerformanceRegression {
  operation: string;
  currentAverage: number;
  baselineAverage: number;
  percentageChange: number;
  significance: 'major' | 'minor' | 'moderate';
  detectedAt: number;
}
