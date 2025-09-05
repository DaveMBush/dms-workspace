import { AuthError, AuthErrorType } from '../types/auth.types';

export function extractTokenFromHeader(authHeader: string | undefined): string {
  if (authHeader === undefined) {
    throw new AuthError(
      'Authorization header is required',
      AuthErrorType.MissingToken,
      401
    );
  }

  if (!authHeader.startsWith('Bearer ')) {
    throw new AuthError(
      'Invalid authorization header format',
      AuthErrorType.InvalidFormat,
      401
    );
  }

  return authHeader.substring(7);
}
