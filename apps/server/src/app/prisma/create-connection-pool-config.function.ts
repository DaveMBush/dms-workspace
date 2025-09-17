/* eslint-disable @smarttools/one-exported-item-per-file -- Interface and function are closely related */

export interface ConnectionPoolConfig {
  connection_limit: number;
  connect_timeout: number;
  pool_timeout: number;
}

export function createConnectionPoolConfig(
  provider: string
): ConnectionPoolConfig {
  // Optimized for single-user application with authentication workload
  const isProduction = process.env.NODE_ENV === 'production';

  if (provider === 'postgresql') {
    return {
      // Reduced connection limit for single-user app to minimize overhead
      connection_limit: isProduction ? 10 : 5,
      // Faster connect timeout for auth responsiveness
      connect_timeout: 5,
      // Reduced pool timeout for quicker auth failures
      pool_timeout: 15,
    };
  }

  // SQLite optimization for development
  return {
    connection_limit: 1,
    connect_timeout: 3,
    pool_timeout: 10,
  };
}
