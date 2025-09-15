import { databasePerformanceService } from '../services/database-performance.service';
import { optimizedPrisma } from './optimized-prisma-client';

/**
 * Optimized user lookup with minimal data selection
 */
export async function optimizedUserLookup(userId?: string): Promise<{
  result: Array<{ id: string; name: string; createdAt: Date }>;
  metrics: unknown;
}> {
  async function performUserLookup(): Promise<
    Array<{ id: string; name: string; createdAt: Date }>
  > {
    return optimizedPrisma.accounts.findMany({
      take: userId !== undefined && userId !== null && userId !== '' ? 1 : 10,
      where:
        userId !== undefined && userId !== null && userId !== ''
          ? { id: userId }
          : undefined,
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  return databasePerformanceService.measureQueryPerformance(
    performUserLookup,
    'optimized:user_lookup',
    userId !== undefined && userId !== null && userId !== '' ? [userId] : []
  );
}
