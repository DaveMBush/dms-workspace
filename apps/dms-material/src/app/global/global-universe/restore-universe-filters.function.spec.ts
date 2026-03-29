import { restoreUniverseFilters } from './restore-universe-filters.function';

describe('restoreUniverseFilters', () => {
  it('should return defaults when filters is null', () => {
    const result = restoreUniverseFilters(null);

    expect(result).toEqual({
      symbol: '',
      riskGroup: null,
      expired: null,
      accountId: 'all',
      minYield: null,
    });
  });

  it('should restore all filter values from saved state', () => {
    const result = restoreUniverseFilters({
      symbol: 'AAPL',
      risk_group: 'Equities',
      expired: true,
      min_yield: 5.5,
      account_id: 'acc-1',
    });

    expect(result.symbol).toBe('AAPL');
    expect(result.riskGroup).toBe('Equities');
    expect(result.expired).toBe(true);
    expect(result.minYield).toBe(5.5);
    expect(result.accountId).toBe('acc-1');
  });

  it('should silently ignore unknown filter keys', () => {
    const result = restoreUniverseFilters({
      symbol: 'MSFT',
      unknown_key: 'ignored',
    });

    expect(result.symbol).toBe('MSFT');
    expect(result.riskGroup).toBeNull();
    expect(result.expired).toBeNull();
    expect(result.accountId).toBe('all');
    expect(result.minYield).toBeNull();
  });

  it('should handle empty filter config', () => {
    const result = restoreUniverseFilters({});

    expect(result.symbol).toBe('');
    expect(result.riskGroup).toBeNull();
  });
});
