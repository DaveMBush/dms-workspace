import type { ConnectionPoolConfig } from './create-connection-pool-config.function';

export function buildDatabaseUrl(
  provider: string,
  baseUrl?: string,
  poolConfig?: ConnectionPoolConfig
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
  return baseUrl ?? '';
}
