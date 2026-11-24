import { describe, expect, it } from 'vitest';
import { validateMockToken } from './validate-mock-token.function';

function makeMockJwt(overrides: Record<string, unknown> = {}): string {
  const header = Buffer.from(JSON.stringify({ alg: 'MOCK', typ: 'JWT' })).toString(
    'base64url',
  );
  const payload = Buffer.from(
    JSON.stringify({
      email: 'user@example.com',
      username: 'user@example.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      iss: 'mock-auth-service',
      remember_me: false,
      ...overrides,
    }),
  ).toString('base64url');
  const signature = Buffer.from('mock-signature').toString('base64url');
  return `${header}.${payload}.${signature}`;
}

describe('validateMockToken', () => {
  it('accepts a well-formed, unexpired mock token and builds an AuthenticatedUser', () => {
    const user = validateMockToken(makeMockJwt());
    expect(user.email).toBe('user@example.com');
    expect(user.username).toBe('user@example.com');
    // No sub in the payload -> derived from email.
    expect(user.sub).toBe('mock-user@example.com');
    expect(user.groups).toEqual([]);
  });

  it('uses an explicit sub when present', () => {
    const user = validateMockToken(makeMockJwt({ sub: 'explicit-sub' }));
    expect(user.sub).toBe('explicit-sub');
  });

  it('rejects a token with the wrong issuer', () => {
    expect(() => validateMockToken(makeMockJwt({ iss: 'evil-issuer' }))).toThrow(
      /issuer/i,
    );
  });

  it('rejects an expired token', () => {
    expect(() =>
      validateMockToken(makeMockJwt({ exp: Math.floor(Date.now() / 1000) - 10 })),
    ).toThrow(/expired/i);
  });

  it('rejects a malformed token (not three segments)', () => {
    expect(() => validateMockToken('not-a-jwt')).toThrow(/format/i);
  });

  it('rejects a token with an undecodable payload', () => {
    const header = Buffer.from('{}').toString('base64url');
    expect(() => validateMockToken(`${header}.!!!.sig`)).toThrow(
      /payload/i,
    );
  });
});
