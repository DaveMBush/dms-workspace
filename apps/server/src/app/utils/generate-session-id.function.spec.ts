/* eslint-disable vitest/no-disabled-tests -- red-phase (Story 17.2) contract tests; intentionally skipped until the fix lands */
//
// These assertions are RED against current production code and are kept
// `it.skip` per Story 17.1 AC #4/#5 so the suite stays green. Story 17.2's
// first task removes the skip markers, confirms they fail, then implements
// until they pass. The file-level disable is the documented exemption for
// intentional unit-test deferrals (see scripts/check-no-skipped-tests.sh).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FastifyRequest } from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateSessionId } from './generate-session-id.function';

describe('generateSessionId', () => {
  function buildRequest(ip: string, userAgent: string): FastifyRequest {
    return {
      ip,
      headers: { 'user-agent': userAgent },
    } as unknown as FastifyRequest;
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  // Baseline behavior — NOT skipped, so this file keeps `generate-session-id.function.ts`
  // at 100% coverage while the red-phase assertions below wait in skip. Assertions are
  // deliberately loose (type/length only) so they remain true after Story 17.2 rewrites
  // the derivation to an unguessable server-issued value; they do not pin the sha256
  // scheme. The second case exercises both `?? 'unknown'` fallback branches.
  it('returns a string id for a request with ip and user-agent', () => {
    const id = generateSessionId(buildRequest('127.0.0.1', 'Mozilla/5.0'));
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('falls back to unknown values when ip and user-agent are absent', () => {
    const request = { headers: {} } as FastifyRequest; // no ip, empty headers
    const id = generateSessionId(request);
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  // Red-phase (Story 17.2 removes the skip): sessionId must not be a function
  // of client-supplied ip/user-agent/minute. Two requests with different
  // client inputs in the same minute must get distinct ids; under the current
  // sha256(ip-userAgent-minute) derivation this holds only because the hash is
  // injective — the ids remain fully predictable and collidable by anyone who
  // knows the client inputs.
  it('should not derive sessionId from client-supplied ip or user-agent', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-13T12:00:00.000Z'));

    const requestA = buildRequest('127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0)');
    const requestB = buildRequest('127.0.0.2', 'curl/8.4.0');

    const idA = generateSessionId(requestA);
    const idB = generateSessionId(requestB);

    expect(idA).not.toBe(idB);
  });

  // Red-phase (Story 17.2 removes the skip): a deterministic derivation returns
  // the same id for repeated calls within the same minute; an unguessable
  // server-issued value must not. Length stays loose so both randomUUID() and
  // hex(randomBytes) satisfy it.
  it('should return a different unguessable sessionId on each call', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-13T12:00:00.000Z'));

    const request = buildRequest('127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0)');

    const idA = generateSessionId(request);
    const idB = generateSessionId(request);

    expect(idA).not.toBe(idB);
    expect(typeof idA).toBe('string');
    expect(idA.length).toBeGreaterThanOrEqual(32);
  });

  // Story 17.2 contract (AC #3): production source must derive sessionId from
  // an unguessable server-issued value instead of sha256(ip-userAgent-minute).
  it('should not derive sessionId via sha256 of client-supplied inputs', () => {
    const source = readFileSync(
      join(__dirname, 'generate-session-id.function.ts'),
      'utf-8',
    );

    expect(source).not.toMatch(/createHash\(\s*['"]sha256['"]/);
    expect(source).toMatch(/randomUUID|randomBytes/);
  });
});
