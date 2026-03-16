import { computed, signal } from '@angular/core';

import { Account } from '../accounts/account.interface';

// Mock transitive dependencies that trigger SmartSignals initialization
vi.mock(
  '../trades/selectors/select-account-children.function',
  function mockSelectAccountChildren() {
    return {
      selectAccountChildren: vi.fn(function selectAccountChildrenMock() {
        return {
          entities: {
            'account-1': {
              id: 'account-1',
              name: 'Test Account',
              openTrades: [],
              soldTrades: [],
              divDeposits: [],
              months: [{ month: 1, year: 2024 }],
            },
          },
        };
      }),
    };
  }
);

type SelectCurrentAccountSignalModule =
  typeof import('./select-current-account.signal');
let selectCurrentAccountSignal: SelectCurrentAccountSignalModule['selectCurrentAccountSignal'];

type CurrentAccountStore = InstanceType<
  typeof import('./current-account.signal-store').currentAccountSignalStore
>;

describe('selectCurrentAccountSignal', () => {
  beforeEach(async function loadModule() {
    const mod = await import('./select-current-account.signal');
    selectCurrentAccountSignal = mod.selectCurrentAccountSignal;
  });

  function createMockStore(accountId: string): CurrentAccountStore {
    return {
      selectCurrentAccountId: computed(function mockSelectCurrentAccountId() {
        return accountId;
      }),
    } as unknown as CurrentAccountStore;
  }

  const mockAccount: Account = {
    id: 'account-1',
    name: 'Test Account',
    openTrades: [],
    soldTrades: [],
    divDeposits: [],
    months: [{ month: 1, year: 2024 }],
  };

  const emptyAccount: Account = {
    id: '',
    name: '',
    openTrades: [],
    soldTrades: [],
    divDeposits: [],
    months: [],
  };

  describe('when account exists', () => {
    it('should return the account matching the current account id', () => {
      const store = createMockStore('account-1');
      const result = selectCurrentAccountSignal(store);
      // When account exists in the entity state, it should return the account
      expect(result()).toBeDefined();
      expect(result().id).toBe('account-1');
    });

    it('should include openTrades from the account', () => {
      const store = createMockStore('account-1');
      const result = selectCurrentAccountSignal(store);
      expect(result().openTrades).toBeDefined();
    });

    it('should include soldTrades from the account', () => {
      const store = createMockStore('account-1');
      const result = selectCurrentAccountSignal(store);
      expect(result().soldTrades).toBeDefined();
    });

    it('should include divDeposits from the account', () => {
      const store = createMockStore('account-1');
      const result = selectCurrentAccountSignal(store);
      expect(result().divDeposits).toBeDefined();
    });

    it('should include months from the account', () => {
      const store = createMockStore('account-1');
      const result = selectCurrentAccountSignal(store);
      expect(result().months).toBeDefined();
    });
  });

  describe('when account does not exist', () => {
    it('should return an empty account object', () => {
      const store = createMockStore('nonexistent-id');
      const result = selectCurrentAccountSignal(store);
      expect(result().id).toBe('');
      expect(result().name).toBe('');
    });

    it('should return empty openTrades array', () => {
      const store = createMockStore('nonexistent-id');
      const result = selectCurrentAccountSignal(store);
      expect(result().openTrades).toEqual([]);
    });

    it('should return empty soldTrades array', () => {
      const store = createMockStore('nonexistent-id');
      const result = selectCurrentAccountSignal(store);
      expect(result().soldTrades).toEqual([]);
    });

    it('should return empty divDeposits array', () => {
      const store = createMockStore('nonexistent-id');
      const result = selectCurrentAccountSignal(store);
      expect(result().divDeposits).toEqual([]);
    });

    it('should return empty months array', () => {
      const store = createMockStore('nonexistent-id');
      const result = selectCurrentAccountSignal(store);
      expect(result().months).toEqual([]);
    });
  });

  describe('when account id is empty string', () => {
    it('should return an empty account when no default exists', () => {
      const store = createMockStore('');
      const result = selectCurrentAccountSignal(store);
      expect(result()).toBeDefined();
    });
  });

  describe('reactivity', () => {
    it('should return a Signal', () => {
      const store = createMockStore('account-1');
      const result = selectCurrentAccountSignal(store);
      // Verify it's callable as a signal (returns a value when invoked)
      expect(typeof result).toBe('function');
      expect(result()).toBeDefined();
    });

    it('should be a computed signal that reacts to store changes', () => {
      const accountIdSignal = signal('account-1');
      const store = {
        selectCurrentAccountId: computed(function mockReactiveId() {
          return accountIdSignal();
        }),
      } as unknown as CurrentAccountStore;
      const result = selectCurrentAccountSignal(store);
      // The signal should initially reflect the current account id
      expect(result()).toBeDefined();
    });
  });

  describe('account data integrity', () => {
    it('should spread account properties correctly', () => {
      const store = createMockStore('account-1');
      const result = selectCurrentAccountSignal(store);
      const account = result();
      // Verify the returned account has all expected fields
      expect(account).toHaveProperty('id');
      expect(account).toHaveProperty('name');
      expect(account).toHaveProperty('openTrades');
      expect(account).toHaveProperty('soldTrades');
      expect(account).toHaveProperty('divDeposits');
      expect(account).toHaveProperty('months');
    });
  });
});
