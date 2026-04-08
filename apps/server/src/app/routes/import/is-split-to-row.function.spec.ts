import { describe, expect, test } from 'vitest';

import { isSplitToRow } from './is-split-to-row.function';
import { FidelityCsvRow } from './fidelity-csv-row.interface';

function makeRow(description: string, action = 'YOU BOUGHT'): FidelityCsvRow {
  return {
    date: '12/08/2025',
    action,
    symbol: '88634T493',
    description,
    quantity: -400,
    price: 0,
    totalAmount: 0,
    account: 'Joint Brokerage *4767',
  };
}

describe('isSplitToRow', function () {
  // Web format: R/S TO text is in row.description
  test('returns true for web-format TO row (description contains R/S TO)', function () {
    expect(
      isSplitToRow(
        makeRow('REVERSE SPLIT R/S TO 88636X732#REOR M0051704770000')
      )
    ).toBe(true);
  });

  // Desktop format: R/S TO text is in row.action
  test('returns true for desktop-format MSTY TO row (action contains R/S TO)', function () {
    expect(
      isSplitToRow(
        makeRow(
          'MSTY UNIT',
          'REVERSE SPLIT R/S TO 88636X732#REOR M0051704770000'
        )
      )
    ).toBe(true);
  });

  test('returns true for desktop-format ULTY TO row (action contains R/S TO)', function () {
    expect(
      isSplitToRow(
        makeRow(
          'ULTY ETF',
          'REVERSE SPLIT R/S TO 88636X708#REOR M0051702900000'
        )
      )
    ).toBe(true);
  });

  test('returns true for desktop-format OXLC TO row (action contains R/S TO)', function () {
    expect(
      isSplitToRow(
        makeRow(
          'OXLC COMMON STOCK',
          'REVERSE SPLIT R/S TO 691543847#REOR M0051680750000'
        )
      )
    ).toBe(true);
  });

  // FROM rows should NOT match
  test('returns false for desktop-format FROM row (action contains R/S FROM, not R/S TO)', function () {
    expect(
      isSplitToRow(
        makeRow(
          'MSTY UNIT',
          'REVERSE SPLIT R/S FROM 88634T493#REOR M0051704770001'
        )
      )
    ).toBe(false);
  });

  test('returns false for web-format FROM row (description contains R/S FROM)', function () {
    expect(
      isSplitToRow(
        makeRow('REVERSE SPLIT R/S FROM 691543102#REOR M005168075001')
      )
    ).toBe(false);
  });

  // Non-split rows
  test('returns false for a dividend row', function () {
    expect(isSplitToRow(makeRow('MSTY UNIT', 'DIVIDEND RECEIVED'))).toBe(false);
  });

  test('returns false when neither field contains R/S TO', function () {
    expect(isSplitToRow(makeRow('COMMON STOCK', 'YOU BOUGHT'))).toBe(false);
  });

  test('returns false when both description and action are undefined', function () {
    expect(
      isSplitToRow({
        description: undefined,
        action: undefined,
      } as unknown as FidelityCsvRow)
    ).toBe(false);
  });
});
