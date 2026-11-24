import type { FastifyRequest } from 'fastify';
import { describe, expect, it } from 'vitest';

import { getCookieValue } from './get-cookie-value.function';

function makeRequest(cookieHeader: string | undefined): FastifyRequest {
  return { headers: cookieHeader === undefined ? {} : { cookie: cookieHeader } };
}

describe('getCookieValue', () => {
  it('returns the value for a single cookie', () => {
    const request = makeRequest('__Secure-auth-token=abc123');
    expect(getCookieValue(request, '__Secure-auth-token')).toBe('abc123');
  });

  it('finds a cookie among several', () => {
    const request = makeRequest(
      'a=1; __Secure-auth-token=abc123; csrf-token=xyz'
    );
    expect(getCookieValue(request, '__Secure-auth-token')).toBe('abc123');
    expect(getCookieValue(request, 'csrf-token')).toBe('xyz');
  });

  it('returns undefined when the cookie is absent', () => {
    const request = makeRequest('a=1; b=2');
    expect(getCookieValue(request, '__Secure-auth-token')).toBeUndefined();
  });

  it('returns undefined when there is no Cookie header', () => {
    expect(getCookieValue(makeRequest(undefined), 'csrf-token')).toBeUndefined();
  });

  it('decodes percent-encoded values', () => {
    const request = makeRequest(`token=${encodeURIComponent('a b/c=d')}`);
    expect(getCookieValue(request, 'token')).toBe('a b/c=d');
  });

  it('returns undefined for a malformed encoded value instead of throwing', () => {
    const request = makeRequest('token=%E0%A4%A');
    expect(getCookieValue(request, 'token')).toBeUndefined();
  });

  it('does not match cookie names that are prefixes of the target', () => {
    const request = makeRequest('__Secure-auth-token-x=other; __Secure-auth-token=real');
    expect(getCookieValue(request, '__Secure-auth-token')).toBe('real');
  });
});
