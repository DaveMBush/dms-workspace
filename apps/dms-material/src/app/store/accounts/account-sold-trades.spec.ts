import { describe, expect, it } from 'vitest';

import { accountsDefinition } from './accounts-definition.const';
import { Account } from './account.interface';

// Story AX.9: TDD Tests for Account interface and default row with PartialArrayDefinition for soldTrades
// RED phase — these tests expect soldTrades to use PartialArrayDefinition
// which hasn't been implemented yet
// Disabled with describe.skip() to allow CI to pass
// Will be re-enabled in Story AX.10

describe('Account soldTrades PartialArrayDefinition (AX.9)', () => {
  it('should accept PartialArrayDefinition shape for soldTrades', () => {
    const account: Account = {
      id: 'acc-1',
      name: 'Test Account',
      openTrades: {
        startIndex: 0,
        indexes: [],
        length: 0,
      } as unknown as Account['openTrades'],
      soldTrades: {
        startIndex: 0,
        indexes: ['trade-1', 'trade-2'],
        length: 10,
      } as unknown as Account['soldTrades'],
      divDeposits: {
        startIndex: 0,
        indexes: [],
        length: 0,
      },
      months: [],
    };

    const soldTrades = account.soldTrades as unknown as {
      startIndex: number;
      indexes: string[];
      length: number;
    };
    expect(soldTrades.startIndex).toBe(0);
    expect(soldTrades.indexes).toEqual(['trade-1', 'trade-2']);
    expect(soldTrades.length).toBe(10);
  });

  it('should have default row with PartialArrayDefinition shape for soldTrades', () => {
    const defaultRow = accountsDefinition.defaultRow('test-id');

    const soldTrades = defaultRow.soldTrades as unknown as {
      startIndex: number;
      indexes: string[];
      length: number;
    };
    expect(soldTrades).toEqual({
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
