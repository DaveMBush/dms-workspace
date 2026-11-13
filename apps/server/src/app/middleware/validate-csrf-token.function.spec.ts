/* eslint-disable vitest/no-disabled-tests -- red-phase (Story 17.2) contract tests; intentionally skipped until the fix lands */
//
// These assertions are RED against current production code and are kept
// `it.skip` per Story 17.1 AC #4/#5 so the suite stays green. Story 17.2's
// first task removes the skip markers, confirms they fail, then implements
// until they pass. The file-level disable is the documented exemption for
// intentional unit-test deferrals (see scripts/check-no-skipped-tests.sh).

import * as crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FastifyReply, FastifyRequest } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateSessionId } from '../utils/generate-session-id.function';
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

describe('validateCSRFToken stored-token comparison', () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  const storedToken = 'stored-correct-token';

  beforeEach(() => {
    mockRequest = {
      method: 'POST',
      url: '/api/test',
      ip: '127.0.0.1',
      headers: {},
      cookies: {},
      log: {
        warn: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      },
    };

    mockReply = {
      code: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };

    csrfTokenStore.clear();
    vi.stubEnv('NODE_ENV', 'production');
  });

  afterEach(() => {
    csrfTokenStore.clear();
    vi.unstubAllEnvs();
  });

  function seedLiveStoredEntry(): void {
    const sessionId = generateSessionId(mockRequest as FastifyRequest);
    csrfTokenStore.set(sessionId, {
      token: storedToken,
      timestamp: Date.now(),
      sessionId,
    });
  }

  // Baseline behavior — NOT skipped. This file pulls `validate-csrf-token.function.ts`
  // into the 100% coverage report (see vitest.config.ts spec→source mapping), so every
  // branch must be exercised by a running test. The expired-entry path was previously
  // untested; this documents current behavior and is independent of the Story 17.2 fix.
  it('rejects with CSRF_TOKEN_EXPIRED when the stored entry has passed its expiry', async () => {
    const sessionId = generateSessionId(mockRequest as FastifyRequest);
    csrfTokenStore.set(sessionId, {
      token: storedToken,
      timestamp: Date.now() - TOKEN_EXPIRY - 1000, // older than the 30-minute window
      sessionId,
    });
    mockRequest.headers = { 'x-csrf-token': storedToken };
    mockRequest.cookies = { 'csrf-token': storedToken };

    const result = await validateCSRFToken(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply,
    );

    expect(result).toBe(false);
    expect(mockReply.code).toHaveBeenCalledWith(403);
    // Expired entries are evicted from the store on detection.
    expect(csrfTokenStore.has(sessionId)).toBe(false);
  });

  // Baseline behavior — NOT skipped. Covers the explicit-null disjunct of the
  // "header token missing" guard (`tokenFromHeader === null`), which a merely
  // absent header does not reach (an absent key yields undefined, not null).
  it('rejects with CSRF_TOKEN_MISSING when the csrf header is explicitly null', async () => {
    (mockRequest.headers as Record<string, unknown>)['x-csrf-token'] = null;

    const result = await validateCSRFToken(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply,
    );

    expect(result).toBe(false);
    expect(mockReply.code).toHaveBeenCalledWith(403);
  });

  // Baseline behavior — NOT skipped. Covers the development-mode skip branch
  // (`NODE_ENV === 'development' && url includes /health|/ready`), which every other
  // test bypasses by running in production mode. Uses a non-GET method so it reaches
  // this second condition rather than the earlier GET/HEAD short-circuit.
  it('skips CSRF validation for /health in development mode', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    mockRequest.method = 'POST';
    mockRequest.url = '/health';

    const result = await validateCSRFToken(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply,
    );

    expect(result).toBe(true);
  });

  it('skips CSRF validation for /ready in development mode', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    mockRequest.method = 'POST';
    mockRequest.url = '/ready';

    const result = await validateCSRFToken(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply,
    );

    expect(result).toBe(true);
  });

  // Baseline behavior — NOT skipped. Covers the valid-unexpired fall-through in
  // validateStoredToken (the `return true` path) that no running test reached before
  // this file existed. Presents the CORRECT stored token so it stays green after
  // Story 17.2 adds the presented-vs-stored comparison (a matching token still passes).
  it('accepts a live unexpired entry when the presented token matches the stored one', async () => {
    seedLiveStoredEntry();
    mockRequest.headers = { 'x-csrf-token': storedToken };
    mockRequest.cookies = { 'csrf-token': storedToken };

    const result = await validateCSRFToken(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply,
    );

    expect(result).toBe(true);
  });

  // Red-phase (Story 17.2 removes the skip): validateStoredToken never compares
  // presented vs stored token, so this currently fails against production code.
  it('should reject request presenting a WRONG token when a live unexpired entry exists', async () => {
    seedLiveStoredEntry();
    const presentedToken = 'wrong-presented-token';
    mockRequest.headers = { 'x-csrf-token': presentedToken };
    mockRequest.cookies = { 'csrf-token': presentedToken };

    const result = await validateCSRFToken(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply,
    );

    expect(result).toBe(false);
    expect(mockReply.code).toHaveBeenCalledWith(403);
  });

  // Red-phase (Story 17.2 removes the skip): part of AC #1's rejection contract.
  it('should reject request presenting NO token when a live unexpired entry exists', async () => {
    seedLiveStoredEntry();
    mockRequest.headers = {};
    mockRequest.cookies = {};

    const result = await validateCSRFToken(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply,
    );

    expect(result).toBe(false);
    expect(mockReply.code).toHaveBeenCalledWith(403);
  });

  // Story 17.2 contract (AC #2): the presented-vs-stored comparison must be
  // constant-time so timing does not leak whether a prefix matched.
  describe('constant-time comparison', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    // Red-phase (Story 17.2 removes the skip): validateStoredToken never
    // compares presented vs stored token, so timingSafeEqual is never called.
    it('should compare presented vs stored token with crypto.timingSafeEqual', async () => {
      seedLiveStoredEntry();
      // Different length from the stored token: a naive `===` short-circuits
      // and an unguarded timingSafeEqual would throw on length mismatch.
      const presentedToken = 'wrong-length-presented-token';
      mockRequest.headers = { 'x-csrf-token': presentedToken };
      mockRequest.cookies = { 'csrf-token': presentedToken };

      const timingSafeEqualSpy = vi.mocked(crypto.timingSafeEqual);

      const result = await validateCSRFToken(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(result).toBe(false);
      expect(mockReply.code).toHaveBeenCalledWith(403);
      expect(timingSafeEqualSpy).toHaveBeenCalled();
    });

    // Red-phase (Story 17.2 removes the skip): production source currently has
    // no constant-time comparison primitive at all.
    it('should reference a constant-time comparison primitive in production source', () => {
      const source = readFileSync(
        join(__dirname, 'validate-csrf-token.function.ts'),
        'utf-8',
      );

      expect(source).toMatch(/timingSafeEqual/);
    });
  });
});
