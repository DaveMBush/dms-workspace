import * as crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FastifyReply, FastifyRequest } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { csrfTokenStore } from './csrf-token-store.constant';
import { TOKEN_EXPIRY } from './token-expiry.constant';
import { validateCSRFToken } from './validate-csrf-token.function';

// node builtins load as frozen ESM namespaces in vitest 5, so `vi.spyOn` on a
// named export throws. Mock the module (repo pattern, see logger.spec.ts) and
// wrap timingSafeEqual in a spy that delegates to the real implementation, so
// comparisons stay genuine while call-count assertions work.
vi.mock('node:crypto', async () => {
  const actual = await vi.importActual<typeof crypto>('node:crypto');
  return {
    ...actual,
    timingSafeEqual: vi.fn((a: Buffer, b: Buffer) =>
      actual.timingSafeEqual(a, b),
    ),
  };
});

function makeRequest(overrides: Partial<FastifyRequest> = {}): FastifyRequest {
  const cookies = overrides.cookies ?? {};
  // extractSessionIdFromRequest reads the RAW cookie header string (regex),
  // not the parsed `cookies` object, so build it from the same map.
  const rawCookie = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');

  return {
    method: 'POST',
    url: '/api/test',
    ip: '127.0.0.1',
    cookies,
    log: {
      warn: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    ...overrides,
    headers: {
      ...(rawCookie ? { cookie: rawCookie } : {}),
      ...(overrides.headers ?? {}),
    },
  } as unknown as FastifyRequest;
}

function makeReply(): Partial<FastifyReply> {
  return {
    code: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
}

describe('validateCSRFToken', () => {
  let mockRequest: FastifyRequest;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    csrfTokenStore.clear();
    mockRequest = makeRequest();
    mockReply = makeReply();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should allow GET requests without CSRF token', async () => {
    const result = await validateCSRFToken(
      makeRequest({ method: 'GET' }),
      mockReply as FastifyReply,
    );

    expect(result).toBe(true);
    expect(mockReply.code).not.toHaveBeenCalled();
  });

  it('should allow HEAD requests without CSRF token', async () => {
    const result = await validateCSRFToken(
      makeRequest({ method: 'HEAD' }),
      mockReply as FastifyReply,
    );

    expect(result).toBe(true);
    expect(mockReply.code).not.toHaveBeenCalled();
  });

  it('should reject POST request without CSRF token', async () => {
    const result = await validateCSRFToken(
      mockRequest,
      mockReply as FastifyReply,
    );

    expect(result).toBe(false);
    expect(mockReply.code).toHaveBeenCalledWith(403);
    expect(mockReply.send).toHaveBeenCalledWith({
      error: 'Forbidden',
      message: 'CSRF token required',
      code: 'CSRF_TOKEN_MISSING',
    });
  });

  it('should reject request that presents a token but no session id', async () => {
    // The stored entry is keyed by the server-issued session id, which the
    // client must echo back via the sessionId cookie or x-session-id header.
    // Header + csrf-token cookie are present and agree (double-submit passes)
    // but no session id is presented, so the store lookup cannot happen.
    csrfTokenStore.set('server-issued-id', {
      token: 'stored-token',
      timestamp: Date.now(),
      sessionId: 'server-issued-id',
    });

    mockRequest = makeRequest({
      headers: { 'x-csrf-token': 'stored-token' },
      cookies: { 'csrf-token': 'stored-token' },
    });

    const result = await validateCSRFToken(
      mockRequest,
      mockReply as FastifyReply,
    );

    expect(result).toBe(false);
    expect(mockReply.code).toHaveBeenCalledWith(403);
    expect(mockReply.send).toHaveBeenCalledWith({
      error: 'Forbidden',
      message: 'CSRF token expired or invalid',
      code: 'CSRF_TOKEN_EXPIRED',
    });
  });

  it('should reject request whose session id is not in the store', async () => {
    mockRequest = makeRequest({
      headers: { 'x-csrf-token': 'stored-token' },
      cookies: {
        sessionId: 'unknown-session-id',
        'csrf-token': 'stored-token',
      },
    });

    const result = await validateCSRFToken(
      mockRequest,
      mockReply as FastifyReply,
    );

    expect(result).toBe(false);
    expect(mockReply.code).toHaveBeenCalledWith(403);
    expect(mockReply.send).toHaveBeenCalledWith({
      error: 'Forbidden',
      message: 'CSRF token expired or invalid',
      code: 'CSRF_TOKEN_EXPIRED',
    });
  });

  describe('stored token validation', () => {
    const sessionId = 'server-issued-session-id';
    const storedToken = 'a'.repeat(64);

    beforeEach(() => {
      csrfTokenStore.set(sessionId, {
        token: storedToken,
        timestamp: Date.now(),
        sessionId,
      });
    });

    it('should accept a valid presented token with the session cookie', async () => {
      mockRequest = makeRequest({
        headers: { 'x-csrf-token': storedToken },
        cookies: { sessionId, 'csrf-token': storedToken },
      });

      const result = await validateCSRFToken(
        mockRequest,
        mockReply as FastifyReply,
      );

      expect(result).toBe(true);
      expect(mockReply.code).not.toHaveBeenCalled();
    });

    it('should accept a valid presented token with the x-session-id header', async () => {
      mockRequest = makeRequest({
        headers: { 'x-csrf-token': storedToken, 'x-session-id': sessionId },
        cookies: { 'csrf-token': storedToken },
      });

      const result = await validateCSRFToken(
        mockRequest,
        mockReply as FastifyReply,
      );

      expect(result).toBe(true);
    });

    it('should reject when header and cookie tokens disagree', async () => {
      // Double-submit: the presented token must match in BOTH the header and
      // the httpOnly cookie before the stored entry is even consulted.
      mockRequest = makeRequest({
        headers: { 'x-csrf-token': storedToken },
        cookies: { sessionId, 'csrf-token': 'stale-cookie-token' },
      });

      const result = await validateCSRFToken(
        mockRequest,
        mockReply as FastifyReply,
      );

      expect(result).toBe(false);
      expect(mockReply.code).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Invalid CSRF token',
        code: 'CSRF_TOKEN_INVALID',
      });
    });

    it('should reject a mismatched presented token', async () => {
      mockRequest = makeRequest({
        headers: { 'x-csrf-token': 'b'.repeat(64) },
        cookies: { sessionId, 'csrf-token': 'b'.repeat(64) },
      });

      const result = await validateCSRFToken(
        mockRequest,
        mockReply as FastifyReply,
      );

      expect(result).toBe(false);
      expect(mockReply.code).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Invalid CSRF token',
        code: 'CSRF_TOKEN_INVALID',
      });
    });
  });

  describe('constant-time comparison', () => {
    const sessionId = 'server-issued-session-id';
    const storedToken = 'a'.repeat(64);

    beforeEach(() => {
      csrfTokenStore.set(sessionId, {
        token: storedToken,
        timestamp: Date.now(),
        sessionId,
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should compare presented vs stored token with crypto.timingSafeEqual', async () => {
      mockRequest = makeRequest({
        headers: { 'x-csrf-token': storedToken },
        cookies: { sessionId, 'csrf-token': storedToken },
      });

      const timingSafeEqualSpy = vi.mocked(crypto.timingSafeEqual);

      const result = await validateCSRFToken(
        mockRequest,
        mockReply as FastifyReply,
      );

      expect(result).toBe(true);
      expect(timingSafeEqualSpy).toHaveBeenCalled();
    });

    it('should not throw on a presented token of different length', async () => {
      // A naive `===` short-circuits and an unguarded timingSafeEqual throws
      // on length mismatch; the guard must make this path safe.
      mockRequest = makeRequest({
        headers: { 'x-csrf-token': 'wrong-length-presented-token' },
        cookies: { sessionId, 'csrf-token': 'wrong-length-presented-token' },
      });

      const result = await validateCSRFToken(
        mockRequest,
        mockReply as FastifyReply,
      );

      expect(result).toBe(false);
      expect(mockReply.code).toHaveBeenCalledWith(403);
    });

    it('should reference a constant-time comparison primitive in production source', () => {
      const source = readFileSync(
        join(__dirname, 'validate-csrf-token.function.ts'),
        'utf8',
      );

      expect(source).toMatch(/timingSafeEqual/);
    });
  });

  describe('token expiry', () => {
    it('should reject a stored token past its expiry window', async () => {
      const sessionId = 'expired-session-id';
      csrfTokenStore.set(sessionId, {
        token: 'a'.repeat(64),
        timestamp: Date.now() - TOKEN_EXPIRY - 1000,
        sessionId,
      });

      mockRequest = makeRequest({
        headers: { 'x-csrf-token': 'a'.repeat(64) },
        cookies: { sessionId, 'csrf-token': 'a'.repeat(64) },
      });

      const result = await validateCSRFToken(
        mockRequest,
        mockReply as FastifyReply,
      );

      expect(result).toBe(false);
      expect(mockReply.code).toHaveBeenCalledWith(403);
    });
  });
});
