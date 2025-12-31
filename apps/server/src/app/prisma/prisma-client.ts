import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/client';

import { buildDatabaseUrl } from './build-database-url.function';
import { createBasePrismaConfig } from './create-base-prisma-config.function';
import { createConnectionPoolConfig } from './create-connection-pool-config.function';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const createPrismaClient = (): PrismaClient => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const provider = process.env.DATABASE_PROVIDER ?? 'sqlite';

  // Build database URL
  const poolConfig = createConnectionPoolConfig(provider);
  const databaseUrl = buildDatabaseUrl(
    provider,
    process.env.DATABASE_URL,
    poolConfig
  );

  // Create adapter for SQLite
  const adapter = new PrismaBetterSqlite3({ url: databaseUrl });

  // Get base config
  const baseConfig = createBasePrismaConfig(isDevelopment);

  return new PrismaClient({
    adapter,
    log: baseConfig.log,
    errorFormat: baseConfig.errorFormat,
    transactionOptions: baseConfig.transactionOptions,
  });
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Set up event listeners - commented out due to TypeScript issues with Prisma 7 adapters
// The log configuration in PrismaClient still works, but the $on method type signature
// doesn't work correctly with adapters
// setupDatabaseEventListeners(prisma);

// Connection health check function with specific client (for testing)
export async function checkDatabaseHealthWithClient(
  client: PrismaClient
): Promise<{
  healthy: boolean;
  error?: string;
  connectionCount?: number;
}> {
  try {
    // Test basic connectivity
    await client.$queryRaw`SELECT 1`;

    // Get current connection count (database-specific)
    let connectionCount = 1; // Default fallback

    const provider = process.env.DATABASE_PROVIDER || 'sqlite';

    if (provider === 'postgresql') {
      try {
        const result = await client.$queryRaw<[{ count: bigint }]>`
          SELECT count(*) FROM pg_stat_activity WHERE state = 'active'
        `;
        connectionCount = Number(result[0].count);
      } catch (error) {
        // If PostgreSQL-specific query fails, fall back to basic connectivity
        console.warn(
          'Failed to get PostgreSQL connection count, using fallback'
        );
      }
    }
    // For SQLite and other databases, we can't easily get connection count
    // so we just report that the connection is healthy

    return {
      healthy: true,
      connectionCount,
    };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown database error',
    };
  }
}

// Connection health check function
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  error?: string;
  connectionCount?: number;
}> {
  return checkDatabaseHealthWithClient(prisma);
}

// Graceful shutdown function
export async function closeDatabaseConnection(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log('Database connection closed gracefully');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
}

// Connection retry logic with exponential backoff
export async function connectWithRetry(
  maxRetries: number = 5,
  baseDelay: number = 1000
): Promise<void> {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await prisma.$connect();
      console.log('Database connected successfully');
      return;
    } catch (error) {
      retries++;

      if (retries >= maxRetries) {
        throw new Error(
          `Failed to connect to database after ${maxRetries} attempts: ${String(
            error
          )}`
        );
      }

      const delay = baseDelay * Math.pow(2, retries - 1);
      console.warn(
        `Database connection attempt ${retries} failed, retrying in ${delay}ms...`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
