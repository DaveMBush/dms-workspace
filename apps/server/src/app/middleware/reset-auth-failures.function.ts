import { deleteAuthFailureData } from './auth-failure-store.function';

export function resetAuthFailures(clientIP: string): void {
  deleteAuthFailureData(clientIP);
}
