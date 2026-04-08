import { describe, expect, test } from 'vitest';

import { isSplitRow } from './is-split-row.function';
import { FidelityCsvRow } from './fidelity-csv-row.interface';

function makeRow(description: string, action = 'YOU BOUGHT'): FidelityCsvRow {
  return {
    date: '04/04/2026',
    action,
    symbol: 'OXLC',
    description,
    quantity: 306,
    price: 0,
    totalAmount: 0,
    account: 'Test Account',
  };
}

describe('isSplitRow', function () {
  test('returns false for undefined description', function () {
    expect(isSplitRow(makeRow(undefined as unknown as string))).toBe(false);
  });

  test('returns true when description contains "SPLIT" (uppercase)', function () {
    expect(
      isSplitRow(makeRow('REVERSE SPLIT R/S FROM 691543102#REOR M005168075001'))
    ).toBe(true);
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

  // Desktop format: split text is in row.action, not row.description
  test('returns true when action contains "SPLIT" (desktop FROM row)', function () {
    expect(
      isSplitRow(
        makeRow(
          'MSTY UNIT',
          'REVERSE SPLIT R/S FROM 88634T493#REOR M0051704770001'
        )
      )
    ).toBe(true);
  });

  test('returns true when action contains "SPLIT" (desktop TO row)', function () {
    expect(
      isSplitRow(
        makeRow(
          'MSTY UNIT',
          'REVERSE SPLIT R/S TO 88636X732#REOR M0051704770000'
        )
      )
    ).toBe(true);
  });

  test('returns false when neither description nor action contains "SPLIT"', function () {
    expect(isSplitRow(makeRow('MSTY UNIT', 'DIVIDEND RECEIVED'))).toBe(false);
  });

  test('returns false when both description and action are undefined', function () {
    expect(
      isSplitRow({
        description: undefined,
        action: undefined,
      } as unknown as FidelityCsvRow)
    ).toBe(false);
  });
});
