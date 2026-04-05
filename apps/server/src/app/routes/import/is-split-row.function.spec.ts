import { describe, expect, test } from 'vitest';

import { isSplitRow } from './is-split-row.function';
import { FidelityCsvRow } from './fidelity-csv-row.interface';

function makeRow(description: string): FidelityCsvRow {
  return {
    date: '04/04/2026',
    action: 'YOU BOUGHT',
    symbol: 'OXLC',
    description,
    quantity: 306,
    price: 0,
    totalAmount: 0,
    account: 'Test Account',
  };
}

describe('isSplitRow', function () {
  test('returns true when description contains "SPLIT" (uppercase)', function () {
    expect(isSplitRow(makeRow('REVERSE SPLIT R/S FROM 691543102#REOR M005168075001'))).toBe(true);
  });

  test('returns true when description contains "SPLIT" (mixed-case)', function () {
    expect(isSplitRow(makeRow('Reverse Split 1-for-5'))).toBe(true);
  });

  test('returns true when description contains "SPLIT" at start', function () {
    expect(isSplitRow(makeRow('SPLIT ADJUSTMENT'))).toBe(true);
  });

  test('returns false when description does not contain "SPLIT"', function () {
    expect(isSplitRow(makeRow('DIVIDEND RECEIVED'))).toBe(false);
  });

  test('returns false for a normal buy description', function () {
    expect(isSplitRow(makeRow('COMMON STOCK'))).toBe(false);
  });

  test('returns false for empty description', function () {
    expect(isSplitRow(makeRow(''))).toBe(false);
  });
});
