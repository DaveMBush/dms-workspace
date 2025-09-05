// Shared authentication failure storage - singleton pattern with multiple access functions
/* eslint-disable @smarttools/one-exported-item-per-file -- Store module needs multiple accessors for singleton pattern */
const authFailures = new Map<string, { count: number; lastAttempt: number }>();

export function getAuthFailureData(
  clientIP: string
): { count: number; lastAttempt: number } | undefined {
  return authFailures.get(clientIP);
}

export function setAuthFailureData(
  clientIP: string,
  data: { count: number; lastAttempt: number }
): void {
  authFailures.set(clientIP, data);
}

export function deleteAuthFailureData(clientIP: string): void {
  authFailures.delete(clientIP);
}
