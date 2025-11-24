/**
 * Utility function for storing metrics with size limit
 */
export function storeMetricsWithLimit<T>(
  currentMetrics: T[],
  newMetric: T,
  maxSize: number
): T[] {
  const newMetrics = [newMetric, ...currentMetrics];

  // Keep only the most recent metrics
  if (newMetrics.length > maxSize) {
    newMetrics.splice(maxSize);
  }

  return newMetrics;
}
