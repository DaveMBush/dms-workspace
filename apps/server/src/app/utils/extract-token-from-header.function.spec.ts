import { describe, expect, it } from 'vitest';

import { AuthError, AuthErrorType } from '../types/auth.types';
import { extractTokenFromHeader } from './extract-token-from-header.function';

describe('extractTokenFromHeader', () => {
  it('should extract token from valid Bearer header', () => {
    const token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.test.signature';
    const authHeader = `Bearer ${token}`;

    const result = extractTokenFromHeader(authHeader);

    expect(result).toBe(token);
  });

  it('should throw AuthError for missing header', () => {
    expect(() => extractTokenFromHeader(undefined)).toThrow(AuthError);

    try {
      extractTokenFromHeader(undefined);
    } catch (error) {
      expect(error).toBeInstanceOf(AuthError);
      expect((error as AuthError).type).toBe(AuthErrorType.MissingToken);
      expect((error as AuthError).statusCode).toBe(401);
    }
  });

  it('should throw AuthError for invalid header format', () => {
    expect(() => extractTokenFromHeader('InvalidFormat token')).toThrow(
      AuthError
    );

    try {
      extractTokenFromHeader('InvalidFormat token');
    } catch (error) {
      expect(error).toBeInstanceOf(AuthError);
      expect((error as AuthError).type).toBe(AuthErrorType.InvalidFormat);
      expect((error as AuthError).statusCode).toBe(401);
    }
  });

  it('should throw AuthError for missing Bearer prefix', () => {
    expect(() => extractTokenFromHeader('token-without-bearer')).toThrow(
      AuthError
    );
  });

  it('should handle Bearer with extra spaces', () => {
    const token = 'valid-token';
    const result = extractTokenFromHeader(`Bearer ${token}`);
    expect(result).toBe(token);
  });
});
