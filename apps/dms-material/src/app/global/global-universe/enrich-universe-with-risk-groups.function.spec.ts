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
  });

  it('should create new objects, not modify originals', () => {
    const result = enrichUniverseWithRiskGroups(mockUniverses, mockRiskGroups);

    expect(result[0]).not.toBe(mockUniverses[0]);
    expect(result[1]).not.toBe(mockUniverses[1]);
  });
});
