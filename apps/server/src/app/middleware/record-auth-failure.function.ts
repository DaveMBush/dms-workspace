import {
  getAuthFailureData,
  setAuthFailureData,
} from './auth-failure-store.function';

const FAILURE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function recordAuthFailure(clientIP: string): void {
  const now = Date.now();
  const failures = getAuthFailureData(clientIP);

  if (
    failures === undefined ||
    now - failures.lastAttempt > FAILURE_WINDOW_MS
  ) {
    setAuthFailureData(clientIP, { count: 1, lastAttempt: now });
  } else {
    failures.count++;
    failures.lastAttempt = now;
  }
}
