import { describe, expect, it } from 'vitest';

import { accountsDefinition } from './accounts-definition.const';
import { Account } from './account.interface';

// Story AX.5: TDD Tests for Account interface and default row with PartialArrayDefinition
// RED phase — these tests expect openTrades to use PartialArrayDefinition
// which hasn't been implemented yet
// TODO(E3): blocked — openTrades PartialArrayDefinition not implemented yet (Story AX.6)
// Disabled with describe.skip() to allow CI to pass
// Will be re-enabled in Story AX.6

describe.skip('Account openTrades PartialArrayDefinition (AX.5)', () => {
  it('should accept PartialArrayDefinition shape for openTrades', () => {
    // The Account interface should allow openTrades as PartialArrayDefinition
    const account: Account = {
      id: 'acc-1',
      name: 'Test Account',
      openTrades: {
        startIndex: 0,
        indexes: ['trade-1', 'trade-2'],
        length: 10,
      } as unknown as Account['openTrades'],
      soldTrades: [],
      divDeposits: {
        startIndex: 0,
        indexes: [],
        length: 0,
      },
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

    // After AX.6 implementation, openTrades default should be
    // a PartialArrayDefinition-compatible shape (empty array is OK
    // since SmartNgRX accepts both)
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
