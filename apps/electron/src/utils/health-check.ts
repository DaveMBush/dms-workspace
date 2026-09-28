import http from 'http';

/**
 * Probe the Fastify health endpoint once. Resolves on HTTP 200, rejects on any
 * other status or a request error/timeout (2s).
 */
function healthCheck(port: number): Promise<void> {
  return new Promise(function doHealthCheck(
    resolve: () => void,
    reject: (err: Error) => void,
  ): void {
    const req = http.get(
      `http://127.0.0.1:${port}/api/health`,
      { timeout: 2000 },
      function onResponse(res): void {
        if (res.statusCode === 200) {
          res.resume();
          resolve();
        } else {
          res.resume();
          reject(
            new Error(
              `Health check failed with status: ${res.statusCode ?? 'unknown'}`,
            ),
          );
        }
      },
    );
    req.on('timeout', function onTimeout(): void {
      req.destroy(new Error('Health check request timed out'));
    });
    req.on('error', reject);
  });
}

/**
 * Poll the health endpoint until it passes. The server signals 'ready' once
 * Fastify is listening, but a single probe can still race socket warm-up on a
 * cold start (notably under xvfb in CI), so retry with linear backoff instead
 * of giving up after one 2s attempt and quitting the app.
 */
export async function waitForServerHealth(
  port: number,
  maxAttempts = 15,
  baseDelayMs = 300,
): Promise<void> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await healthCheck(port);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
    if (attempt === maxAttempts) {
      break;
    }
    const delayMs = baseDelayMs * attempt;
    await new Promise<void>(function sleep(resolve): void {
      setTimeout(resolve, delayMs);
    });
  }

  throw lastError ?? new Error('Health check failed');
}
