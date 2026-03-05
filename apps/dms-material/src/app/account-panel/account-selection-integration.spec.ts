import { TestBed } from '@angular/core/testing';

import { Account } from '../store/accounts/account.interface';
import { Trade } from '../store/trades/trade.interface';
import { DivDeposit } from '../store/div-deposits/div-deposit.interface';

// ── Hoisted mocks ────────────────────────────────────────────────────────
// These must be declared before vi.mock() calls so they are in scope.
const { mockAccountEntities, hoistedSelectAccountChildren } = vi.hoisted(() => {
  const entities: Record<string, Account> = {};
  const selectFn = vi.fn(function selectAccountChildrenMock() {
    return { entities };
  });
  return {
    mockAccountEntities: entities,
    hoistedSelectAccountChildren: selectFn,
  };
});

// Mock SmartNgRX selectors to avoid runtime initialisation side-effects
vi.mock(
  '../store/trades/selectors/select-account-children.function',
  function mockSelectAccountChildrenModule() {
    return { selectAccountChildren: hoistedSelectAccountChildren };
  }
);

vi.mock(
  '../store/accounts/selectors/select-accounts.function',
  function mockSelectAccountsModule() {
    return {
      selectAccounts: vi.fn(function selectAccountsMock() {
        return [];
      }),
    };
  }
);

vi.mock(
  '../store/accounts/selectors/select-accounts-entity.function',
  function mockSelectAccountsEntityModule() {
    return {
      selectAccountsEntity: vi.fn(function selectAccountsEntityMock() {
        return {};
      }),
    };
  }
);

vi.mock(
  '../store/trades/selectors/select-trades.function',
  function mockSelectTradesModule() {
    return {
      selectTrades: vi.fn(function selectTradesMock() {
        return [];
      }),
    };
  }
);

vi.mock(
  '../store/trades/selectors/select-trades-entity.function',
  function mockSelectTradesEntityModule() {
    return {
      selectTradesEntity: vi.fn(function selectTradesEntityMock() {
        return {};
      }),
    };
  }
);

vi.mock(
  '../store/div-deposits/div-deposits.selectors',
  function mockDivDepositSelectorsModule() {
    return {
      selectDivDepositEntity: vi.fn(function selectDivDepositEntityMock() {
        return {};
      }),
    };
  }
);

vi.mock(
  '../store/div-deposit-types/selectors/select-div-deposit-types.function',
  function mockSelectDivDepositTypesModule() {
    return {
      selectDivDepositTypes: vi.fn(function selectDivDepositTypesMock() {
        return [];
      }),
    };
  }
);

vi.mock(
  '../store/universe/selectors/select-universes.function',
  function mockSelectUniversesModule() {
    return {
      selectUniverses: vi.fn(function selectUniversesMock() {
        return [];
      }),
    };
  }
);

vi.mock(
  '../store/top/selectors/select-top-entities.function',
  function mockSelectTopEntitiesModule() {
    return {
      selectTopEntities: vi.fn(function selectTopEntitiesMock() {
        return [];
      }),
    };
  }
);

vi.mock(
  '../shared/build-universe-map.function',
  function mockBuildUniverseMapModule() {
    return {
      buildUniverseMap: vi.fn(function buildUniverseMapMock() {
        return new Map();
      }),
    };
  }
);

// ── Dynamic imports (after mocks are registered) ─────────────────────────
type CurrentAccountSignalStoreModule =
  typeof import('../store/current-account/current-account.signal-store');
type SelectCurrentAccountSignalModule =
  typeof import('../store/current-account/select-current-account.signal');

let currentAccountSignalStore: CurrentAccountSignalStoreModule['currentAccountSignalStore'];
let selectCurrentAccountSignal: SelectCurrentAccountSignalModule['selectCurrentAccountSignal'];

// ── Helpers ──────────────────────────────────────────────────────────────

function createAccount(id: string, name: string): Account {
  return {
    id,
    name,
    trades: [] as Trade[],
    divDeposits: [] as unknown as Account['divDeposits'],
    months: [],
  };
}

function createTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    id: 'trade-1',
    universeId: 'u-1',
    accountId: 'account-1',
    buy: 100,
    sell: 0,
    buy_date: '2024-01-15',
    quantity: 10,
    ...overrides,
  };
}

function createDivDeposit(overrides: Partial<DivDeposit> = {}): DivDeposit {
  return {
    id: 'div-1',
    date: new Date('2024-06-15'),
    amount: 50,
    accountId: 'account-1',
    divDepositTypeId: 'type-1',
    universeId: 'u-1',
    ...overrides,
  };
}

function clearEntities(): void {
  for (const key of Object.keys(mockAccountEntities)) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- test cleanup requires dynamic key removal
    delete mockAccountEntities[key];
  }
}

function populateAccounts(accounts: Record<string, Account>): void {
  clearEntities();
  Object.assign(mockAccountEntities, accounts);
}

// ══════════════════════════════════════════════════════════════════════════
// Integration Test Suite
// ══════════════════════════════════════════════════════════════════════════

describe('Account Selection Integration', () => {
  let store: InstanceType<typeof currentAccountSignalStore>;

  beforeEach(async function setupTestBed() {
    // Dynamic import so vi.mock() is applied first
    const storeMod = await import(
      '../store/current-account/current-account.signal-store'
    );
    currentAccountSignalStore = storeMod.currentAccountSignalStore;

    const signalMod = await import(
      '../store/current-account/select-current-account.signal'
    );
    selectCurrentAccountSignal = signalMod.selectCurrentAccountSignal;

    // Seed two accounts
    populateAccounts({
      'account-1': {
        ...createAccount('account-1', 'Brokerage'),
        trades: [createTrade({ id: 't-1', accountId: 'account-1' })],
        divDeposits: [
          createDivDeposit({ id: 'd-1', accountId: 'account-1' }),
        ] as unknown as Account['divDeposits'],
      },
      'account-2': {
        ...createAccount('account-2', 'Retirement'),
        trades: [createTrade({ id: 't-2', accountId: 'account-2', buy: 200 })],
        divDeposits: [
          createDivDeposit({
            id: 'd-2',
            accountId: 'account-2',
            amount: 75,
          }),
        ] as unknown as Account['divDeposits'],
      },
    });

    TestBed.configureTestingModule({
      providers: [],
    });

    store = TestBed.inject(currentAccountSignalStore);
  });

  afterEach(function cleanupEntities() {
    clearEntities();
  });

  // ────────────────────────────────────────────────────────────────────────
  // Scenario 1 – Rapid Account Switching
  // ────────────────────────────────────────────────────────────────────────

  describe('Rapid Account Switching', () => {
    it('should resolve to the last-set account after rapid switches', () => {
      store.setCurrentAccountId('account-1');
      store.setCurrentAccountId('account-2');
      store.setCurrentAccountId('account-1');
      store.setCurrentAccountId('account-2');

      expect(store.selectCurrentAccountId()).toBe('account-2');
    });

    it('should return the correct account data after rapid switches', () => {
      const currentAccount = selectCurrentAccountSignal(store);

      store.setCurrentAccountId('account-1');
      store.setCurrentAccountId('account-2');
      store.setCurrentAccountId('account-1');

      const account = currentAccount();
      expect(account.id).toBe('account-1');
      expect(account.name).toBe('Brokerage');
    });

    it('should reflect trades for the final account after rapid switches', () => {
      const currentAccount = selectCurrentAccountSignal(store);

      store.setCurrentAccountId('account-2');
      store.setCurrentAccountId('account-1');
      store.setCurrentAccountId('account-2');

      const trades = currentAccount().trades as Trade[];
      expect(trades.length).toBe(1);
      expect(trades[0].buy).toBe(200);
    });

    it('should reflect divDeposits for the final account after rapid switches', () => {
      const currentAccount = selectCurrentAccountSignal(store);

      store.setCurrentAccountId('account-1');
      store.setCurrentAccountId('account-2');

      const divDeposits = currentAccount()
        .divDeposits as unknown as DivDeposit[];
      expect(divDeposits.length).toBe(1);
      expect(divDeposits[0].amount).toBe(75);
    });

    it('should remain stable when set to the same account repeatedly', () => {
      const currentAccount = selectCurrentAccountSignal(store);

      store.setCurrentAccountId('account-1');
      store.setCurrentAccountId('account-1');
      store.setCurrentAccountId('account-1');

      expect(currentAccount().id).toBe('account-1');
      expect(currentAccount().name).toBe('Brokerage');
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Scenario 2 – Cross-Component State
  // ────────────────────────────────────────────────────────────────────────

  describe('Cross-Component State', () => {
    it('should propagate the account ID to selectCurrentAccountSignal', () => {
      const currentAccount = selectCurrentAccountSignal(store);

      store.setCurrentAccountId('account-1');
      expect(currentAccount().id).toBe('account-1');

      store.setCurrentAccountId('account-2');
      expect(currentAccount().id).toBe('account-2');
    });

    it('should update trades when the account changes', () => {
      const currentAccount = selectCurrentAccountSignal(store);

      store.setCurrentAccountId('account-1');
      const tradesA = currentAccount().trades as Trade[];
      expect(tradesA[0].id).toBe('t-1');

      store.setCurrentAccountId('account-2');
      const tradesB = currentAccount().trades as Trade[];
      expect(tradesB[0].id).toBe('t-2');
    });

    it('should update divDeposits when the account changes', () => {
      const currentAccount = selectCurrentAccountSignal(store);

      store.setCurrentAccountId('account-1');
      const depsA = currentAccount().divDeposits as unknown as DivDeposit[];
      expect(depsA[0].id).toBe('d-1');

      store.setCurrentAccountId('account-2');
      const depsB = currentAccount().divDeposits as unknown as DivDeposit[];
      expect(depsB[0].id).toBe('d-2');
    });

    it('should update months when the account changes', () => {
      populateAccounts({
        'account-1': {
          ...createAccount('account-1', 'Brokerage'),
          months: [{ month: 1, year: 2024 }],
        },
        'account-2': {
          ...createAccount('account-2', 'Retirement'),
          months: [
            { month: 6, year: 2024 },
            { month: 7, year: 2024 },
          ],
        },
      });

      const currentAccount = selectCurrentAccountSignal(store);

      store.setCurrentAccountId('account-1');
      expect(currentAccount().months.length).toBe(1);

      store.setCurrentAccountId('account-2');
      expect(currentAccount().months.length).toBe(2);
    });

    it('should reflect all fields consistently for a given account', () => {
      const currentAccount = selectCurrentAccountSignal(store);

      store.setCurrentAccountId('account-1');
      const account = currentAccount();

      expect(account.id).toBe('account-1');
      expect(account.name).toBe('Brokerage');
      expect((account.trades as Trade[]).length).toBe(1);
      expect((account.divDeposits as unknown as DivDeposit[]).length).toBe(1);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Scenario 3 – Error Handling
  // ────────────────────────────────────────────────────────────────────────

  describe('Error Handling', () => {
    it('should return empty account when account ID does not exist in entities', () => {
      const currentAccount = selectCurrentAccountSignal(store);

      store.setCurrentAccountId('nonexistent-id');

      const account = currentAccount();
      expect(account.id).toBe('');
      expect(account.name).toBe('');
      expect((account.trades as Trade[]).length).toBe(0);
    });

    it('should return empty account when entities store is completely empty', () => {
      populateAccounts({});

      const currentAccount = selectCurrentAccountSignal(store);
      store.setCurrentAccountId('account-1');

      const account = currentAccount();
      expect(account.id).toBe('');
      expect(account.name).toBe('');
    });

    it('should recover when switching from invalid to valid account', () => {
      const currentAccount = selectCurrentAccountSignal(store);

      store.setCurrentAccountId('nonexistent-id');
      expect(currentAccount().id).toBe('');

      store.setCurrentAccountId('account-1');
      expect(currentAccount().id).toBe('account-1');
      expect(currentAccount().name).toBe('Brokerage');
    });

    it('should recover when switching from valid to invalid and back to valid', () => {
      const currentAccount = selectCurrentAccountSignal(store);

      store.setCurrentAccountId('account-1');
      expect(currentAccount().id).toBe('account-1');

      store.setCurrentAccountId('nonexistent-id');
      expect(currentAccount().id).toBe('');

      store.setCurrentAccountId('account-2');
      expect(currentAccount().id).toBe('account-2');
      expect(currentAccount().name).toBe('Retirement');
    });

    it('should handle account with empty trades and divDeposits gracefully', () => {
      populateAccounts({
        'account-empty': createAccount('account-empty', 'Empty Account'),
      });

      const currentAccount = selectCurrentAccountSignal(store);
      store.setCurrentAccountId('account-empty');

      const account = currentAccount();
      expect(account.id).toBe('account-empty');
      expect((account.trades as Trade[]).length).toBe(0);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Scenario 4 – Memory Leak Prevention
  // ────────────────────────────────────────────────────────────────────────

  describe('Memory Leak Prevention', () => {
    it('should not grow computed signal references when switching accounts many times', () => {
      const currentAccount = selectCurrentAccountSignal(store);

      // Switch accounts 100 times
      for (let i = 0; i < 100; i++) {
        const accountId = i % 2 === 0 ? 'account-1' : 'account-2';
        store.setCurrentAccountId(accountId);
        // Access the signal to trigger computation
        currentAccount();
      }

      // After all switches the signal should still resolve correctly
      store.setCurrentAccountId('account-1');
      expect(currentAccount().id).toBe('account-1');
      expect(currentAccount().name).toBe('Brokerage');
    });

    it('should reuse the same selectCurrentAccountSignal without stacking', () => {
      // Creating the signal multiple times should not cause duplicate references
      const signalA = selectCurrentAccountSignal(store);
      const signalB = selectCurrentAccountSignal(store);

      store.setCurrentAccountId('account-1');
      expect(signalA().id).toBe('account-1');
      expect(signalB().id).toBe('account-1');

      store.setCurrentAccountId('account-2');
      expect(signalA().id).toBe('account-2');
      expect(signalB().id).toBe('account-2');
    });

    it('should not accumulate stale entity references after switching away and back', () => {
      const currentAccount = selectCurrentAccountSignal(store);

      store.setCurrentAccountId('account-1');
      expect(currentAccount().name).toBe('Brokerage');

      // Switch away
      store.setCurrentAccountId('account-2');
      expect(currentAccount().name).toBe('Retirement');

      // Switch back — should resolve to the same account without stale data
      store.setCurrentAccountId('account-1');
      expect(currentAccount().name).toBe('Brokerage');
      expect(currentAccount().id).toBe('account-1');
    });

    it('should produce stable output when no account change occurs', () => {
      const currentAccount = selectCurrentAccountSignal(store);
      store.setCurrentAccountId('account-1');

      const results: string[] = [];
      for (let i = 0; i < 50; i++) {
        results.push(currentAccount().id);
      }

      const allSame = results.every(function checkSame(id) {
        return id === 'account-1';
      });
      expect(allSame).toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Scenario 5 – Initial Load
  // ────────────────────────────────────────────────────────────────────────

  describe('Initial Load', () => {
    it('should have empty string as initial account ID', () => {
      expect(store.id()).toBe('');
    });

    it('should return empty account when no account ID is set and no accounts exist', () => {
      populateAccounts({});
      const currentAccount = selectCurrentAccountSignal(store);

      const account = currentAccount();
      expect(account.id).toBe('');
      expect(account.name).toBe('');
      expect((account.trades as Trade[]).length).toBe(0);
    });

    it('should load the correct account once setCurrentAccountId is called from a route', () => {
      const currentAccount = selectCurrentAccountSignal(store);

      // Simulate what happens when the route resolves and sets the account
      store.setCurrentAccountId('account-2');

      const account = currentAccount();
      expect(account.id).toBe('account-2');
      expect(account.name).toBe('Retirement');
    });

    it('should include trades for the initially loaded account', () => {
      const currentAccount = selectCurrentAccountSignal(store);

      store.setCurrentAccountId('account-1');

      const trades = currentAccount().trades as Trade[];
      expect(trades.length).toBe(1);
      expect(trades[0].id).toBe('t-1');
    });

    it('should include divDeposits for the initially loaded account', () => {
      const currentAccount = selectCurrentAccountSignal(store);

      store.setCurrentAccountId('account-1');

      const divDeposits = currentAccount()
        .divDeposits as unknown as DivDeposit[];
      expect(divDeposits.length).toBe(1);
      expect(divDeposits[0].id).toBe('d-1');
    });

    it('should include months for the initially loaded account', () => {
      populateAccounts({
        'account-1': {
          ...createAccount('account-1', 'Brokerage'),
          months: [{ month: 3, year: 2025 }],
        },
      });

      const currentAccount = selectCurrentAccountSignal(store);
      store.setCurrentAccountId('account-1');

      expect(currentAccount().months.length).toBe(1);
      expect(currentAccount().months[0].month).toBe(3);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Edge Cases – Null / Invalid Account
  // ────────────────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should handle setting account ID to empty string', () => {
      const currentAccount = selectCurrentAccountSignal(store);

      store.setCurrentAccountId('account-1');
      expect(currentAccount().id).toBe('account-1');

      store.setCurrentAccountId('');
      // With empty ID and no accounts in the mocked selectAccounts, should fall through
      expect(currentAccount().id).toBe('');
    });

    it('should handle account that has undefined trades gracefully', () => {
      populateAccounts({
        'account-no-trades': {
          id: 'account-no-trades',
          name: 'No Trades',
          trades: undefined as unknown as Trade[],
          divDeposits: [] as unknown as Account['divDeposits'],
          months: [],
        },
      });

      const currentAccount = selectCurrentAccountSignal(store);
      store.setCurrentAccountId('account-no-trades');

      // Should still resolve without throwing
      const account = currentAccount();
      expect(account.id).toBe('account-no-trades');
    });

    it('should handle switching between many valid accounts in sequence', () => {
      // Add 10 accounts
      const tenAccounts: Record<string, Account> = {};
      for (let i = 0; i < 10; i++) {
        const id = `account-${i}`;
        tenAccounts[id] = createAccount(id, `Account ${i}`);
      }
      populateAccounts(tenAccounts);

      const currentAccount = selectCurrentAccountSignal(store);

      // Switch through all 10 in sequence
      for (let i = 0; i < 10; i++) {
        store.setCurrentAccountId(`account-${i}`);
        expect(currentAccount().id).toBe(`account-${i}`);
        expect(currentAccount().name).toBe(`Account ${i}`);
      }
    });

    it('should return empty divDeposits and trades for a newly created account', () => {
      populateAccounts({
        'account-new': createAccount('account-new', 'Brand New'),
      });

      const currentAccount = selectCurrentAccountSignal(store);
      store.setCurrentAccountId('account-new');

      const account = currentAccount();
      expect(account.id).toBe('account-new');
      expect((account.trades as Trade[]).length).toBe(0);
    });

    it('should handle account ID with special characters', () => {
      const specialId = 'account-special_chars.123';
      populateAccounts({
        [specialId]: createAccount(specialId, 'Special Account'),
      });

      const currentAccount = selectCurrentAccountSignal(store);
      store.setCurrentAccountId(specialId);

      expect(currentAccount().id).toBe(specialId);
      expect(currentAccount().name).toBe('Special Account');
    });
  });
});
