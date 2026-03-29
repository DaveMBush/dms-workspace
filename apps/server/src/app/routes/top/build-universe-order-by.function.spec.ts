import { describe, it, expect } from 'vitest';

import { buildUniverseOrderBy } from './build-universe-order-by.function';

describe('buildUniverseOrderBy', () => {
  describe('sortColumns (multi-column)', () => {
    it('should map a single valid direct field', () => {
      const result = buildUniverseOrderBy({
        sortColumns: [{ column: 'symbol', direction: 'asc' }],
      });

      expect(result).toEqual([{ symbol: 'asc' }]);
    });

    it('should map multiple valid direct fields', () => {
      const result = buildUniverseOrderBy({
        sortColumns: [
          { column: 'symbol', direction: 'asc' },
          { column: 'last_price', direction: 'desc' },
        ],
      });

      expect(result).toEqual([{ symbol: 'asc' }, { last_price: 'desc' }]);
    });

    it('should handle risk_group column', () => {
      const result = buildUniverseOrderBy({
        sortColumns: [{ column: 'risk_group', direction: 'desc' }],
      });

      expect(result).toEqual([{ risk_group: { name: 'desc' } }]);
    });

    it('should mix risk_group with direct fields', () => {
      const result = buildUniverseOrderBy({
        sortColumns: [
          { column: 'risk_group', direction: 'asc' },
          { column: 'distribution', direction: 'desc' },
        ],
      });

      expect(result).toEqual([
        { risk_group: { name: 'asc' } },
        { distribution: 'desc' },
      ]);
    });

    it('should silently drop invalid columns', () => {
      const result = buildUniverseOrderBy({
        sortColumns: [
          { column: 'symbol', direction: 'asc' },
          { column: 'nonexistent', direction: 'desc' },
          { column: 'last_price', direction: 'desc' },
        ],
      });

      expect(result).toEqual([{ symbol: 'asc' }, { last_price: 'desc' }]);
    });

    it('should drop computed fields', () => {
      const result = buildUniverseOrderBy({
        sortColumns: [
          { column: 'symbol', direction: 'asc' },
          { column: 'yield_percent', direction: 'desc' },
        ],
      });

      expect(result).toEqual([{ symbol: 'asc' }]);
    });

    it('should return default when all columns are invalid', () => {
      const result = buildUniverseOrderBy({
        sortColumns: [
          { column: 'nonexistent', direction: 'asc' },
          { column: 'yield_percent', direction: 'desc' },
        ],
      });

      expect(result).toEqual([{ createdAt: 'asc' }]);
    });

    it('should return default for empty sortColumns', () => {
      const result = buildUniverseOrderBy({ sortColumns: [] });

      expect(result).toEqual([{ createdAt: 'asc' }]);
    });

    it('should handle all direct sort fields', () => {
      const result = buildUniverseOrderBy({
        sortColumns: [
          { column: 'symbol', direction: 'asc' },
          { column: 'distribution', direction: 'desc' },
          { column: 'distributions_per_year', direction: 'asc' },
          { column: 'last_price', direction: 'desc' },
          { column: 'ex_date', direction: 'asc' },
          { column: 'expired', direction: 'desc' },
        ],
      });

      expect(result).toEqual([
        { symbol: 'asc' },
        { distribution: 'desc' },
        { distributions_per_year: 'asc' },
        { last_price: 'desc' },
        { ex_date: 'asc' },
        { expired: 'desc' },
      ]);
    });
  });

  describe('sortColumns takes precedence over legacy sort', () => {
    it('should use sortColumns when both are present', () => {
      const result = buildUniverseOrderBy({
        sortColumns: [{ column: 'symbol', direction: 'desc' }],
        sort: { field: 'last_price', order: 'asc' },
      });

      expect(result).toEqual([{ symbol: 'desc' }]);
    });
  });

  describe('legacy sort fallback', () => {
    it('should handle legacy sort with direct field', () => {
      const result = buildUniverseOrderBy({
        sort: { field: 'symbol', order: 'asc' },
      });

      expect(result).toEqual([{ symbol: 'asc' }]);
    });

    it('should handle legacy sort with risk_group', () => {
      const result = buildUniverseOrderBy({
        sort: { field: 'risk_group', order: 'desc' },
      });

      expect(result).toEqual([{ risk_group: { name: 'desc' } }]);
    });

    it('should return default for legacy sort with computed field', () => {
      const result = buildUniverseOrderBy({
        sort: { field: 'yield_percent', order: 'asc' },
      });

      expect(result).toEqual([{ createdAt: 'asc' }]);
    });

    it('should return default for legacy sort with unknown field', () => {
      const result = buildUniverseOrderBy({
        sort: { field: 'nonexistent', order: 'asc' },
      });

      expect(result).toEqual([{ createdAt: 'asc' }]);
    });
  });

  describe('no sort at all', () => {
    it('should return default when state is empty', () => {
      const result = buildUniverseOrderBy({});

      expect(result).toEqual([{ createdAt: 'asc' }]);
    });

    it('should return default when state only has filters', () => {
      const result = buildUniverseOrderBy({
        filters: { expired: false },
      });

      expect(result).toEqual([{ createdAt: 'asc' }]);
    });
  });
});
