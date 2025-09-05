import jwt from 'jsonwebtoken';

import { cognitoConfig } from '../config/cognito.config';
import {
  AuthError,
  AuthErrorType,
  CognitoJwtPayload,
} from '../types/auth.types';

function handleJwtError(error: unknown): AuthError {
  if (!(error instanceof Error)) {
    return new AuthError(
      'Token validation failed',
      AuthErrorType.InvalidSignature,
      401
    );
  }

  if (error.name === 'TokenExpiredError') {
    return new AuthError('Token has expired', AuthErrorType.ExpiredToken, 401);
  }

  if (error.name === 'JsonWebTokenError') {
    if (error.message.includes('invalid signature')) {
      return new AuthError(
        'Token signature validation failed',
        AuthErrorType.InvalidSignature,
        401
      );
    }

    if (error.message.includes('invalid audience')) {
      return new AuthError(
        'Token audience validation failed',
        AuthErrorType.InvalidAudience,
        401
      );
    }

    if (error.message.includes('invalid issuer')) {
      return new AuthError(
        'Token issuer validation failed',
        AuthErrorType.InvalidIssuer,
        401
      );
    }
  }

  return new AuthError(
    'Token validation failed',
    AuthErrorType.InvalidSignature,
    401
  );
}

export function verifyJwtToken(
  token: string,
  signingKey: string
): CognitoJwtPayload {
  try {
    return jwt.verify(token, signingKey, {
      issuer: cognitoConfig.issuer,
      audience: cognitoConfig.userPoolClientId,
      algorithms: ['RS256'],
    }) as CognitoJwtPayload;
  } catch (error) {
    throw handleJwtError(error);
  }
}
