import { databasePerformanceService } from '../services/database-performance.service';
import { optimizedPrisma } from './optimized-prisma-client';

/**
 * Connection health check with performance metrics
 */
interface HealthCheckResult {
  healthy: boolean;
  connectionTime: number;
  connectionCount?: number;
  performanceMetrics?: unknown;
  error?: string;
}

export async function optimizedHealthCheck(): Promise<HealthCheckResult> {
  const startTime = performance.now();

  try {
    await optimizedPrisma.$queryRaw`SELECT 1`;
    const endTime = performance.now();
    const connectionTime = endTime - startTime;

    // Get connection metrics
    const provider = process.env.DATABASE_PROVIDER ?? 'sqlite';
    let connectionCount = 1;

    if (provider === 'postgresql') {
      connectionCount = await checkPostgresqlConnections();
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

async function checkPostgresqlConnections(): Promise<number> {
  try {
    const result = await optimizedPrisma.$queryRaw<[{ count: bigint }]>`
      SELECT count(*) FROM pg_stat_activity WHERE state = 'active'
    `;
    return Number(result[0].count);
  } catch {
    return 1;
  }
}
