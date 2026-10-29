import * as net from 'net';

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
 * Probe whether `port` can be bound on 127.0.0.1 by actually listening on it,
 * then closing the socket. The real HTTP bind happens later in the forked
 * Fastify child (startServer sets PORT), so this probe is the only place at
 * resolution time where "port already in use" can be detected.
 */
function canBindPort(port: number): Promise<boolean> {
  return new Promise(function probe(
    resolve: (ok: boolean) => void,
  ): void {
    const server = net.createServer();
    server.once('error', function onError(): void {
      // EADDRINUSE or any other bind failure — port is not usable.
      resolve(false);
    });
    server.listen(port, '127.0.0.1', function onListening(): void {
      server.close(function onClosed(): void {
        resolve(true);
      });
    });
  });
}

/**
 * Resolve the port the Electron main process binds to on startup.
 *
 * Precedence (highest first):
 *   1. `DMS_SMOKE_PORT` override, when set and non-empty — wins over everything
 *      so smoke-test behavior is unchanged (Story 11.2 must not break this).
 *   2. The fixed default port `DEFAULT_APP_PORT`, probed for availability first
 *      so every launch loads the same origin http://localhost:7420 and cookies /
 *      localStorage (AD-5 auth cookie, sort/filter/theme/remember-me) persist.
 *   3. A free port via `findAvailablePort()` — fallback for that launch only if
 *      the fixed default is already in use by another process, so the app still
 *      starts rather than failing to bind (degraded but non-crashing).
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
  if (await canBindPort(DEFAULT_APP_PORT)) {
    return DEFAULT_APP_PORT;
  }
  // Fixed default is in use — fall back to a free port for this launch only.
  return findAvailablePort();
}
