import { PrismaClient } from '@prisma/client';

import { databasePerformanceService } from '../services/database-performance.service';

const globalForOptimizedPrisma = globalThis as unknown as {
  optimizedPrisma?: PrismaClient;
};

// Enhanced connection pool configuration for better performance
const createOptimizedPrismaClient = (): PrismaClient => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';
  const provider = process.env.DATABASE_PROVIDER || 'sqlite';

  // Connection pool configuration optimized for single-user auth workload
  const connectionPoolConfig = {
    // For single-user applications, smaller pool is more efficient
    connection_limit: provider === 'postgresql' ? 10 : 1,
    // Faster connection timeout for responsive auth
    connect_timeout: 10,
    // Longer pool timeout to handle auth bursts
    pool_timeout: 30,
  };

  const databaseUrl =
    provider === 'postgresql'
      ? `${process.env.DATABASE_URL}?connection_limit=${connectionPoolConfig.connection_limit}&connect_timeout=${connectionPoolConfig.connect_timeout}&pool_timeout=${connectionPoolConfig.pool_timeout}`
      : process.env.DATABASE_URL;

  const client = new PrismaClient({
    // Enable detailed query logging in development for performance analysis
    log: isDevelopment
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'info' },
          { emit: 'event', level: 'warn' },
          { emit: 'event', level: 'error' },
        ]
      : [{ emit: 'event', level: 'error' }],

    // Optimized datasource configuration
    datasources: {
      db: {
        url: databaseUrl,
      },
    },

    // Minimal error formatting for better performance
    errorFormat: 'minimal',

    // Transaction options optimized for auth operations
    transactionOptions: {
      // Shorter timeouts for responsive auth
      maxWait: 5000,
      timeout: 10000,
    },
  });

  // Performance monitoring event listeners with type safety
  if (isDevelopment) {
    try {
      const clientWithEvents = client as PrismaClient & {
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

      clientWithEvents.$on('query', (e) => {
        const duration = e.duration;
        if (duration > 50) {
          // Log slow queries (> 50ms)
          console.warn(
            `Slow query detected: ${e.query.substring(0, 100)}${
              e.query.length > 100 ? '...' : ''
            } (${duration}ms)`
          );
          databasePerformanceService
            .measureQueryPerformance(
              async () => Promise.resolve(null),
              e.query,
              e.params ? JSON.parse(e.params) : undefined
            )
            .catch(() => {
              // Ignore errors in performance monitoring
            });
        }
      });

      clientWithEvents.$on('info', (e) => {
        console.info('Prisma info:', e.message);
      });

      clientWithEvents.$on('warn', (e) => {
        console.warn('Prisma warning:', e.message);
      });

      clientWithEvents.$on('error', (e) => {
        console.error('Prisma error:', e.message);
      });
    } catch (error) {
      console.warn(
        'Could not set up optimized database performance monitoring:',
        error
      );
    }
  }

  return client;
};

export const optimizedPrisma =
  globalForOptimizedPrisma.optimizedPrisma || createOptimizedPrismaClient();

// Prevent multiple instances in development
if (process.env.NODE_ENV !== 'production') {
  globalForOptimizedPrisma.optimizedPrisma = optimizedPrisma;
}

// Optimized query functions for common authentication patterns

/**
 * Optimized user lookup with minimal data selection
 */
export async function optimizedUserLookup(userId?: string) {
  return databasePerformanceService.measureQueryPerformance(
    () =>
      optimizedPrisma.accounts.findMany({
        take: userId ? 1 : 10,
        where: userId ? { id: userId } : undefined,
        select: {
          id: true,
          name: true,
          createdAt: true,
        },
        orderBy: {
          name: 'asc',
        },
      }),
    'optimized:user_lookup',
    userId ? [userId] : []
  );
}

/**
 * Optimized session data loading with strategic includes
 */
export async function optimizedSessionDataLoad(accountId: string) {
  return databasePerformanceService.measureQueryPerformance(
    () =>
      optimizedPrisma.accounts.findUnique({
        where: { id: accountId },
        select: {
          id: true,
          name: true,
          trades: {
            take: 5, // Limit initial data load
            select: {
              id: true,
              buy: true,
              sell: true,
              quantity: true,
              buy_date: true,
              sell_date: true,
            },
            orderBy: {
              buy_date: 'desc',
            },
          },
          divDeposits: {
            take: 5, // Limit initial data load
            select: {
              id: true,
              date: true,
              amount: true,
            },
            orderBy: {
              date: 'desc',
            },
          },
        },
      }),
    'optimized:session_data_load',
    [accountId]
  );
}

/**
 * Optimized batch query for multiple accounts
 */
export async function optimizedBatchAccountLoad(accountIds: string[]) {
  if (accountIds.length === 0) return { result: [] };

  return databasePerformanceService.measureQueryPerformance(
    () =>
      optimizedPrisma.accounts.findMany({
        where: { id: { in: accountIds } },
        select: {
          id: true,
          name: true,
          trades: {
            select: {
              id: true,
              sell_date: true,
            },
            orderBy: {
              buy_date: 'asc',
            },
          },
          divDeposits: {
            select: {
              id: true,
              date: true,
            },
            orderBy: {
              date: 'asc',
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      }),
    'optimized:batch_account_load',
    accountIds
  );
}

/**
 * Connection health check with performance metrics
 */
export async function optimizedHealthCheck() {
  const startTime = performance.now();

  try {
    await optimizedPrisma.$queryRaw`SELECT 1`;
    const endTime = performance.now();
    const connectionTime = endTime - startTime;

    // Get connection metrics
    const provider = process.env.DATABASE_PROVIDER || 'sqlite';
    let connectionCount = 1;

    if (provider === 'postgresql') {
      try {
        const result = await optimizedPrisma.$queryRaw<[{ count: bigint }]>`
          SELECT count(*) FROM pg_stat_activity WHERE state = 'active'
        `;
        connectionCount = Number(result[0].count);
      } catch {
        // Fallback for SQLite or query failure
        connectionCount = 1;
      }
    }

    return {
      healthy: true,
      connectionTime,
      connectionCount,
      performanceMetrics:
        await databasePerformanceService.getPerformanceMetrics(optimizedPrisma),
    };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown database error',
      connectionTime: performance.now() - startTime,
    };
  }
}

/**
 * Graceful shutdown for optimized client
 */
export async function closeOptimizedDatabaseConnection(): Promise<void> {
  try {
    await optimizedPrisma.$disconnect();
    console.log('Optimized database connection closed gracefully');
  } catch (error) {
    console.error('Error closing optimized database connection:', error);
  }
}
