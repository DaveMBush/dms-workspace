import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Enhanced connection pool configuration
const createPrismaClient = (): PrismaClient => {
  const provider = process.env.DATABASE_PROVIDER || 'sqlite';

  // Optimized connection pool settings for authentication workload
  const connectionPoolConfig = {
    connection_limit: provider === 'postgresql' ? 15 : 1, // Optimized for auth + user operations
    connect_timeout: 10, // Faster connection timeout
    pool_timeout: 30, // Handle auth bursts
  };

  // Build optimized database URL with connection pool parameters
  const databaseUrl =
    provider === 'postgresql' && process.env.DATABASE_URL
      ? `${process.env.DATABASE_URL}?connection_limit=${connectionPoolConfig.connection_limit}&connect_timeout=${connectionPoolConfig.connect_timeout}&pool_timeout=${connectionPoolConfig.pool_timeout}`
      : process.env.DATABASE_URL;

  return new PrismaClient({
    // Enhanced query logging for performance analysis
    log:
      process.env.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'info' },
            { emit: 'event', level: 'warn' },
            { emit: 'event', level: 'error' },
          ]
        : [{ emit: 'event', level: 'error' }],

    // Optimized datasource configuration with connection pooling
    datasources: {
      db: {
        url: databaseUrl,
      },
    },

    // Error formatting for better performance
    errorFormat: 'minimal',

    // Optimized transaction settings for auth operations
    transactionOptions: {
      maxWait: 5000, // 5 second max wait for responsive auth
      timeout: 15000, // 15 second timeout
    },
  });
};

export const prisma = globalForPrisma.prisma || createPrismaClient();

// Add performance monitoring event listeners for database optimization
if (process.env.NODE_ENV === 'development') {
  // Type-safe event listener for query events
  const client = prisma as PrismaClient & {
    $on(
      eventType: 'query',
      callback: (e: {
        query: string;
        params: string;
        duration: number;
        target: string;
      }) => void
    ): void;
    $on(
      eventType: 'info',
      callback: (e: { message: string; target?: string }) => void
    ): void;
    $on(
      eventType: 'warn',
      callback: (e: { message: string; target?: string }) => void
    ): void;
    $on(
      eventType: 'error',
      callback: (e: { message: string; target?: string }) => void
    ): void;
  };

  try {
    client.$on('query', (e) => {
      const duration = e.duration;
      // Log slow queries for performance analysis
      if (duration > 50) {
        console.warn(`Slow query detected (${duration}ms):`, {
          query:
            e.query.substring(0, 100) + (e.query.length > 100 ? '...' : ''),
          params: e.params,
          duration: `${duration}ms`,
          target: e.target,
        });
      }
    });

    client.$on('info', (e) => {
      if (e.message.includes('connection') || e.message.includes('pool')) {
        console.info('Database connection info:', e.message);
      }
    });

    client.$on('warn', (e) => {
      console.warn('Database warning:', e.message);
    });
  } catch (error) {
    console.warn('Could not set up database performance monitoring:', error);
  }
}

// Type-safe error event listener
try {
  const errorClient = prisma as PrismaClient & {
    $on(
      eventType: 'error',
      callback: (e: { message: string; target?: string }) => void
    ): void;
  };

  errorClient.$on('error', (e) => {
    console.error('Database error:', e.message, e.target);
  });
} catch (error) {
  console.warn('Could not set up database error monitoring:', error);
}

// Prevent multiple instances in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

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
