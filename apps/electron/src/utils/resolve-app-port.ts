import { findAvailablePort } from './port';

/**
 * Fixed default port the Electron app binds to when no `DMS_SMOKE_PORT`
 * override is set. Pinned to a single constant so every launch loads the same
 * origin http://localhost:7420 and cookies / localStorage (AD-5 auth cookie,
 * sort/filter/theme/remember-me) persist across launches. Chosen because it
 * collides with none of the ports already referenced in the codebase
 * (3000, 4200, 4566, 8080). Task 3 wires this into resolveAppPort's
 * no-override branch; until then findAvailablePort() remains the default.
 */
export const DEFAULT_APP_PORT = 7420;

/**
 * Parse and validate the DMS_SMOKE_PORT override value.
 * Throws on an empty/invalid/out-of-range value so a misconfigured smoke run
 * fails loudly rather than silently binding an unexpected port.
 */
function parseSmokePort(smokePortEnv: string): number {
  const parsed = parseInt(smokePortEnv, 10);
  if (Number.isNaN(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`Invalid DMS_SMOKE_PORT value: "${smokePortEnv}"`);
  }
  return parsed;
}

/**
 * Resolve the port the Electron main process binds to on startup.
 *
 * Precedence (highest first):
 *   1. `DMS_SMOKE_PORT` override, when set and non-empty — wins over everything
 *      so smoke-test behavior is unchanged (Story 11.2 must not break this).
 *   2. A free port via `findAvailablePort()` — the current no-override default.
 *      Story 11.2 switches this to a single fixed default port so the app's
 *      origin http://localhost:<port> is stable across launches and cookies /
 *      localStorage (AD-5 auth cookie, sort/filter/theme/remember-me) persist.
 *
 * Extracted from main.ts so it can be unit-tested without launching Electron.
 */
export async function resolveAppPort(
  env: Record<string, string | undefined> = process.env,
): Promise<number> {
  const smokePortEnv = env['DMS_SMOKE_PORT'];
  if (smokePortEnv !== undefined && smokePortEnv.length > 0) {
    return parseSmokePort(smokePortEnv);
  }
  // Story 11.2 replaces this with a fixed default port for a stable origin.
  return findAvailablePort();
}
