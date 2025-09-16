import { rateLimitStore } from './rate-limit-store.constant';

export function getRateLimitStats(): Record<
  string,
  { count: number; failures: number; resetTime: number }
> {
  const stats: Record<
    string,
    { count: number; failures: number; resetTime: number }
  > = {};

  for (const [key, entry] of rateLimitStore.entries()) {
    stats[key] = {
      count: entry.count,
      failures: entry.failures,
      resetTime: entry.resetTime,
    };
  }

  return stats;
}
