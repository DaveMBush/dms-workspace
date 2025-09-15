import { databasePerformanceService } from '../services/database-performance.service';
import { optimizedPrisma } from './optimized-prisma-client';

/**
 * Optimized batch query for multiple accounts
 */
type BatchAccountResult = Array<{
  id: string;
  name: string;
  trades: Array<{ id: string; sell_date: Date | null }>;
  divDeposits: Array<{ id: string; date: Date }>;
}>;

export async function optimizedBatchAccountLoad(
  accountIds: string[]
): Promise<
  | { metrics: unknown; result: BatchAccountResult }
  | { queryName?: string; queryTime?: number; result: BatchAccountResult }
> {
  if (accountIds.length === 0) {
    return { result: [] };
  }

  async function performBatchAccountLoad(): Promise<BatchAccountResult> {
    return optimizedPrisma.accounts.findMany({
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
    });
  }

  return databasePerformanceService.measureQueryPerformance(
    performBatchAccountLoad,
    'optimized:batch_account_load',
    accountIds
  );
}
