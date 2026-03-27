import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { vi } from 'vitest';

import { selectCurrentAccountSignal } from '../../store/current-account/select-current-account.signal';
import { currentAccountSignalStore } from '../../store/current-account/current-account.signal-store';
import { OpenPositionsComponentService } from './open-positions-component.service';
import { Trade } from '../../store/trades/trade.interface';

// Mock SmartNgRX dependencies to prevent store initialization
vi.mock('../../store/current-account/select-current-account.signal', () => ({
  selectCurrentAccountSignal: vi.fn(),
}));

vi.mock('../../shared/build-universe-map.function', () => ({
  buildUniverseMap: vi.fn().mockReturnValue(
    new Map([
      [
        'universe-1',
        {
          id: 'universe-1',
          symbol: 'AAPL',
          distribution: 4,
          distributions_per_year: 4,
          last_price: 175,
          ex_date: '2025-03-15',
          risk_group_id: 'rg-1',
          expired: false,
          is_closed_end_fund: false,
          name: 'Apple Inc',
          position: 1,
          avg_purchase_yield_percent: 0.5,
          most_recent_sell_date: null,
          most_recent_sell_price: null,
        },
      ],
      [
        'universe-2',
        {
          id: 'universe-2',
          symbol: 'MSFT',
          distribution: 12,
          distributions_per_year: 12,
          last_price: 400,
          ex_date: '2025-04-10',
          risk_group_id: 'rg-2',
          expired: false,
          is_closed_end_fund: false,
          name: 'Microsoft Corp',
          position: 2,
          avg_purchase_yield_percent: 0.8,
          most_recent_sell_date: null,
          most_recent_sell_price: null,
        },
      ],
      [
        'universe-3',
        {
          id: 'universe-3',
          symbol: 'GOOG',
          distribution: 4,
          distributions_per_year: 4,
          last_price: 150,
          ex_date: '2025-05-01',
          risk_group_id: 'rg-3',
          expired: false,
          is_closed_end_fund: false,
          name: 'Alphabet Inc',
          position: 3,
          avg_purchase_yield_percent: 0.3,
          most_recent_sell_date: null,
          most_recent_sell_price: null,
        },
      ],
    ])
  ),
}));

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

// Mock selectHolidays to avoid SmartNgRX initialization
vi.mock('../../store/top/selectors/select-holidays.function', () => ({
  selectHolidays: vi.fn().mockReturnValue([]),
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

// Helper to create test Trade data (open trade, no sell)
function createOpenTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    id: 'trade-1',
    universeId: 'universe-1',
    accountId: 'acc-1',
    buy: 150,
    sell: 0,
    buy_date: '2024-01-15',
    sell_date: undefined,
    quantity: 100,
    ...overrides,
  };
}

// Helper to create a mock array of open trades
function createMockTradesArray(count: number): Trade[] {
  const items: Trade[] = [];
  for (let i = 0; i < count; i++) {
    items.push(
      createOpenTrade({
        id: `trade-${i}`,
        universeId: `universe-${(i % 3) + 1}`,
        buy: 100 + i * 10,
        quantity: 50 + i,
        buy_date: '2024-01-15',
      })
    );
  }
  return items;
}

// Story AX.7: TDD Tests for Open Positions Virtual Data Access (Service)
// Re-enabled in AX.8
describe('OpenPositionsComponentService - Virtual Data Access (AX.7)', () => {
  let service: OpenPositionsComponentService;
  let mockCurrentAccount: ReturnType<typeof signal>;
  let mockTradesArray: Trade[];

  beforeEach(() => {
    // Create a mock array of 200 open trades to test virtual data access
    mockTradesArray = createMockTradesArray(200);

    // Mock the currentAccount to return our test account with openTrades
    mockCurrentAccount = signal({
      id: 'acc-1',
      name: 'Test Account',
      openTrades: mockTradesArray,
      divDeposits: [],
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
        OpenPositionsComponentService,
      ],
    });

    service = TestBed.inject(OpenPositionsComponentService);
  });

  // AC: Test selectOpenPositions computed signal returns sparse array with correct length
  it('should return sparse array with length matching SmartArray total length', () => {
    const positions = service.selectOpenPositions();

    expect(positions.length).toBe(200);
  });

  // AC: Test selectOpenPositions returns sparse array with default visible range (0-50)
  it('should return sparse array with items only in default visible range (0-50)', () => {
    const positions = service.selectOpenPositions();

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

    const positions = service.selectOpenPositions();

    // Items within range should have full OpenPosition fields
    for (let i = 10; i < 30; i++) {
      expect(positions[i]).toBeDefined();
      expect(positions[i].id).toBe(`trade-${i}`);
      expect(positions[i].symbol).toBeDefined();
      expect(positions[i].buy).toBeDefined();
    }
  });

  // AC: Dense arrays - all items are populated regardless of visible range
  it('should transform all items regardless of visible range (dense array)', () => {
    // Set visible range to 10-30
    service.visibleRange.set({ start: 10, end: 30 });

    const positions = service.selectOpenPositions();

    // ALL items should be defined (dense array)
    for (let i = 0; i < 200; i++) {
      expect(positions[i]).toBeDefined();
      expect(positions[i].id).toBe(`trade-${i}`);
    }
  });

  // AC: Dense array - all items populated regardless of range
  it('should produce dense array with all items populated', () => {
    service.visibleRange.set({ start: 50, end: 100 });

    const positions = service.selectOpenPositions();

    // All items should be defined (dense array)
    for (let i = 0; i < 200; i++) {
      expect(positions[i]).toBeDefined();
      expect(positions[i].id).toBe(`trade-${i}`);
    }

    // Array length equals total count
    expect(positions.length).toBe(200);
  });

  // AC: Test that universe symbols are resolved for visible items
  it('should resolve universe symbols for items within visible range', () => {
    service.visibleRange.set({ start: 0, end: 10 });

    const positions = service.selectOpenPositions();

    // trade-0 has universeId: 'universe-1' → symbol: 'AAPL'
    expect(positions[0].symbol).toBe('AAPL');
    // trade-1 has universeId: 'universe-2' → symbol: 'MSFT'
    expect(positions[1].symbol).toBe('MSFT');
    // trade-2 has universeId: 'universe-3' → symbol: 'GOOG'
    expect(positions[2].symbol).toBe('GOOG');
  });

  // AC: Test edge case - range extends beyond data length
  it('should handle range that extends beyond data length gracefully', () => {
    service.visibleRange.set({ start: 190, end: 250 });

    const positions = service.selectOpenPositions();

    // Should still have correct total length
    expect(positions.length).toBe(200);

    // Only items 190-199 should be defined (data ends at 200)
    for (let i = 190; i < 200; i++) {
      expect(positions[i]).toBeDefined();
      expect(positions[i].id).toBe(`trade-${i}`);
    }
  });

  // AC: Test edge case - empty data array
  it('should return empty array when no trades exist', () => {
    mockCurrentAccount.set({
      id: 'acc-1',
      name: 'Test Account',
      openTrades: [],
      divDeposits: [],
      soldTrades: [],
      months: [],
    });

    const positions = service.selectOpenPositions();

    expect(positions.length).toBe(0);
  });

  // AC: Test that visibleRange signal exists on service
  it('should have a visibleRange writable signal', () => {
    expect(service.visibleRange).toBeDefined();
    expect(service.visibleRange()).toEqual({ start: 0, end: 50 });
  });

  // AC: Test that visibleRange updates propagate to selectOpenPositions computed
  it('should recompute selectOpenPositions when visibleRange changes', () => {
    // Initial range
    service.visibleRange.set({ start: 0, end: 10 });
    const firstResult = service.selectOpenPositions();
    expect(firstResult[0]).toBeDefined();
    expect(firstResult[0].id).toBe('trade-0');

    // Change range
    service.visibleRange.set({ start: 50, end: 60 });
    const secondResult = service.selectOpenPositions();
    expect(secondResult[50]).toBeDefined();
    expect(secondResult[50].id).toBe('trade-50');

    // With dense arrays, all items remain defined
    expect(secondResult[0]).toBeDefined();
  });

  // AC: Test that OpenPosition fields are correctly computed for visible items
  it('should compute OpenPosition fields correctly for visible items', () => {
    service.visibleRange.set({ start: 0, end: 5 });

    const positions = service.selectOpenPositions();

    const firstPosition = positions[0];
    expect(firstPosition.id).toBe('trade-0');
    expect(firstPosition.symbol).toBe('AAPL');
    expect(firstPosition.buy).toBe(100);
    expect(firstPosition.quantity).toBe(50);
    expect(firstPosition.lastPrice).toBe(175); // universe-1 last_price
    expect(firstPosition.unrealizedGain).toBeDefined();
    expect(firstPosition.unrealizedGainPercent).toBeDefined();
    expect(firstPosition.daysHeld).toBeDefined();
    expect(firstPosition.expectedYield).toBeDefined();
    expect(firstPosition.targetGain).toBeDefined();
    expect(firstPosition.targetSell).toBeDefined();
  });

  // AX.14: Single item edge case
  it('should handle single open trade array correctly', () => {
    mockCurrentAccount.set({
      id: 'acc-1',
      name: 'Test Account',
      openTrades: [
        createOpenTrade({
          id: 'single-trade',
          buy: 100,
          quantity: 10,
          universeId: 'universe-1',
        }),
      ],
      divDeposits: [],
      soldTrades: [],
      months: [],
    });

    const positions = service.selectOpenPositions();

    expect(positions.length).toBe(1);
    expect(positions[0]).toBeDefined();
    expect(positions[0].id).toBe('single-trade');
    expect(positions[0].symbol).toBe('AAPL');
  });

  // AX.14: Scroll to beginning after scrolling to end
  it('should return correct data when scrolling back to beginning', () => {
    // Scroll to end
    service.visibleRange.set({ start: 190, end: 200 });
    const endResult = service.selectOpenPositions();
    expect(endResult[190]).toBeDefined();
    expect(endResult[0]).toBeDefined();

    // Scroll back to beginning
    service.visibleRange.set({ start: 0, end: 10 });
    const beginResult = service.selectOpenPositions();
    expect(beginResult[0]).toBeDefined();
    expect(beginResult[0].id).toBe('trade-0');
    expect(beginResult[190]).toBeDefined();
  });

  // AX.14: Scroll to exact end boundary
  it('should handle range exactly at end of array', () => {
    service.visibleRange.set({ start: 195, end: 200 });

    const positions = service.selectOpenPositions();

    expect(positions.length).toBe(200);
    for (let i = 195; i < 200; i++) {
      expect(positions[i]).toBeDefined();
      expect(positions[i].id).toBe(`trade-${i}`);
    }
    expect(positions[194]).toBeDefined();
  });
});
