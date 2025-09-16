/**
 * Performance test helper - measure operation time
 */
export async function measureOperationTime<T>(
  operation: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const startTime = Date.now();
  const result = await operation();
  const duration = Date.now() - startTime;

  return { result, duration };
}
