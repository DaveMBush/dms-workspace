import { databasePerformanceService } from '../services/database-performance.service';
import { optimizedPrisma } from './optimized-prisma-client';

/**
 * Optimized session data loading with strategic includes
 */
interface SessionDataResult {
  id: string;
  name: string;
  trades: Array<{
    id: string;
    buy: number;
    sell: number;
    quantity: number;
    buy_date: Date;
    sell_date: Date | null;
  }>;
  divDeposits: Array<{ id: string; date: Date; amount: number }>;
}

type SessionDataResultOrNull = SessionDataResult | null;

export async function optimizedSessionDataLoad(
  accountId: string
): Promise<{ result: SessionDataResultOrNull; metrics: unknown }> {
  async function performSessionDataLoad(): Promise<SessionDataResultOrNull> {
    return optimizedPrisma.accounts.findUnique({
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
    });
  }

  return databasePerformanceService.measureQueryPerformance(
    performSessionDataLoad,
    'optimized:session_data_load',
    [accountId]
  );
}
