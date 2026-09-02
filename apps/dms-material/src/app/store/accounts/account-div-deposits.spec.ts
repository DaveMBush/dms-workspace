import { describe, expect, it } from 'vitest';
import { Account } from './account.interface';
import { accountsDefinition } from './accounts-definition.const';

describe('Account divDeposits PartialArrayDefinition (Story 40.3)', () => {
  it('should accept PartialArrayDefinition shape for divDeposits', () => {
    const account: Account = {
      id: 'acc-1',
      name: 'Test Account',
      openTrades: {
        startIndex: 0,
        indexes: [],
        length: 0,
      },
      soldTrades: {
        startIndex: 0,
        indexes: [],
        length: 0,
      },
      divDeposits: {
        startIndex: 0,
        indexes: ['div-1', 'div-2'],
        length: 10,
      },
      months: [],
    };

    const divDeposits = account.divDeposits as unknown as {
      startIndex: number;
      indexes: string[];
      length: number;
    };
    expect(divDeposits.startIndex).toBe(0);
    expect(divDeposits.indexes).toEqual(['div-1', 'div-2']);
    expect(divDeposits).toHaveLength(10);
  });

  it('should have default row with PartialArrayDefinition shape for divDeposits', () => {
    const defaultRow = accountsDefinition.defaultRow('test-id');

    const divDeposits = defaultRow.divDeposits as unknown as {
      startIndex: number;
      indexes: string[];
      length: number;
    };
    expect(divDeposits).toEqual({
      startIndex: 0,
      indexes: [],
      length: 0,
    });
  });

  it('should have default row with correct id', () => {
    const defaultRow = accountsDefinition.defaultRow('my-id');
    expect(defaultRow.id).toBe('my-id');
  });
});
