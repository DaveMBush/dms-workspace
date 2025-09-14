/* eslint-disable @smarttools/one-exported-item-per-file -- Interface and function are closely related */

export interface ConnectionPoolConfig {
  connection_limit: number;
  connect_timeout: number;
  pool_timeout: number;
}

export function createConnectionPoolConfig(
  provider: string
): ConnectionPoolConfig {
  return {
    connection_limit: provider === 'postgresql' ? 15 : 1,
    connect_timeout: 10,
    pool_timeout: 30,
  };
}
