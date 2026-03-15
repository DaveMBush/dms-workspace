import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { vi } from 'vitest';

import { selectCurrentAccountSignal } from '../../store/current-account/select-current-account.signal';
import { currentAccountSignalStore } from '../../store/current-account/current-account.signal-store';
import { Trade } from '../../store/trades/trade.interface';
import { SoldPositionsComponentService } from './sold-positions-component.service';

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

vi.mock('../../store/current-account/current-account.signal-store', () => ({
  currentAccountSignalStore: {
    selectCurrentAccountId: signal(''),
  },
}));

// Mock SmartNgRX selectors to avoid initialization errors
vi.mock('../../store/top/selectors/select-top-entities.function', () => ({
  selectTopEntities: vi.fn().mockReturnValue([]),
}));

vi.mock('../../store/universe/selectors/select-universes.function', () => ({
  selectUniverses: vi.fn().mockReturnValue([]),
}));

vi.mock(
  '../../store/trades/selectors/select-open-trade-entity.function',
  () => ({
    selectOpenTradeEntity: vi.fn().mockReturnValue([]),
  })
);

vi.mock(
  '../../store/trades/selectors/select-sold-trade-entity.function',
  () => ({
    selectSoldTradeEntity: vi.fn().mockReturnValue([]),
  })
);

vi.mock(
  '../../store/accounts/selectors/select-accounts-entity.function',
  () => ({
    selectAccountsEntity: vi.fn().mockReturnValue([]),
  })
);

vi.mock('../../store/accounts/selectors/select-accounts.function', () => ({
  selectAccounts: vi.fn().mockReturnValue([]),
}));

vi.mock('../../store/div-deposits/div-deposits.selectors', () => ({
  selectDivDepositEntity: vi.fn().mockReturnValue([]),
}));

vi.mock('../../store/trades/difference-in-trading-days.function', () => ({
  differenceInTradingDays: vi.fn().mockReturnValue(100),
}));

// Helper to create a valid sold trade
function createSoldTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    id: 'trade-1',
    universeId: 'universe-1',
    accountId: 'acc-1',
    buy: 100,
    sell: 150,
    buy_date: '2024-01-15',
    sell_date: '2024-06-15',
    quantity: 10,
    ...overrides,
  };
}

// Helper to create a mock SmartArray-like array of sold trades
function createMockSoldTradesArray(count: number): Trade[] {
  const items: Trade[] = [];
  for (let i = 0; i < count; i++) {
    items.push(
      createSoldTrade({
        id: `trade-${i}`,
        buy: (i + 1) * 10,
        sell: (i + 1) * 15,
        quantity: (i + 1) * 5,
        universeId: `universe-${(i % 3) + 1}`,
        buy_date: '2024-01-15',
        sell_date: '2024-06-15',
      })
    );
  }
  return items;
}

// Story AX.11: TDD Tests for Sold Positions Virtual Data Access (Service)
// Disabled in AX.11 (RED phase): Re-enable in AX.12
describe('SoldPositionsComponentService - Virtual Data Access (AX.11)', () => {
  let service: SoldPositionsComponentService;
  let mockCurrentAccount: ReturnType<typeof signal>;
  let mockSoldTradesArray: Trade[];

  beforeEach(() => {
    // Create a mock array of 200 sold trades to test virtual data access
    mockSoldTradesArray = createMockSoldTradesArray(200);

    // Mock the currentAccount to return our test account with soldTrades
    mockCurrentAccount = signal({
      id: 'acc-1',
      name: 'Test Account',
      soldTrades: mockSoldTradesArray,
      openTrades: [],
      divDeposits: [],
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
        SoldPositionsComponentService,
      ],
    });

    service = TestBed.inject(SoldPositionsComponentService);
  });

  // AC: Test selectSoldPositions returns sparse array with correct length
  it('should return sparse array with length matching SmartArray total length', () => {
    const positions = service.selectSoldPositions();

    expect(positions.length).toBe(200);
  });

  // AC: Test selectSoldPositions returns sparse array with default visible range
  it('should return sparse array with items only in default visible range (0-50)', () => {
    const positions = service.selectSoldPositions();

    // Items within default visible range (0-50) should be fully transformed
    expect(positions[0]).toBeDefined();
    expect(positions[0].id).toBe('trade-0');
    expect(positions[49]).toBeDefined();
    expect(positions[49].id).toBe('trade-49');

    // Total length should match the full data array
    expect(positions.length).toBe(200);
  });

  // AC: Test only items within visible range are transformed
  it('should only transform items within the visible range', () => {
    // Set visible range to 10-30
    service.visibleRange.set({ start: 10, end: 30 });

    const positions = service.selectSoldPositions();

    // Items within range should have full symbol resolution
    for (let i = 10; i < 30; i++) {
      expect(positions[i]).toBeDefined();
      expect(positions[i].id).toBe(`trade-${i}`);
      expect(positions[i].symbol).toBeDefined();
    }
  });

  // AC: Test items outside range are undefined (sparse)
  it('should not transform items outside the visible range', () => {
    // Set visible range to 10-30
    service.visibleRange.set({ start: 10, end: 30 });

    const positions = service.selectSoldPositions();

    // Items before visible range (0-9) should be sparse/undefined
    for (let i = 0; i < 10; i++) {
      expect(positions[i]).toBeUndefined();
    }

    // Items after visible range (30-199) should be sparse/undefined
    for (let i = 30; i < 200; i++) {
      expect(positions[i]).toBeUndefined();
    }
  });

  // AC: Test visible-window loop pattern is applied
  it('should apply visible-window loop: sparse before, mapped in range, padded after', () => {
    service.visibleRange.set({ start: 50, end: 100 });

    const positions = service.selectSoldPositions();

    // Sparse before range: indices 0-49 should be empty/undefined
    const beforeRange = positions.slice(0, 50);
    const definedBefore = beforeRange.filter(function isDefined(item: unknown) {
      return item !== undefined;
    });
    expect(definedBefore.length).toBe(0);

    // Mapped in range: indices 50-99 should have full data
    for (let i = 50; i < 100; i++) {
      expect(positions[i]).toBeDefined();
      expect(positions[i].id).toBe(`trade-${i}`);
    }

    // Padded after: array length equals total count
    expect(positions.length).toBe(200);

    // After range: indices 100-199 should be empty/undefined
    const afterRange = positions.slice(100);
    const definedAfter = afterRange.filter(function isDefined(item: unknown) {
      return item !== undefined;
    });
    expect(definedAfter.length).toBe(0);
  });

  // AC: Test that universe symbols are resolved for visible items
  it('should resolve universe symbols for items within visible range', () => {
    service.visibleRange.set({ start: 0, end: 10 });

    const positions = service.selectSoldPositions();

    // First item has universeId: 'universe-1' → symbol: 'AAPL'
    expect(positions[0].symbol).toBe('AAPL');
    // Second item has universeId: 'universe-2' → symbol: 'MSFT'
    expect(positions[1].symbol).toBe('MSFT');
    // Third item has universeId: 'universe-3' → symbol: 'GOOG'
    expect(positions[2].symbol).toBe('GOOG');
  });

  // AC: Test edge case - range extends beyond data length
  it('should handle range that extends beyond data length gracefully', () => {
    service.visibleRange.set({ start: 190, end: 250 });

    const positions = service.selectSoldPositions();

    // Should still have correct total length
    expect(positions.length).toBe(200);

    // Only items 190-199 should be defined (data ends at 200)
    for (let i = 190; i < 200; i++) {
      expect(positions[i]).toBeDefined();
      expect(positions[i].id).toBe(`trade-${i}`);
    }
  });

  // AC: Test edge case - empty data array
  it('should return empty array when no sold trades exist', () => {
    mockCurrentAccount.set({
      id: 'acc-1',
      name: 'Test Account',
      soldTrades: [],
      openTrades: [],
      divDeposits: [],
      months: [],
    });

    const positions = service.selectSoldPositions();

    expect(positions.length).toBe(0);
  });

  // AC: Test that visibleRange signal exists on service
  it('should have a visibleRange writable signal', () => {
    expect(service.visibleRange).toBeDefined();
    expect(service.visibleRange()).toEqual({ start: 0, end: 50 });
  });

  // AC: Test that visibleRange updates propagate to selectSoldPositions computed
  it('should recompute selectSoldPositions when visibleRange changes', () => {
    // Initial range
    service.visibleRange.set({ start: 0, end: 10 });
    const firstResult = service.selectSoldPositions();
    expect(firstResult[0]).toBeDefined();
    expect(firstResult[0].id).toBe('trade-0');

    // Change range
    service.visibleRange.set({ start: 50, end: 60 });
    const secondResult = service.selectSoldPositions();
    expect(secondResult[50]).toBeDefined();
    expect(secondResult[50].id).toBe('trade-50');

    // Items from old range should no longer be defined
    expect(secondResult[0]).toBeUndefined();
  });

  // AX.14: Single item edge case
  it('should handle single sold trade array correctly', () => {
    mockCurrentAccount.set({
      id: 'acc-1',
      name: 'Test Account',
      soldTrades: [
        createSoldTrade({
          id: 'single-sold',
          buy: 100,
          sell: 150,
          quantity: 10,
          universeId: 'universe-1',
        }),
      ],
      openTrades: [],
      divDeposits: [],
      months: [],
    });

    const positions = service.selectSoldPositions();

    expect(positions.length).toBe(1);
    expect(positions[0]).toBeDefined();
    expect(positions[0].id).toBe('single-sold');
    expect(positions[0].symbol).toBe('AAPL');
  });

  // AX.14: Scroll to beginning after scrolling to end
  it('should return correct data when scrolling back to beginning', () => {
    // Scroll to end
    service.visibleRange.set({ start: 190, end: 200 });
    const endResult = service.selectSoldPositions();
    expect(endResult[190]).toBeDefined();
    expect(endResult[0]).toBeUndefined();

    // Scroll back to beginning
    service.visibleRange.set({ start: 0, end: 10 });
    const beginResult = service.selectSoldPositions();
    expect(beginResult[0]).toBeDefined();
    expect(beginResult[0].id).toBe('trade-0');
    expect(beginResult[190]).toBeUndefined();
  });

  // AX.14: Scroll to exact end boundary
  it('should handle range exactly at end of array', () => {
    service.visibleRange.set({ start: 195, end: 200 });

    const positions = service.selectSoldPositions();

    expect(positions.length).toBe(200);
    for (let i = 195; i < 200; i++) {
      expect(positions[i]).toBeDefined();
      expect(positions[i].id).toBe(`trade-${i}`);
    }
    expect(positions[194]).toBeUndefined();
  });
});
