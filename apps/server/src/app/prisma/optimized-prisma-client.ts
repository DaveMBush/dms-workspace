import { PrismaClient } from '@prisma/client';

import { buildDatabaseUrl } from './build-database-url.function';
import { createBasePrismaConfig } from './create-base-prisma-config.function';
import { createConnectionPoolConfig } from './create-connection-pool-config.function';

const globalForOptimizedPrisma = globalThis as unknown as {
  optimizedPrisma?: PrismaClient;
};

// Enhanced connection pool configuration for better performance
function createOptimizedPrismaClient(): PrismaClient {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const provider = process.env.DATABASE_PROVIDER ?? 'sqlite';

  // Get the base configuration
  const baseConfig = createBasePrismaConfig(isDevelopment);

  // Customize for optimized client - smaller connection pool for single-user auth workload
  const optimizedPoolConfig = {
    ...createConnectionPoolConfig(provider),
    connection_limit: provider === 'postgresql' ? 10 : 1,
  };

  const optimizedDatabaseUrl = buildDatabaseUrl(
    provider,
    process.env.DATABASE_URL,
    optimizedPoolConfig
  );

  const client = new PrismaClient({
    ...baseConfig,
    datasources: {
      db: {
        url: optimizedDatabaseUrl,
      },
    },
    // Shorter timeout for optimized client
    transactionOptions: {
      maxWait: 5000,
      timeout: 10000,
    },
  });

  return client;
}

export const optimizedPrisma =
  globalForOptimizedPrisma.optimizedPrisma ?? createOptimizedPrismaClient();

// Prevent multiple instances in development
if (process.env.NODE_ENV !== 'production') {
  globalForOptimizedPrisma.optimizedPrisma = optimizedPrisma;
}
