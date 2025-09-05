import { AuthErrorResponse } from '../types/auth.types';

export function createErrorResponse(
  error: string,
  message: string,
  requestId?: string
): AuthErrorResponse {
  return {
    error,
    message,
    requestId,
    timestamp: new Date().toISOString(),
  };
}
