import * as crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { FastifyReply, FastifyRequest } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { generateSessionId } from '../utils/generate-session-id.function';
import { csrfTokenStore } from './csrf-token-store.constant';
import { validateCSRFToken } from './validate-csrf-token.function';

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

  // Red-phase (Story 17.2 removes the skip): validateStoredToken never compares
  // presented vs stored token, so this currently fails against production code.
  it.skip('should reject request presenting a WRONG token when a live unexpired entry exists', async () => {
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
  it.skip('should reject request presenting NO token when a live unexpired entry exists', async () => {
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
    it.skip('should compare presented vs stored token with crypto.timingSafeEqual', async () => {
      seedLiveStoredEntry();
      // Different length from the stored token: a naive `===` short-circuits
      // and an unguarded timingSafeEqual would throw on length mismatch.
      const presentedToken = 'wrong-length-presented-token';
      mockRequest.headers = { 'x-csrf-token': presentedToken };
      mockRequest.cookies = { 'csrf-token': presentedToken };

      const timingSafeEqualSpy = vi.spyOn(crypto, 'timingSafeEqual');

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
    it.skip('should reference a constant-time comparison primitive in production source', () => {
      const source = readFileSync(
        join(__dirname, 'validate-csrf-token.function.ts'),
        'utf-8',
      );

      expect(source).toMatch(/timingSafeEqual/);
    });
  });
});
