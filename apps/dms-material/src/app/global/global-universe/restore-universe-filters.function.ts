import { FilterConfig } from '../../shared/services/filter-config.interface';

interface RestoredUniverseFilters {
  symbol: string;
  riskGroup: string | null;
  expired: boolean | null;
  accountId: string;
  minYield: number | null;
}

export function restoreUniverseFilters(
  filters: FilterConfig | null
): RestoredUniverseFilters {
  if (filters === null) {
    return {
      symbol: '',
      riskGroup: null,
      expired: null,
      accountId: 'all',
      minYield: null,
    };
  }
  return {
    symbol: (filters['symbol'] as string) ?? '',
    riskGroup: (filters['risk_group'] as string) ?? null,
    expired: (filters['expired'] as boolean) ?? null,
    accountId: (filters['account_id'] as string) ?? 'all',
    minYield: (filters['min_yield'] as number) ?? null,
  };
}
