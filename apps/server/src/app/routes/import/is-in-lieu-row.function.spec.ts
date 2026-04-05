import { describe, expect, test } from 'vitest';

import { isInLieuRow } from './is-in-lieu-row.function';
import { FidelityCsvRow } from './fidelity-csv-row.interface';

function makeRow(description: string): FidelityCsvRow {
  return {
    date: '04/04/2026',
    action: 'DIVIDEND RECEIVED',
    symbol: 'OXLC',
    description,
    quantity: 0,
    price: 0,
    totalAmount: 12.5,
    account: 'Test Account',
  };
}

describe('isInLieuRow', function () {
  test('returns false for undefined description', function () {
    expect(isInLieuRow(makeRow(undefined as unknown as string))).toBe(false);
  });

  test('returns true when description contains "IN LIEU OF FRX SHARE" (uppercase)', function () {
    expect(isInLieuRow(makeRow('IN LIEU OF FRX SHARE EU PAYOUT'))).toBe(true);
  });

  test('returns true when description contains "IN LIEU OF FRX SHARE" (mixed-case)', function () {
    expect(isInLieuRow(makeRow('In Lieu Of Frx Share'))).toBe(true);
  });

  test('returns false when description does not contain the phrase', function () {
    expect(isInLieuRow(makeRow('DIVIDEND RECEIVED'))).toBe(false);
  });

  test('returns false for a split description', function () {
    expect(isInLieuRow(makeRow('REVERSE SPLIT R/S FROM 691543102'))).toBe(
      false
    );
  });

  test('returns false for empty description', function () {
    expect(isInLieuRow(makeRow(''))).toBe(false);
  });
});
