import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { vi } from 'vitest';

import { DivDeposit } from '../../store/div-deposits/div-deposit.interface';
import { selectCurrentAccountSignal } from '../../store/current-account/select-current-account.signal';
import { currentAccountSignalStore } from '../../store/current-account/current-account.signal-store';
import { DividendDepositsComponentService } from './dividend-deposits-component.service';

// Mock SmartNgRX dependencies to prevent store initialization
vi.mock('../../store/current-account/select-current-account.signal', () => ({
  selectCurrentAccountSignal: vi.fn(),
}));

vi.mock('../../shared/build-universe-map.function', () => ({
  buildUniverseMap: vi.fn().mockReturnValue(
    new Map([
      ['universe-1', { symbol: 'AAPL' }],
      ['universe-2', { symbol: 'MSFT' }],
      ['universe-3', { symbol: 'GOOG' }],
    ])
  ),
}));

vi.mock(
  '../../store/div-deposit-types/selectors/select-div-deposit-types.function',
  () => ({
    selectDivDepositTypes: vi.fn().mockReturnValue([
      { id: 'type-1', name: 'Regular' },
      { id: 'type-2', name: 'Special' },
    ]),
  })
);

vi.mock('../../store/current-account/current-account.signal-store', () => ({
  currentAccountSignalStore: {
    selectCurrentAccountId: signal(''),
  },
}));

// Mock selectDivDepositEntity to avoid SmartNgRX initialization
vi.mock('../../store/div-deposits/div-deposits.selectors', () => ({
  selectDivDepositEntity: vi.fn().mockReturnValue({}),
}));

// Mock selectTopEntities to avoid SmartNgRX initialization
vi.mock('../../store/top/selectors/select-top-entities.function', () => ({
  selectTopEntities: vi.fn().mockReturnValue([]),
}));

// Mock selectAccountsEntity to avoid SmartNgRX initialization
vi.mock(
  '../../store/accounts/selectors/select-accounts-entity.function',
  () => ({
    selectAccountsEntity: vi.fn().mockReturnValue([]),
  })
);

// Mock selectAccounts to avoid SmartNgRX initialization
vi.mock('../../store/accounts/selectors/select-accounts.function', () => ({
  selectAccounts: vi.fn().mockReturnValue([]),
}));

// Helper to create test DivDeposit data
function createDivDeposit(overrides: Partial<DivDeposit> = {}): DivDeposit {
  return {
    id: 'dep-1',
    date: new Date('2024-01-15'),
    amount: 100,
    accountId: 'acc-1',
    divDepositTypeId: 'type-1',
    universeId: 'universe-1',
    ...overrides,
  };
}

// Helper to create a mock SmartArray-like array with specified length
function createMockDivDepositsArray(count: number): DivDeposit[] {
  const items: DivDeposit[] = [];
  for (let i = 0; i < count; i++) {
    items.push(
      createDivDeposit({
        id: `dep-${i}`,
        amount: (i + 1) * 10,
        divDepositTypeId: i % 2 === 0 ? 'type-1' : 'type-2',
        universeId: `universe-${(i % 3) + 1}`,
      })
    );
  }
  return items;
}

// Story AX.3: TDD Tests for Dividend Deposits Virtual Data Access (Service)
// Re-enabled in AX.4
describe('DividendDepositsComponentService - Virtual Data Access (AX.3)', () => {
  let service: DividendDepositsComponentService;
  let mockCurrentAccount: ReturnType<typeof signal>;
  let mockDivDepositsArray: DivDeposit[];

  beforeEach(() => {
    // Create a mock array of 200 div deposits to test virtual data access
    mockDivDepositsArray = createMockDivDepositsArray(200);

    // Mock the currentAccount to return our test account with divDeposits
    mockCurrentAccount = signal({
      id: 'acc-1',
      name: 'Test Account',
      divDeposits: mockDivDepositsArray,
      openTrades: [],
      soldTrades: [],
      months: [],
    });

    // Set the selectCurrentAccountSignal mock to return our mock account
    const selectCurrentAccountSignalMock = vi.mocked(
      selectCurrentAccountSignal
    );
    selectCurrentAccountSignalMock.mockReturnValue(mockCurrentAccount);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: currentAccountSignalStore,
          useValue: { selectCurrentAccountId: signal('') },
        },
        DividendDepositsComponentService,
      ],
    });

    service = TestBed.inject(DividendDepositsComponentService);
  });

  // AC: Test dividends computed signal returns sparse array with correct length
  it('should return sparse array with length matching SmartArray total length', () => {
    const dividends = service.dividends();

    expect(dividends.length).toBe(200);
  });

  // AC: Test dividends computed returns sparse array with default visible range
  it('should return sparse array with items only in default visible range (0-50)', () => {
    const dividends = service.dividends();

    // Items within default visible range (0-50) should be fully transformed
    expect(dividends[0]).toBeDefined();
    expect(dividends[0].id).toBe('dep-0');
    expect(dividends[49]).toBeDefined();
    expect(dividends[49].id).toBe('dep-49');

    // Total length should match the full data array
    expect(dividends.length).toBe(200);
  });

  // AC: Test only items within visible range are transformed
  it('should only transform items within the visible range', () => {
    // Set visible range to 10-30
    service.visibleRange.set({ start: 10, end: 30 });

    const dividends = service.dividends();

    // Items within range should have full symbol and type resolution
    for (let i = 10; i < 30; i++) {
      expect(dividends[i]).toBeDefined();
      expect(dividends[i].id).toBe(`dep-${i}`);
      expect(dividends[i].symbol).toBeDefined();
      expect(dividends[i].type).toBeDefined();
    }
  });

  // AC: Test items outside range use placeholder length increments
  it('should not transform items outside the visible range', () => {
    // Set visible range to 10-30
    service.visibleRange.set({ start: 10, end: 30 });

    const dividends = service.dividends();

    // Items before visible range (0-9) should be sparse/undefined
    for (let i = 0; i < 10; i++) {
      expect(dividends[i]).toBeUndefined();
    }

    // Items after visible range (30-199) should be sparse/undefined
    for (let i = 30; i < 200; i++) {
      expect(dividends[i]).toBeUndefined();
    }
  });

  // AC: Test visible-window loop pattern is applied
  it('should apply visible-window loop: sparse before, mapped in range, padded after', () => {
    service.visibleRange.set({ start: 50, end: 100 });

    const dividends = service.dividends();

    // Sparse before range: indices 0-49 should be empty/undefined
    const beforeRange = dividends.slice(0, 50);
    const definedBefore = beforeRange.filter(function isDefined(item: unknown) {
      return item !== undefined;
    });
    expect(definedBefore.length).toBe(0);

    // Mapped in range: indices 50-99 should have full data
    for (let i = 50; i < 100; i++) {
      expect(dividends[i]).toBeDefined();
      expect(dividends[i].id).toBe(`dep-${i}`);
    }

    // Padded after: array length equals total count
    expect(dividends.length).toBe(200);

    // After range: indices 100-199 should be empty/undefined
    const afterRange = dividends.slice(100);
    const definedAfter = afterRange.filter(function isDefined(item: unknown) {
      return item !== undefined;
    });
    expect(definedAfter.length).toBe(0);
  });

  // AC: Test that universe symbols are resolved for visible items
  it('should resolve universe symbols for items within visible range', () => {
    service.visibleRange.set({ start: 0, end: 10 });

    const dividends = service.dividends();

    // First item has universeId: 'universe-1' → symbol: 'AAPL'
    expect(dividends[0].symbol).toBe('AAPL');
    // Second item has universeId: 'universe-2' → symbol: 'MSFT'
    expect(dividends[1].symbol).toBe('MSFT');
    // Third item has universeId: 'universe-3' → symbol: 'GOOG'
    expect(dividends[2].symbol).toBe('GOOG');
  });

  // AC: Test that deposit type names are resolved for visible items
  it('should resolve type names for items within visible range', () => {
    service.visibleRange.set({ start: 0, end: 10 });

    const dividends = service.dividends();

    // Even indices have type-1 → 'Regular', odd indices have type-2 → 'Special'
    expect(dividends[0].type).toBe('Regular');
    expect(dividends[1].type).toBe('Special');
  });

  // AC: Test edge case - range extends beyond data length
  it('should handle range that extends beyond data length gracefully', () => {
    service.visibleRange.set({ start: 190, end: 250 });

    const dividends = service.dividends();

    // Should still have correct total length
    expect(dividends.length).toBe(200);

    // Only items 190-199 should be defined (data ends at 200)
    for (let i = 190; i < 200; i++) {
      expect(dividends[i]).toBeDefined();
      expect(dividends[i].id).toBe(`dep-${i}`);
    }
  });

  // AC: Test edge case - empty data array
  it('should return empty array when no div deposits exist', () => {
    mockCurrentAccount.set({
      id: 'acc-1',
      name: 'Test Account',
      divDeposits: [],
      openTrades: [],
      soldTrades: [],
      months: [],
    });

    const dividends = service.dividends();

    expect(dividends.length).toBe(0);
  });

  // AC: Test that visibleRange signal exists on service
  it('should have a visibleRange writable signal', () => {
    expect(service.visibleRange).toBeDefined();
    expect(service.visibleRange()).toEqual({ start: 0, end: 50 });
  });

  // AC: Test that visibleRange updates propagate to dividends computed
  it('should recompute dividends when visibleRange changes', () => {
    // Initial range
    service.visibleRange.set({ start: 0, end: 10 });
    const firstResult = service.dividends();
    expect(firstResult[0]).toBeDefined();
    expect(firstResult[0].id).toBe('dep-0');

    // Change range
    service.visibleRange.set({ start: 50, end: 60 });
    const secondResult = service.dividends();
    expect(secondResult[50]).toBeDefined();
    expect(secondResult[50].id).toBe('dep-50');

    // Items from old range should no longer be defined
    expect(secondResult[0]).toBeUndefined();
  });

  // AX.14: Single item edge case
  it('should handle single div deposit array correctly', () => {
    mockCurrentAccount.set({
      id: 'acc-1',
      name: 'Test Account',
      divDeposits: [createDivDeposit({ id: 'single-dep', amount: 42 })],
      openTrades: [],
      soldTrades: [],
      months: [],
    });

    const dividends = service.dividends();

    expect(dividends.length).toBe(1);
    expect(dividends[0]).toBeDefined();
    expect(dividends[0].id).toBe('single-dep');
    expect(dividends[0].amount).toBe(42);
  });

  // AX.14: Scroll to beginning after scrolling to end
  it('should return correct data when scrolling back to beginning', () => {
    // Scroll to end
    service.visibleRange.set({ start: 190, end: 200 });
    const endResult = service.dividends();
    expect(endResult[190]).toBeDefined();
    expect(endResult[0]).toBeUndefined();

    // Scroll back to beginning
    service.visibleRange.set({ start: 0, end: 10 });
    const beginResult = service.dividends();
    expect(beginResult[0]).toBeDefined();
    expect(beginResult[0].id).toBe('dep-0');
    expect(beginResult[190]).toBeUndefined();
  });

  // AX.14: Scroll to exact end boundary
  it('should handle range exactly at end of array', () => {
    service.visibleRange.set({ start: 195, end: 200 });

    const dividends = service.dividends();

    expect(dividends.length).toBe(200);
    for (let i = 195; i < 200; i++) {
      expect(dividends[i]).toBeDefined();
      expect(dividends[i].id).toBe(`dep-${i}`);
    }
    expect(dividends[194]).toBeUndefined();
  });
});
