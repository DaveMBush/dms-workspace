import { RateLimitConfig } from './rate-limit-config.interface';
import { RateLimitEntry } from './rate-limit-entry.interface';
import { rateLimitStore } from './rate-limit-store.constant';

export function updateRateLimitEntry(
  key: string,
  config: RateLimitConfig,
  isSuccess?: boolean
): RateLimitEntry {
  const now = Date.now();
  const resetTime = now + config.windowMs;

  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetTime < now) {
    // Create new entry or reset expired entry
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime,
      failures: isSuccess === false ? 1 : 0,
    };
    rateLimitStore.set(key, newEntry);
    return newEntry;
  }

  // Update existing entry
  if (config.skipSuccessfulRequests !== true || isSuccess !== true) {
    existing.count++;
  }

  if (isSuccess === false) {
    existing.failures++;
  }

  rateLimitStore.set(key, existing);
  return existing;
}
