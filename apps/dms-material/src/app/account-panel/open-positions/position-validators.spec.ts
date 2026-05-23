import { describe, expect, it } from 'vitest';

import { isTradeClosed, isPositive, isValidDate, isValidNumber } from './position-validators';

describe('isValidDate', () => {
  it('returns true for a valid date string', () => {
    expect(isValidDate('2026-05-22')).toBe(true);
  });

  it('returns false for an invalid format', () => {
    expect(isValidDate('22-05-2026')).toBe(false);
  });
});

describe('isValidNumber', () => {
  it('returns true for finite numbers', () => {
    expect(isValidNumber(42)).toBe(true);
  });

  it('returns false for NaN', () => {
    expect(isValidNumber(NaN)).toBe(false);
  });
});

describe('isPositive', () => {
  it('returns true for positive numbers', () => {
    expect(isPositive(1)).toBe(true);
  });

  it('returns false for zero', () => {
    expect(isPositive(0)).toBe(false);
  });

  it('returns false for negative numbers', () => {
    expect(isPositive(-1)).toBe(false);
  });
});

describe('isTradeClosed', () => {
  it('returns true when sell_date set and sell > 0', () => {
    expect(isTradeClosed({ sell_date: '2026-05-22', sell: 100 })).toBe(true);
  });

  it('returns false when sell_date set but sell == 0', () => {
    expect(isTradeClosed({ sell_date: '2026-05-22', sell: 0 })).toBe(false);
  });

  it('returns false when sell_date undefined and sell > 0', () => {
    expect(isTradeClosed({ sell_date: undefined, sell: 100 })).toBe(false);
  });

  it('returns false when both absent', () => {
    expect(isTradeClosed({ sell_date: undefined, sell: 0 })).toBe(false);
  });

  it('returns false when sell_date set and sell negative', () => {
    expect(isTradeClosed({ sell_date: '2026-05-22', sell: -1 })).toBe(false);
  });

  it('returns false when sell_date empty string and sell > 0', () => {
    expect(isTradeClosed({ sell_date: '', sell: 100 })).toBe(false);
  });

  it('returns false when sell_date is null and sell > 0', () => {
    expect(isTradeClosed({ sell_date: null, sell: 100 })).toBe(false);
  });

  it('returns false when sell is NaN', () => {
    expect(isTradeClosed({ sell_date: '2026-05-22', sell: NaN })).toBe(false);
  });
});
