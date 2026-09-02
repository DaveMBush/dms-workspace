import { AuthError, AuthErrorCode } from '../auth.types';

/**
 * Convert auth error objects to user-friendly messages
 */
export function getAuthErrorMessage(error: AuthError): string {
  const errorCode = error.name ?? error.code;
  const messages: Record<string, string> = {
    [AuthErrorCode.USER_NOT_CONFIRMED]:
      'Please check your email and confirm your account before signing in.',
    [AuthErrorCode.NOT_AUTHORIZED]:
      'Incorrect email or password. Please try again.',
    [AuthErrorCode.USER_NOT_FOUND]: 'No account found with this email address.',
    [AuthErrorCode.TOO_MANY_REQUESTS]:
      'Too many login attempts. Please wait a few minutes before trying again.',
    [AuthErrorCode.INVALID_PASSWORD]:
      'Password does not meet the required criteria.',
    [AuthErrorCode.PASSWORD_RESET_REQUIRED]:
      'Password reset is required. Please check your email.',
    [AuthErrorCode.NETWORK_ERROR]:
      'Network connection error. Please check your internet connection.',
  };
  return (
    messages[errorCode] ??
    error.message ??
    'Authentication failed. Please try again.'
  );
}
