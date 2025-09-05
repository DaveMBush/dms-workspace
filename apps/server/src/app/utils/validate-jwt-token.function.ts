import jwt from 'jsonwebtoken';

import {
  AuthenticatedUser,
  AuthError,
  AuthErrorType,
} from '../types/auth.types';
import { extractUserFromPayload } from './extract-user-from-payload.function';
import { getSigningKey } from './get-signing-key.function';
import { verifyJwtToken } from './verify-jwt-token.function';

export async function validateJwtToken(
  token: string
): Promise<AuthenticatedUser> {
  // Decode token to get header (without verification)
  const decoded = jwt.decode(token, { complete: true });

  if (decoded?.header?.kid === undefined) {
    throw new AuthError(
      'Invalid token format',
      AuthErrorType.InvalidFormat,
      401
    );
  }

  // Get signing key
  const signingKey = await getSigningKey(decoded.header.kid);

  // Verify and decode token
  const payload = verifyJwtToken(token, signingKey);

  // Extract user information
  return extractUserFromPayload(payload);
}
