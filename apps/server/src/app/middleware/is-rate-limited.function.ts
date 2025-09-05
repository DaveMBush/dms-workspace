import {
  deleteAuthFailureData,
  getAuthFailureData,
} from './auth-failure-store.function';

const MAX_AUTH_FAILURES = 10;
const FAILURE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function isRateLimited(clientIP: string): boolean {
  const now = Date.now();
  const failures = getAuthFailureData(clientIP);

  if (failures === undefined) {
    return false;
  }

  // Reset counter if outside window
  if (now - failures.lastAttempt > FAILURE_WINDOW_MS) {
    deleteAuthFailureData(clientIP);
    return false;
  }

  return failures.count >= MAX_AUTH_FAILURES;
}
