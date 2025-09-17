import { PrismaClient } from '@prisma/client';

import { databasePerformanceService } from './database-performance.service';

/**
 * Service for optimizing database queries related to authentication operations
 */
class AuthDatabaseOptimizerService {
  /**
   * Optimized user lookup query for authentication
   * Uses specific field selection and indexing for performance
   */
  async optimizedUserLookup(
    client: PrismaClient,
    accountName: string
  ): Promise<{ id: string; name: string } | null> {
    const queryName = 'auth:optimized_user_lookup';

    async function lookupUserByName(): Promise<{
      id: string;
      name: string;
    } | null> {
      return client.accounts.findUnique({
        where: { name: accountName },
        select: {
          id: true,
          name: true,
        },
      });
    }

    const { result } = await databasePerformanceService.measureQueryPerformance(
      lookupUserByName,
      queryName,
      [accountName]
    );

    return result;
  }

  /**
   * Batch user lookup for multiple authentication requests
   * Optimizes multiple user lookups into a single query
   */
  async batchUserLookup(
    client: PrismaClient,
    accountNames: string[]
  ): Promise<Array<{ id: string; name: string }>> {
    const queryName = 'auth:batch_user_lookup';

    async function batchLookupUsersByNames(): Promise<
      Array<{ id: string; name: string }>
    > {
      return client.accounts.findMany({
        where: {
          name: { in: accountNames },
          deletedAt: null, // Only active accounts
        },
        select: {
          id: true,
          name: true,
        },
      });
    }

    const { result } = await databasePerformanceService.measureQueryPerformance(
      batchLookupUsersByNames,
      queryName,
      [accountNames]
    );

    return result;
  }

  /**
   * Optimized session data query for authenticated users
   * Limits the amount of data fetched for session initialization
   */
  async optimizedSessionDataQuery(
    client: PrismaClient,
    accountId: string
  ): Promise<{
    id: string;
    name: string;
    recentTrades: Array<{ id: string; buy_date: Date }>;
  } | null> {
    const queryName = 'auth:optimized_session_data';

    async function getSessionDataForAccount(): Promise<{
      id: string;
      name: string;
      trades: Array<{ id: string; buy_date: Date }>;
    } | null> {
      return client.accounts.findUnique({
        where: {
          id: accountId,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          trades: {
            select: {
              id: true,
              buy_date: true,
            },
            orderBy: {
              buy_date: 'desc',
            },
            take: 5, // Only recent trades for session
          },
        },
      });
    }

    const { result } = await databasePerformanceService.measureQueryPerformance(
      getSessionDataForAccount,
      queryName,
      [accountId]
    );

    return result
      ? {
          ...result,
          recentTrades: result.trades,
        }
      : null;
  }

  /**
   * Batch authentication validation query
   * Efficiently validates multiple account authentications
   */
  async batchAuthValidation(
    client: PrismaClient,
    accountIds: string[]
  ): Promise<Array<{ id: string; name: string; isActive: boolean }>> {
    const queryName = 'auth:batch_auth_validation';

    async function validateBatchAccounts(): Promise<
      Array<{
        id: string;
        name: string;
        deletedAt: Date | null;
      }>
    > {
      return client.accounts.findMany({
        where: {
          id: { in: accountIds },
        },
        select: {
          id: true,
          name: true,
          deletedAt: true,
        },
      });
    }

    const { result } = await databasePerformanceService.measureQueryPerformance(
      validateBatchAccounts,
      queryName,
      [accountIds]
    );

    return result.map(function mapAccountValidation(account) {
      return {
        id: account.id,
        name: account.name,
        isActive: account.deletedAt === null,
      };
    });
  }

  /**
   * Get account statistics for session monitoring
   * Provides lightweight account metrics for authenticated sessions
   */
  async getAccountSessionStats(
    client: PrismaClient,
    accountId: string
  ): Promise<{
    totalTrades: number;
    activeTrades: number;
    lastActivity: Date | null;
  }> {
    const queryName = 'auth:account_session_stats';
    const context = this;
    async function getAccountStatisticsWrapper(): Promise<{
      totalTrades: number;
      activeTrades: number;
      lastActivity: Date | null;
    }> {
      return context.executeAccountStatisticsQuery(client, accountId);
    }

    const { result } = await databasePerformanceService.measureQueryPerformance(
      getAccountStatisticsWrapper,
      queryName,
      [accountId]
    );
    return result;
  }

  /**
   * Optimized account existence check for authentication
   * Fast validation of account existence without fetching full data
   */
  async accountExists(
    client: PrismaClient,
    accountName: string
  ): Promise<boolean> {
    const queryName = 'auth:account_exists_check';

    async function checkAccountExistence(): Promise<boolean> {
      const count = await client.accounts.count({
        where: {
          name: accountName,
          deletedAt: null,
        },
      });
      return count > 0;
    }

    const { result } = await databasePerformanceService.measureQueryPerformance(
      checkAccountExistence,
      queryName,
      [accountName]
    );

    return result;
  }

  /**
   * Get authentication performance statistics
   */
  getAuthQueryStats(): ReturnType<
    typeof databasePerformanceService.getQueryStatistics
  > {
    return databasePerformanceService
      .getQueryStatistics()
      .filter(function filterAuthStats(stat) {
        return stat.queryName.startsWith('auth:');
      });
  }

  /**
   * Clear authentication query metrics for testing
   */
  clearAuthMetrics(): void {
    databasePerformanceService.clearMetrics();
  }

  private async executeAccountStatisticsQuery(
    client: PrismaClient,
    accountId: string
  ): Promise<{
    totalTrades: number;
    activeTrades: number;
    lastActivity: Date | null;
  }> {
    const [totalTrades, activeTrades, lastTrade] = await Promise.all([
      client.trades.count({
        where: {
          accountId,
          deletedAt: null,
        },
      }),
      client.trades.count({
        where: {
          accountId,
          sell_date: null, // Active trades
          deletedAt: null,
        },
      }),
      client.trades.findFirst({
        where: {
          accountId,
          deletedAt: null,
        },
        select: {
          buy_date: true,
        },
        orderBy: {
          buy_date: 'desc',
        },
      }),
    ]);

    return {
      totalTrades,
      activeTrades,
      lastActivity: lastTrade?.buy_date ?? null,
    };
  }
}

export const authDatabaseOptimizerService = new AuthDatabaseOptimizerService();
