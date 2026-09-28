import { describe, it, expect } from 'vitest';
import * as http from 'http';

import { waitForServerHealth } from './health-check';

/** Start a health endpoint that returns `status` for the first `failures`
 * requests and 200 afterwards. Returns the bound port and a close function. */
function startHealthEndpoint(
  status: number,
  failures = 0,
): Promise<{ port: number; close(): void }> {
  return new Promise(function startServer(resolve) {
    let seen = 0;
    const server = http.createServer(function onRequest(req, res) {
      if (req.url !== '/api/health') {
        res.writeHead(404);
        res.end();
        return;
      }
      seen += 1;
      const code = seen <= failures ? status : 200;
      res.writeHead(code);
      res.end();
    });
    server.listen(0, '127.0.0.1', function onListening() {
      const address = server.address();
      if (address === null || typeof address === 'string') {
        throw new Error('Could not determine health endpoint port');
      }
      resolve({
        port: address.port,
        close(): void {
          server.close();
        },
      });
    });
  });
}

describe('waitForServerHealth', () => {
  it('resolves when the endpoint is healthy immediately', async () => {
    const { port, close } = await startHealthEndpoint(200);
    try {
      await expect(waitForServerHealth(port)).resolves.toBeUndefined();
    } finally {
      close();
    }
  });

  it('retries through transient failures and resolves once healthy', async () => {
    const { port, close } = await startHealthEndpoint(503, 2);
    try {
      // First two probes get 503, the third gets 200.
      await expect(waitForServerHealth(port, 10, 1)).resolves.toBeUndefined();
    } finally {
      close();
    }
  });

  it('rejects with the last error after exhausting attempts', async () => {
    // failures=100 keeps every probe at 503 so all 3 attempts fail.
    const { port, close } = await startHealthEndpoint(503, 100);
    try {
      await expect(waitForServerHealth(port, 3, 1)).rejects.toThrow(/status/);
    } finally {
      close();
    }
  });
});
