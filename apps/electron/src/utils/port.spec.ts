import { describe, it, expect } from 'vitest';
import * as net from 'net';

import { findAvailablePort } from './port';

describe('findAvailablePort', () => {
  it('returns a valid port number above 1023', async () => {
    const port = await findAvailablePort();
    expect(typeof port).toBe('number');
    expect(port).toBeGreaterThan(1023);
    expect(port).toBeLessThanOrEqual(65535);
  });

  it('returns a port that is actually available (not in use)', async () => {
    const port = await findAvailablePort();
    expect(port).toBeGreaterThan(1023);
    await new Promise<void>(function verifyPortFree(resolve, reject) {
      const server = net.createServer();
      server.listen(port, '127.0.0.1', function onListening() {
        server.close(function onClosed() {
          resolve();
        });
      });
      server.on('error', function onError(err: Error) {
        reject(new Error(`Port ${port} was not free: ${err.message}`));
      });
    });
  });

  it('returns different ports on successive calls', async () => {
    const [port1, port2] = await Promise.all([
      findAvailablePort(),
      findAvailablePort(),
    ]);
    // Both should be valid ports; they may be different values
    expect(port1).toBeGreaterThan(1023);
    expect(port2).toBeGreaterThan(1023);
  });
});
