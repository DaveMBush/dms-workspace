import jwksClient from 'jwks-rsa';

import { cognitoConfig } from '../config/cognito.config';
import { AuthError, AuthErrorType } from '../types/auth.types';

// Create JWKS client with caching
const client = jwksClient({
  jwksUri: cognitoConfig.jwksUri,
  cache: true,
  cacheMaxAge: 86_400_000, // 24 hours
  rateLimit: true,
  jwksRequestsPerMinute: 10,
  requestHeaders: {
    'User-Agent': 'DMS-Server/1.0',
  },
});

export async function getSigningKey(kid: string): Promise<string> {
  try {
    const key = await client.getSigningKey(kid);
    return key.getPublicKey();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown JWKS error';
    throw new AuthError(
      `Failed to retrieve signing key: ${message}`,
      AuthErrorType.JwksError,
      401
    );
  }
}
