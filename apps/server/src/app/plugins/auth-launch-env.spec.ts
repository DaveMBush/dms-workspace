// Story 15.1: red-phase server-side test for the packaged Electron launch path.
/* eslint-disable sonarjs/no-skipped-tests, vitest/no-disabled-tests -- Red-phase contract tests (Story 15.1): skips are intentional until Story 15.2 sets an explicit non-dev NODE_ENV on the packaged server launch */
//
// The AC #2 assertion is intentionally RED against the current code:
// `apps/electron/src/main.ts` (startServer) defaults the forked server child's
// NODE_ENV to 'development' when none is present, and auth.ts's
// isDevEnvironment() then makes shouldSkipAuth skip JWT validation for ALL
// routes — so the shipped desktop app runs with zero API authentication.
// They are marked `it.skip` so the server suite stays green until Story 15.2
// changes that default to an explicit non-dev value ('production' or a dedicated
// 'desktop'); 15.2's first task removes the skip markers, confirms red, then
// implements until green. No production code is touched in this story (15.1).
//
// Unlike Story 14.1's pure source-reading contract tests, these drive the real
// exported auth plugin through a fastify instance so they assert BEHAVIOR: under
// the NODE_ENV that main.ts actually defaults to, an unauthenticated non-health
// request must NOT be skipped (authenticateJWT runs and rejects). The launch
// default is read from `main.ts` with the same extraction used by Task 1's
// electron spec, so both tasks go green together when 15.2 flips that literal.
// authenticate-jwt.function is mocked so its import-time dependencies (audit log
// service / DB) never load — only the skip-vs-enforce decision under test matters.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import authPlugin from './auth';
import { authenticateJWT } from '../middleware/authenticate-jwt.function';

vi.mock('../middleware/authenticate-jwt.function', () => ({
  authenticateJWT: vi.fn(
    async (_: FastifyRequest, reply: FastifyReply): Promise<void> => {
      await reply.code(401).send({ error: 'Unauthorized' });
    },
  ),
}));

const electronMainPath = join(__dirname, '../../../../electron/src/main.ts');

function readElectronMainSource(): string {
  return readFileSync(electronMainPath, 'utf-8');
}

/**
 * Extract the literal assigned to `childEnv['NODE_ENV']` inside startServer's
 * "no NODE_ENV present" defaulting branch — the value the packaged desktop app
 * actually launches its server child with. Returns undefined when no such
 * assignment exists (e.g. if 15.2 restructures it). Matching the specific
 * assignment avoids false positives from comments that mention development mode.
 */
function extractLaunchDefaultNodeEnv(source: string): string | undefined {
  const match = /childEnv\[\s*['"]NODE_ENV['"]\s*\]\s*=\s*(?:await\s+)?(['"])([^'"\n]+)\1/.exec(
    source,
  );
  return match ? match[2] : undefined;
}

describe('Story 15.1 AC #2 — auth is enforced under the packaged launch-defaulted NODE_ENV', () => {
  let app: FastifyInstance;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = fastify();
    await app.register(authPlugin);
  });

  afterEach(async () => {
    await app.close();
    process.env.NODE_ENV = originalNodeEnv;
  });

  it(
    'control — under an explicitly non-dev NODE_ENV, unauthenticated requests are rejected (harness sanity)',
    async () => {
      // Proves the harness detects enforcement when the env is genuinely non-dev:
      // shouldSkipAuth is false, so authenticateJWT runs and rejects. This passes
      // both before and after 15.2 — if it ever fails alongside AC #2 below, the
      // problem is the test setup, not the launch default.
      process.env.NODE_ENV = 'production';

      const response = await app.inject({ method: 'GET', url: '/api/test' });

      expect(authenticateJWT).toHaveBeenCalledTimes(1);
      expect(response.statusCode).toBe(401);
    },
  );

  it.skip(
    'AC #2 — under the launch-defaulted NODE_ENV from main.ts, shouldSkipAuth does NOT skip JWT validation',
    async () => {
      const launchDefault = extractLaunchDefaultNodeEnv(readElectronMainSource());
      expect(launchDefault).toBeDefined();
      process.env.NODE_ENV = launchDefault;

      // Under a non-dev launch default, isDevEnvironment() is false so
      // shouldSkipAuth must not short-circuit: authenticateJWT runs and rejects the
      // unauthenticated request. Today main.ts defaults to 'development', which makes
      // shouldSkipAuth true — auth is skipped, authenticateJWT is never called, and a
      // bare 404 (no route) is returned instead of 401. That is the P0 gap this story
      // targets; it turns green when 15.2 flips the default to a non-dev value.
      const response = await app.inject({ method: 'GET', url: '/api/test' });

      expect(authenticateJWT).toHaveBeenCalledTimes(1);
      expect(response.statusCode).toBe(401);
    },
  );
});
