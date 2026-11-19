import * as path from 'path';
import type { ConnectionPoolConfig } from './create-connection-pool-config.function';

export function buildDatabaseUrl(
  provider: string,
  baseUrl?: string,
  poolConfig?: ConnectionPoolConfig,
): string {
  if (
    provider === 'postgresql' &&
    baseUrl !== undefined &&
    baseUrl !== null &&
    baseUrl !== '' &&
    poolConfig !== undefined
  ) {
    return `${baseUrl}?connection_limit=${poolConfig.connection_limit}&connect_timeout=${poolConfig.connect_timeout}&pool_timeout=${poolConfig.pool_timeout}`;
  }

  // SQLite: normalize relative file paths to absolute so the adapter resolves them
  // consistently regardless of Node's cwd
  if (provider === 'sqlite' && baseUrl) {
    const cleanUrl = baseUrl.replace(/^file:/, '');
    if (!path.isAbsolute(cleanUrl)) {
      return `file:${path.resolve(process.cwd(), cleanUrl)}`;
    }
    return `file:${cleanUrl}`;
  }

  return baseUrl ?? '';
}
