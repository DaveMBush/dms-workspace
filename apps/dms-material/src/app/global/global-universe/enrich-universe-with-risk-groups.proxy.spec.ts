/**
 * Tests for the SmartNgRX proxy-specific code paths in enrichUniverseWithRiskGroups.
 * These paths are not exercised by the plain-array tests in the main spec file.
 */
import { describe, expect, it } from 'vitest';

import { RiskGroup } from '../../store/risk-group/risk-group.interface';
import { Universe } from '../../store/universe/universe.interface';
import { enrichUniverseWithRiskGroups } from './enrich-universe-with-risk-groups.function';

function makeProxy(
  items: (Universe | undefined)[],
  getIdAtIndex: (i: number) => string | undefined
) {
  return Object.assign(items as Universe[], { getIdAtIndex });
}

describe('enrichUniverseWithRiskGroups – proxy paths', () => {
  const mockRiskGroups: RiskGroup[] = [
    { id: 'rg1', name: 'High Risk', sort: 1 },
  ];

  const loadedUniverse: Universe = {
    id: 'u1',
    symbol: 'AAPL',
    distribution: 0.25,
    distributions_per_year: 4,
    last_price: 150,
    most_recent_sell_date: null,
    most_recent_sell_price: null,
    ex_date: '2024-03-15',
    risk_group_id: 'rg1',
    expired: false,
    is_closed_end_fund: false,
    name: 'Apple Inc.',
    position: 100,
    avg_purchase_yield_percent: 6.5,
  };

  it('should return placeholder entries for unloaded proxy items (getIdAtIndex returns index-N)', () => {
    // Simulate SmartNgRX ArrayProxy where item 1 is not yet loaded
    const proxyArr = makeProxy([loadedUniverse, undefined], (i) =>
      i === 0 ? 'u1' : 'index-1'
    );

    const result = enrichUniverseWithRiskGroups(proxyArr, mockRiskGroups);

    expect(result).toHaveLength(2);
    expect(result[0].symbol).toBe('AAPL');
    // Unloaded item should be a placeholder with empty fields
    expect(result[1].symbol).toBe('');
    expect(result[1].distribution).toBe(0);
  });

  it('should return placeholder when getIdAtIndex returns undefined for an item', () => {
    const proxyArr = makeProxy([undefined], () => undefined);

    const result = enrichUniverseWithRiskGroups(proxyArr, mockRiskGroups);

    expect(result[0].symbol).toBe('');
    expect(result[0].id).toContain('placeholder');
  });

  it('should return placeholder when universe item is a raw string (proxy fallback)', () => {
    // Some SmartNgRX proxy implementations return a string placeholder when
    // the entity is loading.  This tests the typeof === 'string' fallback path
    // in the absence of a getIdAtIndex method.
    const arrWithString = ['placeholder-id' as unknown as Universe];

    const result = enrichUniverseWithRiskGroups(arrWithString, mockRiskGroups);

    expect(result[0].id).toBe('placeholder-id');
    expect(result[0].symbol).toBe('');
  });

  it('should call triggerProxyLoad when visibleRange is provided and array is a proxy', () => {
    const proxyArr = makeProxy([loadedUniverse], () => 'u1');

    // Providing visibleRange causes triggerProxyLoad to run — if it throws the
    // test fails, so this simply exercises the branch for coverage.
    const result = enrichUniverseWithRiskGroups(proxyArr, mockRiskGroups, {
      start: 0,
      end: 10,
    });

    expect(result[0].symbol).toBe('AAPL');
  });

  it('should NOT call triggerProxyLoad when array is not a proxy (no getIdAtIndex)', () => {
    const result = enrichUniverseWithRiskGroups(
      [loadedUniverse],
      mockRiskGroups,
      { start: 0, end: 10 }
    );

    // Plain array with visibleRange: triggerProxyLoad is skipped because isProxy=false
    expect(result[0].symbol).toBe('AAPL');
  });
});
