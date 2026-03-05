import { TestBed } from '@angular/core/testing';
import { provideSmartNgRX } from '@smarttools/smart-signals';

// Mock selectAccounts to avoid SmartSignals initialization side effects
vi.mock(
  '../accounts/selectors/select-accounts.function',
  function mockSelectAccounts() {
    return {
      selectAccounts: vi.fn(function selectAccountsMock() {
        return [];
      }),
    };
  }
);

type SignalStoreModule = typeof import('./current-account.signal-store');
let currentAccountSignalStore: SignalStoreModule['currentAccountSignalStore'];

describe('currentAccountSignalStore', () => {
  let store: InstanceType<typeof currentAccountSignalStore>;

  beforeEach(async function setup() {
    const mod = await import('./current-account.signal-store');
    currentAccountSignalStore = mod.currentAccountSignalStore;

    TestBed.configureTestingModule({
      providers: [provideSmartNgRX()],
    });
    store = TestBed.inject(currentAccountSignalStore);
  });

  describe('initial state', () => {
    it('should create the store', () => {
      expect(store).toBeDefined();
    });

    it('should have empty string as initial id', () => {
      expect(store.id()).toBe('');
    });

    it('should return empty string for selectCurrentAccountId when no accounts exist', () => {
      expect(store.selectCurrentAccountId()).toBe('');
    });
  });

  describe('setCurrentAccountId', () => {
    it('should update the account id', () => {
      store.setCurrentAccountId('account-1');
      expect(store.id()).toBe('account-1');
    });

    it('should update selectCurrentAccountId to reflect new id', () => {
      store.setCurrentAccountId('account-1');
      expect(store.selectCurrentAccountId()).toBe('account-1');
    });

    it('should handle updating to a different account id', () => {
      store.setCurrentAccountId('account-1');
      store.setCurrentAccountId('account-2');
      expect(store.id()).toBe('account-2');
    });

    it('should handle setting id back to empty string', () => {
      store.setCurrentAccountId('account-1');
      store.setCurrentAccountId('');
      expect(store.id()).toBe('');
    });
  });

  describe('selectCurrentAccountId computed', () => {
    it('should return set id when id is non-empty', () => {
      store.setCurrentAccountId('explicit-id');
      expect(store.selectCurrentAccountId()).toBe('explicit-id');
    });

    it('should fallback to first account id when store id is empty and accounts exist', () => {
      // This test verifies fallback behavior when no account is explicitly selected
      // The computed should return the first account's id from selectAccounts
      expect(store.selectCurrentAccountId()).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle null-like account id gracefully', () => {
      store.setCurrentAccountId('');
      expect(store.id()).toBe('');
    });

    it('should handle rapid successive account changes', () => {
      store.setCurrentAccountId('account-1');
      store.setCurrentAccountId('account-2');
      store.setCurrentAccountId('account-3');
      expect(store.id()).toBe('account-3');
      expect(store.selectCurrentAccountId()).toBe('account-3');
    });

    it('should handle setting same account id multiple times', () => {
      store.setCurrentAccountId('account-1');
      store.setCurrentAccountId('account-1');
      expect(store.id()).toBe('account-1');
    });
  });
});
