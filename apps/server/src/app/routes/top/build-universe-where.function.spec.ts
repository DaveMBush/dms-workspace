import { describe, it, expect } from 'vitest';

import { buildUniverseWhere } from './build-universe-where.function';

const PERMANENT_FILTER = {
  NOT: {
    AND: [{ expired: true }, { trades: { none: { sell_date: null } } }],
  },
};

describe('buildUniverseWhere', () => {
  describe('permanent expired-no-open filter', () => {
    it('should always include the NOT/AND filter regardless of user filters', () => {
      const result = buildUniverseWhere({ filters: undefined });

      expect(result.NOT).toEqual(PERMANENT_FILTER.NOT);
    });

    it('should include permanent filter even when expired=true is set by user', () => {
      const result = buildUniverseWhere({ filters: { expired: true } });

      expect(result.NOT).toEqual(PERMANENT_FILTER.NOT);
    });

    it('should include permanent filter even when expired=false is set by user', () => {
      const result = buildUniverseWhere({ filters: { expired: false } });

      expect(result.NOT).toEqual(PERMANENT_FILTER.NOT);
    });

    it('should include permanent filter when symbol filter is set', () => {
      const result = buildUniverseWhere({ filters: { symbol: 'ABC' } });

      expect(result.NOT).toEqual(PERMANENT_FILTER.NOT);
    });
  });

  describe('expired user filter', () => {
    it('should set where.expired=true when user filters expired=true', () => {
      const result = buildUniverseWhere({ filters: { expired: true } });

      expect(result.expired).toBe(true);
    });

    it('should set where.expired=false when user filters expired=false', () => {
      const result = buildUniverseWhere({ filters: { expired: false } });

      expect(result.expired).toBe(false);
    });

    it('should not set where.expired when no expired filter', () => {
      const result = buildUniverseWhere({ filters: undefined });

      expect(result.expired).toBeUndefined();
    });

    it('should not set where.expired when expired filter is a string (invalid)', () => {
      const result = buildUniverseWhere({
        filters: { expired: 'true' as unknown as boolean },
      });

      expect(result.expired).toBeUndefined();
    });
  });

  describe('symbol filter', () => {
    it('should set symbol contains filter when symbol is a non-empty string', () => {
      const result = buildUniverseWhere({ filters: { symbol: 'AAPL' } });

      expect(result.symbol).toEqual({ contains: 'AAPL' });
    });

    it('should not set symbol filter when symbol is empty string', () => {
      const result = buildUniverseWhere({ filters: { symbol: '' } });

      expect(result.symbol).toBeUndefined();
    });

    it('should not set symbol filter when symbol is not a string', () => {
      const result = buildUniverseWhere({
        filters: { symbol: 42 as unknown as string },
      });

      expect(result.symbol).toBeUndefined();
    });
  });

  describe('risk_group filter', () => {
    it('should set risk_group_id when risk_group is a string', () => {
      const result = buildUniverseWhere({ filters: { risk_group: 'EQ' } });

      expect(result.risk_group_id).toBe('EQ');
    });

    it('should not set risk_group_id when risk_group is not a string', () => {
      const result = buildUniverseWhere({
        filters: { risk_group: 1 as unknown as string },
      });

      expect(result.risk_group_id).toBeUndefined();
    });
  });

  describe('filters=undefined', () => {
    it('should return only the permanent filter when filters is undefined', () => {
      const result = buildUniverseWhere({ filters: undefined });

      expect(result).toEqual(PERMANENT_FILTER);
    });
  });
});
