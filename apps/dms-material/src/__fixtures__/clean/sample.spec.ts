import { describe, expect, it } from 'vitest';

// Fixture for the no-skipped-tests scanner (Story 12.1 AC #2).
// This file intentionally contains NO skipped-test markers so the scanner
// returns zero hits when pointed at this clean tree.
describe('fixture: clean spec with no skipped tests', () => {
  it('proves the skip scanner finds zero hits on a clean tree', () => {
    const values = [1, 2, 3];
    expect(values.filter((v) => v > 1)).toEqual([2, 3]);
  });
});
