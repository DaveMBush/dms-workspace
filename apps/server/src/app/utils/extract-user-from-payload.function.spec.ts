import { describe, expect, it } from 'vitest';

import { CognitoJwtPayload } from '../types/auth.types';
import { extractUserFromPayload } from './extract-user-from-payload.function';

describe('extractUserFromPayload', () => {
  it('should extract user from valid payload with groups', () => {
    const payload: CognitoJwtPayload = {
      sub: 'user-123',
      email: 'test@example.com',
      'cognito:username': 'testuser',
      'cognito:groups': ['admin', 'users'],
      iat: 1234567890,
      exp: 1234567890,
      aud: 'audience-id',
      iss: 'issuer-url',
    };

    const user = extractUserFromPayload(payload);

    expect(user).toEqual({
      sub: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      groups: ['admin', 'users'],
    });
  });

  it('should extract user from payload without groups', () => {
    const payload: CognitoJwtPayload = {
      sub: 'user-456',
      email: 'nogroups@example.com',
      'cognito:username': 'nogroups',
      iat: 1234567890,
      exp: 1234567890,
      aud: 'audience-id',
      iss: 'issuer-url',
    };

    const user = extractUserFromPayload(payload);

    expect(user).toEqual({
      sub: 'user-456',
      email: 'nogroups@example.com',
      username: 'nogroups',
      groups: [],
    });
  });

  it('should handle empty groups array', () => {
    const payload: CognitoJwtPayload = {
      sub: 'user-789',
      email: 'empty@example.com',
      'cognito:username': 'emptygroups',
      'cognito:groups': [],
      iat: 1234567890,
      exp: 1234567890,
      aud: 'audience-id',
      iss: 'issuer-url',
    };

    const user = extractUserFromPayload(payload);

    expect(user.groups).toEqual([]);
  });
});
