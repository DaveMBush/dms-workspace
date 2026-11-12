// Story 15.2: unit test for the packaged Electron launch path.
//
// These assertions pin the fix from Story 15.2: `apps/electron/src/main.ts`
// (startServer) defaults the forked server child's NODE_ENV to an explicit
// non-dev value ('production') when none is present, so auth.ts's
// isDevEnvironment() is false and shouldSkipAuth enforces JWT validation for
// all routes in shipped builds. Before 15.2 the default was 'development',
// which skipped JWT validation for every route — the P0 security gap this
// story closes. The skip markers from the red-phase (Story 15.1) are removed;
// these now run and pass against the production default.
//
// Like Story 14.1's contract tests, these are source-reading
// assertions: they read `main.ts` and pin the NODE_ENV defaulting contract at
// the text level. That keeps them deterministic (no electron/child_process
// mocking or fork timing) while still going RED against today's 'development'
// default and GREEN once 15.2 flips the literal to a non-dev value.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const mainPath = join(__dirname, 'main.ts');

function readMainSource(): string {
  return readFileSync(mainPath, 'utf-8');
}

/**
 * Extract the literal assigned to `childEnv['NODE_ENV']` inside startServer's
 * "no NODE_ENV present" defaulting branch. Returns undefined when no such
 * assignment exists (e.g. if 15.2 restructures it). Matching the specific
 * assignment — rather than grepping for 'development' anywhere — avoids
 * false positives from comments that mention development mode.
 */
function extractDefaultedNodeEnv(source: string): string | undefined {
  const match =
    /childEnv\[\s*['"]NODE_ENV['"]\s*\]\s*=\s*(?:await\s+)?(['"])([^'"\n]+)\1/.exec(
      source,
    );
  return match ? match[2] : undefined;
}

/** True when the NODE_ENV assignment is guarded by a "value absent" check. */
function isDefaultingConditional(source: string): boolean {
  return /!\s*childEnv\[\s*['"]NODE_ENV['"]\s*\]/.test(source);
}

describe('Story 15.1 — packaged Electron launch sets an explicit non-dev NODE_ENV', () => {
  it('AC #1 — startServer defaults the forked server child to a NON-dev NODE_ENV (auth/CSRF enforced in shipped builds)', () => {
    const defaulted = extractDefaultedNodeEnv(readMainSource());

    // The packaged launch must default to an explicit non-dev value. Today it is
    // 'development', which makes auth.ts's isDevEnvironment() true and shouldSkipAuth
    // skip JWT validation for every route — the P0 security gap this story targets.
    // The forbidden set mirrors isDevEnvironment()'s dev values exactly, so "not in
    // this set" ⟺ "auth/CSRF enforcement is active under it" (Story 15.1 AC #2).
    expect(defaulted).toBeDefined();
    expect(['development', 'test', 'local']).not.toContain(defaulted);
  });

  it('AC #2 — an explicitly set NODE_ENV is preserved (genuine development keeps dev behavior)', () => {
    // The defaulting must only apply when no value is present, so a real developer who
    // launches with NODE_ENV=development still gets dev-only features. This pins the
    // "explicit value wins" half of the contract and guards against 15.2 over-broadening
    // the fix into an unconditional overwrite.
    expect(isDefaultingConditional(readMainSource())).toBe(true);
  });
});
