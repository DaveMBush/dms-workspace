import { describe, expect, test } from 'vitest';

import { isSplitFromRow } from './is-split-from-row.function';
import { FidelityCsvRow } from './fidelity-csv-row.interface';

function makeRow(description: string, action = 'YOU BOUGHT'): FidelityCsvRow {
  return {
    date: '12/08/2025',
    action,
    symbol: 'MSTY',
    description,
    quantity: 80,
    price: 0,
    totalAmount: 0,
    account: 'Joint Brokerage *4767',
  };
}

describe('isSplitFromRow', function () {
  // Web format: R/S FROM text is in row.description
  test('returns true for web-format FROM row (description contains R/S FROM)', function () {
    expect(
      isSplitFromRow(
        makeRow('REVERSE SPLIT R/S FROM 691543102#REOR M005168075001')
      )
    ).toBe(true);
  });

  // Desktop format: R/S FROM text is in row.action
  test('returns true for desktop-format MSTY FROM row (action contains R/S FROM)', function () {
    expect(
      isSplitFromRow(
        makeRow(
          'MSTY UNIT',
          'REVERSE SPLIT R/S FROM 88634T493#REOR M0051704770001'
        )
      )
    ).toBe(true);
  });

  test('returns true for desktop-format ULTY FROM row (action contains R/S FROM)', function () {
    expect(
      isSplitFromRow(
        makeRow(
          'ULTY ETF',
          'REVERSE SPLIT R/S FROM 88636J527#REOR M0051702900001'
        )
      )
    ).toBe(true);
  });

  test('returns true for desktop-format OXLC FROM row (action contains R/S FROM)', function () {
    expect(
      isSplitFromRow(
        makeRow(
          'OXLC COMMON STOCK',
          'REVERSE SPLIT R/S FROM 691543102#REOR M0051680750001'
        )
      )
    ).toBe(true);
  });

  // TO rows should NOT match
  test('returns false for desktop-format TO row (action contains R/S TO, not R/S FROM)', function () {
    expect(
      isSplitFromRow(
        makeRow(
          'MSTY UNIT',
          'REVERSE SPLIT R/S TO 88636X732#REOR M0051704770000'
        )
      )
    ).toBe(false);
  });

  test('returns false for web-format TO row (description contains R/S TO)', function () {
    expect(
      isSplitFromRow(
        makeRow('REVERSE SPLIT R/S TO 88636X732#REOR M0051704770000')
      )
    ).toBe(false);
  });

  // Non-split rows
  test('returns false for a dividend row', function () {
    expect(isSplitFromRow(makeRow('MSTY UNIT', 'DIVIDEND RECEIVED'))).toBe(
      false
    );
  });

  test('returns false when neither field contains R/S FROM', function () {
    expect(isSplitFromRow(makeRow('COMMON STOCK', 'YOU BOUGHT'))).toBe(false);
  });

  test('returns false when both description and action are undefined', function () {
    expect(
      isSplitFromRow({
        description: undefined,
        action: undefined,
      } as unknown as FidelityCsvRow)
    ).toBe(false);
  });
});
