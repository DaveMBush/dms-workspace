import { describe, it, expect } from 'vitest';

import { RiskGroup } from '../../store/risk-group/risk-group.interface';
import { Universe } from '../../store/universe/universe.interface';
import { enrichUniverseWithRiskGroups } from './enrich-universe-with-risk-groups.function';

describe('enrichUniverseWithRiskGroups', () => {
  const mockRiskGroups: RiskGroup[] = [
    { id: 'rg1', name: 'High Risk', sort: 1 },
    { id: 'rg2', name: 'Low Risk', sort: 2 },
  ];

  const mockUniverses: Universe[] = [
    {
      id: '1',
      symbol: 'AAPL',
      distribution: 0.25,
      distributions_per_year: 4,
      last_price: 150.0,
      most_recent_sell_date: null,
      most_recent_sell_price: null,
      ex_date: '2024-03-15',
      risk_group_id: 'rg1',
      expired: false,
      is_closed_end_fund: false,
      name: 'Apple Inc.',
      position: 100,
      avg_purchase_yield_percent: 6.5,
    },
    {
      id: '2',
      symbol: 'GOOGL',
      distribution: 0.0,
      distributions_per_year: 0,
      last_price: 140.0,
      most_recent_sell_date: null,
      most_recent_sell_price: null,
      ex_date: null,
      risk_group_id: 'rg2',
      expired: false,
      is_closed_end_fund: false,
      name: 'Alphabet Inc.',
      position: 50,
      avg_purchase_yield_percent: 0,
    },
  ];

  it('should enrich universes with risk group names', () => {
    const result = enrichUniverseWithRiskGroups(mockUniverses, mockRiskGroups);

    expect(result).toHaveLength(2);
    expect(result[0].risk_group).toBe('High Risk');
    expect(result[1].risk_group).toBe('Low Risk');
  });

  it('should use risk_group_id as fallback when no matching risk group found', () => {
    const universeWithUnknownRiskGroup: Universe[] = [
      {
        ...mockUniverses[0],
        risk_group_id: 'unknown',
      },
    ];

    const result = enrichUniverseWithRiskGroups(
      universeWithUnknownRiskGroup,
      mockRiskGroups
    );

    expect(result[0].risk_group).toBe('unknown');
  });

  it('should handle empty risk groups array', () => {
    const result = enrichUniverseWithRiskGroups(mockUniverses, []);

    expect(result).toHaveLength(2);
    expect(result[0].risk_group).toBe('rg1');
    expect(result[1].risk_group).toBe('rg2');
  });

  it('should handle null risk groups', () => {
    const result = enrichUniverseWithRiskGroups(mockUniverses, null as any);

    expect(result).toHaveLength(2);
    expect(result[0].risk_group).toBe('rg1');
    expect(result[1].risk_group).toBe('rg2');
  });

  it('should copy all universe properties', () => {
    const result = enrichUniverseWithRiskGroups(mockUniverses, mockRiskGroups);

    const enriched = result[0];
    const original = mockUniverses[0];

    expect(enriched.id).toBe(original.id);
    expect(enriched.symbol).toBe(original.symbol);
    expect(enriched.distribution).toBe(original.distribution);
    expect(enriched.distributions_per_year).toBe(
      original.distributions_per_year
    );
    expect(enriched.last_price).toBe(original.last_price);
    expect(enriched.ex_date).toBe(original.ex_date);
    expect(enriched.risk_group_id).toBe(original.risk_group_id);
    expect(enriched.expired).toBe(original.expired);
    expect(enriched.is_closed_end_fund).toBe(original.is_closed_end_fund);
    expect(enriched.name).toBe(original.name);
    expect(enriched.position).toBe(original.position);
    expect(enriched.avg_purchase_yield_percent).toBe(
      original.avg_purchase_yield_percent
    );
  });

  it('should create new objects, not modify originals', () => {
    const result = enrichUniverseWithRiskGroups(mockUniverses, mockRiskGroups);

    expect(result[0]).not.toBe(mockUniverses[0]);
    expect(result[1]).not.toBe(mockUniverses[1]);
  });

  it('should include SmartNgRX loading rows as placeholders to keep array length stable (Story 60.2 fix)', () => {
    // Fix for Epic 60 regression: loading rows must remain in the result array
    // as placeholders so CDK virtual scroll viewport height stays stable during
    // rapid scroll. Returning null (old Story 56.2 behavior) caused array length
    // to fluctuate, resulting in scroll position jumps and blank rows.
    const loadingUniverse = {
      ...mockUniverses[0],
      id: 'loading-id',
      symbol: '',
      isLoading: true,
    } as Universe & { isLoading: boolean };
    const mixedUniverses = [loadingUniverse, mockUniverses[1]];

    const result = enrichUniverseWithRiskGroups(mixedUniverses, mockRiskGroups);

    // Both rows must be present (no null filtering) so array length is stable
    expect(result).toHaveLength(2);
    // Loading row is a placeholder — id is preserved, symbol is empty
    expect(result[0].id).toBe('loading-id');
    expect(result[0].symbol).toBe('');
    // Non-loading row is fully populated
    expect(result[1].id).toBe('2');
  });

  it('should preserve row id via getIdAtIndex (SmartNgRX proxy path) for loading rows', () => {
    // Covers the proxy path: SmartNgRX wraps the Universe array with getIdAtIndex
    // so enrichUniverseWithRiskGroups uses the proxy id rather than the row id.
    const loadingUniverse = {
      ...mockUniverses[0],
      id: 'real-uuid-from-store',
      symbol: '',
      isLoading: true,
    } as Universe & { isLoading: boolean };

    // Simulate SmartNgRX proxy: array with getIdAtIndex method
    const proxyArray = [loadingUniverse, mockUniverses[1]] as Universe[];
    const proxyLike = proxyArray as unknown as Universe[] & {
      getIdAtIndex(i: number): string | undefined;
    };
    proxyLike.getIdAtIndex = function getIdAtIndex(i: number): string {
      return (proxyArray[i] as Universe & { id: string }).id;
    };

    const result = enrichUniverseWithRiskGroups(proxyLike, mockRiskGroups);

    // Array length is stable — no null filtering
    expect(result).toHaveLength(2);
    // Proxy path: id comes from getIdAtIndex → 'real-uuid-from-store'
    expect(result[0].id).toBe('real-uuid-from-store');
    expect(result[0].symbol).toBe('');
    // Non-loading row is fully populated
    expect(result[1].id).toBe('2');
  });
});
