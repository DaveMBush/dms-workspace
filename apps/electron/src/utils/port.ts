import * as net from 'net';

export function findAvailablePort(): Promise<number> {
  return new Promise(function resolvePort(
    resolve: (port: number) => void,
    reject: (err: Error) => void
  ): void {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', function onListening(): void {
      const address = server.address();
      if (
        address === null ||
        address === undefined ||
        typeof address === 'string'
      ) {
        reject(new Error('Could not determine port'));
        return;
      }
      const port = address.port;
      server.close(function onClosed(): void {
        resolve(port);
      });
    });
    server.on('error', reject);
  });
}
