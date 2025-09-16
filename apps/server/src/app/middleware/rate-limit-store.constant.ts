import { RateLimitEntry } from './rate-limit-entry.interface';

// In-memory storage (use Redis in production)
export const rateLimitStore = new Map<string, RateLimitEntry>();

function removeExpiredKeys(): void {
  const now = Date.now();
  const expiredKeys: string[] = [];
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      expiredKeys.push(key);
    }
  }
  function deleteExpiredKey(key: string): boolean {
    return rateLimitStore.delete(key);
  }
  expiredKeys.forEach(deleteExpiredKey);
}

// Cleanup old entries every 5 minutes
function cleanupExpiredEntries(): void {
  // Check if store has entries before processing
  if (rateLimitStore.size > 0) {
    removeExpiredKeys();
  }
}
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
