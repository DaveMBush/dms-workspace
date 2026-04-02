import { describe, expect, it } from 'vitest';

import { accountsDefinition } from './accounts-definition.const';
import { Account } from './account.interface';

describe('Account openTrades PartialArrayDefinition (Story 40.3)', () => {
  it('should accept PartialArrayDefinition shape for openTrades', () => {
    const account: Account = {
      id: 'acc-1',
      name: 'Test Account',
      openTrades: {
        startIndex: 0,
        indexes: ['trade-1', 'trade-2'],
        length: 10,
      } as unknown as Account['openTrades'],
      soldTrades: {
        startIndex: 0,
        indexes: [],
        length: 0,
      } as unknown as Account['soldTrades'],
      divDeposits: {
        startIndex: 0,
        indexes: [],
        length: 0,
      } as unknown as Account['divDeposits'],
      months: [],
    };

    const openTrades = account.openTrades as unknown as {
      startIndex: number;
      indexes: string[];
      length: number;
    };
    expect(openTrades.startIndex).toBe(0);
    expect(openTrades.indexes).toEqual(['trade-1', 'trade-2']);
    expect(openTrades.length).toBe(10);
  });

  it('should have default row with PartialArrayDefinition shape for openTrades', () => {
    const defaultRow = accountsDefinition.defaultRow('test-id');

    const openTrades = defaultRow.openTrades as unknown as {
      startIndex: number;
      indexes: string[];
      length: number;
    };
    expect(openTrades).toEqual({
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
