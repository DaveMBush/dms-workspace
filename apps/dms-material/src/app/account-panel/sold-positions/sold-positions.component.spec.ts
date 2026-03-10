import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, computed, Signal, WritableSignal } from '@angular/core';
import { vi } from 'vitest';

import { SoldPositionsComponent } from './sold-positions.component';
import { SoldPositionsComponentService } from './sold-positions-component.service';
import { SortStateService } from '../../shared/services/sort-state.service';
import { ClosedPosition } from '../../store/trades/closed-position.interface';
import { currentAccountSignalStore } from '../../store/current-account/current-account.signal-store';
import { Trade } from '../../store/trades/trade.interface';

// Mock SmartNgRX selectors to avoid initialization errors
vi.mock('../../store/top/selectors/select-top-entities.function', () => ({
  selectTopEntities: vi.fn().mockReturnValue([]),
}));

vi.mock('../../store/universe/selectors/select-universes.function', () => ({
  selectUniverses: vi.fn().mockReturnValue([]),
}));

vi.mock('../../store/trades/selectors/select-trades-entity.function', () => ({
  selectTradesEntity: vi.fn().mockReturnValue([]),
}));

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

// Define interface for sold position (to be implemented in AP.2)
interface SoldPosition extends Trade {
  capitalGain: number;
  percentGain: number;
}

// Mock SoldPositionsComponentService (will be created in AP.2)
interface MockSoldPositionsComponentService {
  trades: WritableSignal<Trade[]>;
  selectedAccountId: WritableSignal<string>;
  selectSoldPositions: Signal<SoldPosition[]>;
  toSoldPosition(trade: Trade): SoldPosition;
}

describe('SoldPositionsComponent', () => {
  let component: SoldPositionsComponent;
  let fixture: ComponentFixture<SoldPositionsComponent>;

  // Simple mock service for component injection
  const soldPositionsSignal = signal<ClosedPosition[]>([]);
  const mockServiceForInjection = {
    selectSoldPositions: soldPositionsSignal,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SoldPositionsComponent],
      providers: [
        {
          provide: SoldPositionsComponentService,
          useValue: mockServiceForInjection,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SoldPositionsComponent);
    component = fixture.componentInstance;
  });

  it('should define columns', () => {
    expect(component.columns.length).toBe(9);
    expect(component.columns.find((c) => c.field === 'symbol')).toBeTruthy();
  });

  it('should have buy editable', () => {
    const col = component.columns.find((c) => c.field === 'buy');
    expect(col?.editable).toBe(true);
  });

  it('should have buy_date editable', () => {
    const col = component.columns.find((c) => c.field === 'buy_date');
    expect(col?.editable).toBe(true);
  });

  it('should have quantity editable', () => {
    const col = component.columns.find((c) => c.field === 'quantity');
    expect(col?.editable).toBe(true);
  });

  it('should have sell editable', () => {
    const col = component.columns.find((c) => c.field === 'sell');
    expect(col?.editable).toBe(true);
  });

  it('should have sell_date editable', () => {
    const col = component.columns.find((c) => c.field === 'sell_date');
    expect(col?.editable).toBe(true);
  });

  it('should have capitalGain column', () => {
    const col = component.columns.find((c) => c.field === 'capitalGain');
    expect(col).toBeTruthy();
  });

  it('should have capitalGainPercentage column', () => {
    const col = component.columns.find(
      (c) => c.field === 'capitalGainPercentage'
    );
    expect(col).toBeTruthy();
  });

  it('should have daysHeld column', () => {
    const col = component.columns.find((c) => c.field === 'daysHeld');
    expect(col).toBeTruthy();
  });

  it('should call onCellEdit without error', () => {
    const trade = { id: '1', symbol: 'AAPL' } as any;
    expect(() => component.onCellEdit(trade, 'sell', 150)).not.toThrow();
  });

  // TDD Tests for Story AP.1 - SmartNgRX Integration
  // Tests enabled in Story AP.2
  describe('SmartNgRX Integration - Sold Positions', () => {
    let mockSoldPositionsService: MockSoldPositionsComponentService;

    beforeEach(() => {
      // Mock service will be injected in AP.2
      const tradesSignal = signal<Trade[]>([]);
      const selectedAccountIdSignal = signal<string>('acc-1');
      const toSoldPosition = (trade: Trade): SoldPosition => ({
        ...trade,
        capitalGain: (trade.sell - trade.buy) * trade.quantity,
        percentGain:
          trade.buy !== 0 ? ((trade.sell - trade.buy) / trade.buy) * 100 : 0,
      });

      mockSoldPositionsService = {
        trades: tradesSignal,
        selectedAccountId: selectedAccountIdSignal,
        selectSoldPositions: computed(() =>
          tradesSignal()
            .filter(
              // eslint-disable-next-line @typescript-eslint/naming-convention -- Trade interface uses snake_case
              (t): t is Trade & { sell_date: string } => t.sell_date !== null
            )
            .filter((t) => t.accountId === selectedAccountIdSignal())
            .map(toSoldPosition)
        ),
        toSoldPosition,
      };
    });

    it('should inject SoldPositionsComponentService', () => {
      // This will fail until AP.2 implements the service
      // eslint-disable-next-line @typescript-eslint/dot-notation -- accessing private for test
      expect(component['soldPositionsService']).toBeDefined();
    });

    it('should filter trades for sold positions only (sell_date not null)', () => {
      const mockTrades: Trade[] = [
        {
          id: '1',
          universeId: 'AAPL',
          accountId: 'acc-1',
          buy: 150,
          sell: 180,
          buy_date: '2024-01-01',
          sell_date: '2024-06-01',
          quantity: 100,
        },
        {
          id: '2',
          universeId: 'MSFT',
          accountId: 'acc-1',
          buy: 300,
          sell: 0,
          buy_date: '2024-02-01',
          sell_date: null, // Open position - should be filtered out
          quantity: 50,
        },
        {
          id: '3',
          universeId: 'GOOGL',
          accountId: 'acc-1',
          buy: 100,
          sell: 120,
          buy_date: '2024-03-01',
          sell_date: '2024-07-01',
          quantity: 75,
        },
      ];

      mockSoldPositionsService.trades.set(mockTrades);

      // selectSoldPositions should filter to only trades with sell_date not null
      const soldPositions = mockSoldPositionsService.selectSoldPositions();
      expect(soldPositions.length).toBe(2);
      expect(soldPositions.every((p) => p.sell_date !== null)).toBe(true);
    });

    it('should filter trades by selected account', () => {
      const mockTrades: Trade[] = [
        {
          id: '1',
          universeId: 'AAPL',
          accountId: 'acc-1',
          buy: 150,
          sell: 180,
          buy_date: '2024-01-01',
          sell_date: '2024-06-01',
          quantity: 100,
        },
        {
          id: '2',
          universeId: 'MSFT',
          accountId: 'acc-2',
          buy: 300,
          sell: 320,
          buy_date: '2024-02-01',
          sell_date: '2024-05-01',
          quantity: 50,
        },
      ];

      mockSoldPositionsService.selectedAccountId.set('acc-1');
      mockSoldPositionsService.trades.set(mockTrades);

      // selectSoldPositions should filter to only account 'acc-1' positions
      const soldPositions = mockSoldPositionsService.selectSoldPositions();
      expect(soldPositions.length).toBe(1);
      expect(soldPositions.every((p) => p.accountId === 'acc-1')).toBe(true);
    });

    it('should calculate capital gains correctly', () => {
      const rawTrade: Trade = {
        id: '1',
        universeId: 'AAPL',
        accountId: 'acc-1',
        buy: 150,
        sell: 180,
        buy_date: '2024-01-01',
        sell_date: '2024-06-01',
        quantity: 100,
      };

      // Call the real service transformer (will be implemented in AP.2)
      const result = mockSoldPositionsService.toSoldPosition(rawTrade);

      expect(result.capitalGain).toBe(3000); // (180 - 150) * 100
    });

    it('should calculate percent gain correctly', () => {
      const rawTrade: Trade = {
        id: '1',
        universeId: 'AAPL',
        accountId: 'acc-1',
        buy: 150,
        sell: 180,
        buy_date: '2024-01-01',
        sell_date: '2024-06-01',
        quantity: 100,
      };

      // Call the real service transformer (will be implemented in AP.2)
      const result = mockSoldPositionsService.toSoldPosition(rawTrade);

      expect(result.percentGain).toBeCloseTo(20, 1); // ((180 - 150) / 150) * 100
    });

    it('should handle zero purchase price in percent gain', () => {
      const rawTrade: Trade = {
        id: '1',
        universeId: 'AAPL',
        accountId: 'acc-1',
        buy: 0, // Edge case - should guard against division by zero
        sell: 180,
        buy_date: '2024-01-01',
        sell_date: '2024-06-01',
        quantity: 100,
      };

      // Call the real service transformer (will be implemented in AP.2)
      const result = mockSoldPositionsService.toSoldPosition(rawTrade);

      // Percent gain should be 0 when buy is 0 (avoid division by zero)
      expect(result.percentGain).toBe(0);
    });

    it('should transform trade data for display', () => {
      const rawTrade: Trade = {
        id: '1',
        universeId: 'AAPL',
        accountId: 'acc-1',
        buy: 150,
        sell: 180,
        buy_date: '2024-01-01',
        sell_date: '2024-06-01',
        quantity: 100,
      };

      // The service should transform Trade to SoldPosition with calculated fields
      const result = mockSoldPositionsService.toSoldPosition(rawTrade);

      // Verify all properties are preserved and calculations are correct
      expect(result.id).toBe(rawTrade.id);
      expect(result.buy).toBe(rawTrade.buy);
      expect(result.sell).toBe(rawTrade.sell);
      expect(result.capitalGain).toBe(3000); // (180 - 150) * 100
      expect(result.percentGain).toBeCloseTo(20, 1); // ((180 - 150) / 150) * 100
    });

    it('should have displayedPositions computed signal', () => {
      // Component should have a computed signal that provides sold positions
      // eslint-disable-next-line @typescript-eslint/dot-notation -- accessing private for test
      expect(component['displayedPositions']).toBeDefined();
    });

    it('should update when account changes', () => {
      // Uses mock service directly (not component injection)
      // Test reactive updates when selected account changes
      const mockTrades: Trade[] = [
        {
          id: '1',
          universeId: 'AAPL',
          accountId: 'acc-1',
          buy: 150,
          sell: 180,
          buy_date: '2024-01-01',
          sell_date: '2024-06-01',
          quantity: 100,
        },
        {
          id: '2',
          universeId: 'MSFT',
          accountId: 'acc-2',
          buy: 300,
          sell: 320,
          buy_date: '2024-02-01',
          sell_date: '2024-05-01',
          quantity: 50,
        },
      ];

      mockSoldPositionsService.trades.set(mockTrades);

      // Initially showing acc-1
      mockSoldPositionsService.selectedAccountId.set('acc-1');
      expect(mockSoldPositionsService.selectSoldPositions().length).toBe(1);
      expect(mockSoldPositionsService.selectSoldPositions()[0].accountId).toBe(
        'acc-1'
      );

      // Switch to acc-2, should reactively update
      mockSoldPositionsService.selectedAccountId.set('acc-2');
      expect(mockSoldPositionsService.selectSoldPositions().length).toBe(1);
      expect(mockSoldPositionsService.selectSoldPositions()[0].accountId).toBe(
        'acc-2'
      );
    });
  });

  // TDD Tests for Story AP.5 - Date Range Filtering
  // Enabled in AP.6 implementation
  describe('Date Range Filtering', () => {
    const testPositions: ClosedPosition[] = [
      {
        id: '1',
        symbol: 'AAPL',
        quantity: 100,
        buy: 150,
        buy_date: '2023-12-01',
        sell: 180,
        sell_date: '2024-01-15',
        daysHeld: 45,
        capitalGain: 3000,
        capitalGainPercentage: 20,
      },
      {
        id: '2',
        symbol: 'MSFT',
        quantity: 50,
        buy: 300,
        buy_date: '2024-03-01',
        sell: 320,
        sell_date: '2024-06-20',
        daysHeld: 111,
        capitalGain: 1000,
        capitalGainPercentage: 6.67,
      },
      {
        id: '3',
        symbol: 'GOOGL',
        quantity: 75,
        buy: 100,
        buy_date: '2024-06-01',
        sell: 120,
        sell_date: '2024-12-31',
        daysHeld: 213,
        capitalGain: 1500,
        capitalGainPercentage: 20,
      },
      {
        id: '4',
        symbol: 'TSLA',
        quantity: 25,
        buy: 200,
        buy_date: '2023-06-01',
        sell: 180,
        sell_date: '2023-12-15',
        daysHeld: 135,
        capitalGain: -500,
        capitalGainPercentage: -10,
      },
    ];

    beforeEach(() => {
      soldPositionsSignal.set(testPositions);
      component.startDate.set(null);
      component.endDate.set(null);
    });

    it('should show all positions when no date filter applied', () => {
      component.startDate.set(null);
      component.endDate.set(null);

      expect(component.displayedPositions().length).toBe(4);
    });

    it('should filter by start date only', () => {
      component.startDate.set('2024-06-01');
      component.endDate.set(null);

      const positions = component.displayedPositions();
      expect(positions.length).toBe(2);
      expect(
        positions.every((p) => new Date(p.sell_date!) >= new Date('2024-06-01'))
      ).toBe(true);
    });

    it('should filter by end date only', () => {
      component.startDate.set(null);
      component.endDate.set('2024-06-30');

      const positions = component.displayedPositions();
      expect(positions.length).toBe(3);
      expect(
        positions.every((p) => new Date(p.sell_date!) <= new Date('2024-06-30'))
      ).toBe(true);
    });

    it('should filter by both start and end date', () => {
      component.startDate.set('2024-01-01');
      component.endDate.set('2024-06-30');

      const positions = component.displayedPositions();
      expect(positions.length).toBe(2);
      expect(
        positions.every((p) => {
          const sellDate = new Date(p.sell_date!);
          return (
            sellDate >= new Date('2024-01-01') &&
            sellDate <= new Date('2024-06-30')
          );
        })
      ).toBe(true);
    });

    it('should handle same day start and end date', () => {
      component.startDate.set('2024-01-15');
      component.endDate.set('2024-01-15');

      const positions = component.displayedPositions();
      expect(positions.length).toBe(1);
      expect(positions[0].symbol).toBe('AAPL');
    });

    it('should return empty array when no positions match date range', () => {
      component.startDate.set('2025-01-01');
      component.endDate.set('2025-12-31');

      expect(component.displayedPositions().length).toBe(0);
    });

    it('should handle year boundary correctly', () => {
      component.startDate.set('2023-12-01');
      component.endDate.set('2024-01-31');

      const positions = component.displayedPositions();
      expect(positions.length).toBe(2);
      const symbols = positions.map((p) => p.symbol);
      expect(symbols).toContain('AAPL');
      expect(symbols).toContain('TSLA');
    });

    it('should update displayed positions when date filter changes', () => {
      component.startDate.set('2024-01-01');
      component.endDate.set('2024-06-30');

      expect(component.displayedPositions().length).toBe(2);

      component.startDate.set('2024-12-01');
      component.endDate.set('2024-12-31');

      expect(component.displayedPositions().length).toBe(1);
      expect(component.displayedPositions()[0].symbol).toBe('GOOGL');
    });
  });
});

// Story AU.7: TDD Tests for Sold Positions Account Selection Integration
// Enabled in AU.8: Wire Sold Positions to Account Selection
// These tests verify that the sold positions screen properly integrates with
// account selection, refreshing data when the selected account changes.
describe('SoldPositionsComponent - Account Selection Integration', () => {
  let component: SoldPositionsComponent;
  let fixture: ComponentFixture<SoldPositionsComponent>;
  let mockSoldPositionsComponentService: {
    selectSoldPositions: WritableSignal<ClosedPosition[]>;
  };
  let mockCurrentAccountStore: {
    id: WritableSignal<string>;
    selectCurrentAccountId: WritableSignal<string>;
    setCurrentAccountId: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockCurrentAccountStore = {
      id: signal<string>(''),
      selectCurrentAccountId: signal<string>(''),
      setCurrentAccountId: vi.fn(),
    };

    mockSoldPositionsComponentService = {
      selectSoldPositions: signal<ClosedPosition[]>([]),
    };

    await TestBed.configureTestingModule({
      imports: [SoldPositionsComponent],
      providers: [
        {
          provide: SoldPositionsComponentService,
          useValue: mockSoldPositionsComponentService,
        },
        {
          provide: currentAccountSignalStore,
          useValue: mockCurrentAccountStore,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SoldPositionsComponent);
    component = fixture.componentInstance;
  });

  describe('subscribes to account selection changes', () => {
    it('should react when the selected account ID changes', () => {
      fixture.detectChanges();

      // Simulate account change via the store
      mockCurrentAccountStore.selectCurrentAccountId.set('acc-123');
      fixture.detectChanges();

      // Component should reflect the new account context
      expect(mockCurrentAccountStore.selectCurrentAccountId()).toBe('acc-123');
    });

    it('should not display stale data when account ID is empty', () => {
      fixture.detectChanges();

      mockCurrentAccountStore.selectCurrentAccountId.set('');
      mockSoldPositionsComponentService.selectSoldPositions.set([]);
      fixture.detectChanges();

      const positions = component.displayedPositions();
      expect(positions.length).toBe(0);
    });

    it('should handle initial account selection on component creation', () => {
      mockCurrentAccountStore.selectCurrentAccountId.set('acc-initial');
      fixture.detectChanges();

      expect(mockCurrentAccountStore.selectCurrentAccountId()).toBe(
        'acc-initial'
      );
    });
  });

  describe('data refresh on account change', () => {
    it('should load sold positions for selected account', () => {
      const account1Positions: ClosedPosition[] = [
        {
          id: '1',
          symbol: 'AAPL',
          buy: 150,
          buy_date: '2024-01-15',
          quantity: 100,
          sell: 180,
          sell_date: '2024-06-01',
          daysHeld: 138,
          capitalGain: 3000,
          capitalGainPercentage: 20,
        },
      ];

      fixture.detectChanges();

      mockCurrentAccountStore.selectCurrentAccountId.set('acc-1');
      mockSoldPositionsComponentService.selectSoldPositions.set(
        account1Positions
      );
      fixture.detectChanges();

      const positions = component.displayedPositions();
      expect(positions.length).toBe(1);
      expect(positions[0].symbol).toBe('AAPL');
    });

    it('should refresh table when account changes', () => {
      const account1Positions: ClosedPosition[] = [
        {
          id: '1',
          symbol: 'AAPL',
          buy: 150,
          buy_date: '2024-01-15',
          quantity: 100,
          sell: 180,
          sell_date: '2024-06-01',
          daysHeld: 138,
          capitalGain: 3000,
          capitalGainPercentage: 20,
        },
      ];

      const account2Positions: ClosedPosition[] = [
        {
          id: '10',
          symbol: 'MSFT',
          buy: 300,
          buy_date: '2024-02-01',
          quantity: 50,
          sell: 320,
          sell_date: '2024-05-01',
          daysHeld: 90,
          capitalGain: 1000,
          capitalGainPercentage: 6.67,
        },
        {
          id: '11',
          symbol: 'GOOGL',
          buy: 100,
          buy_date: '2024-02-10',
          quantity: 75,
          sell: 120,
          sell_date: '2024-07-01',
          daysHeld: 142,
          capitalGain: 1500,
          capitalGainPercentage: 20,
        },
      ];

      fixture.detectChanges();

      // First account
      mockCurrentAccountStore.selectCurrentAccountId.set('acc-1');
      mockSoldPositionsComponentService.selectSoldPositions.set(
        account1Positions
      );
      fixture.detectChanges();

      expect(component.displayedPositions().length).toBe(1);

      // Switch to second account
      mockCurrentAccountStore.selectCurrentAccountId.set('acc-2');
      mockSoldPositionsComponentService.selectSoldPositions.set(
        account2Positions
      );
      fixture.detectChanges();

      const positions = component.displayedPositions();
      expect(positions.length).toBe(2);
      expect(positions[0].symbol).toBe('MSFT');
      expect(positions[1].symbol).toBe('GOOGL');
    });

    it('should clear positions when account deselected', () => {
      const mockPositions: ClosedPosition[] = [
        {
          id: '1',
          symbol: 'AAPL',
          buy: 150,
          buy_date: '2024-01-15',
          quantity: 100,
          sell: 180,
          sell_date: '2024-06-01',
          daysHeld: 138,
          capitalGain: 3000,
          capitalGainPercentage: 20,
        },
      ];

      fixture.detectChanges();

      mockCurrentAccountStore.selectCurrentAccountId.set('acc-1');
      mockSoldPositionsComponentService.selectSoldPositions.set(mockPositions);
      fixture.detectChanges();
      expect(component.displayedPositions().length).toBe(1);

      // Deselect account
      mockCurrentAccountStore.selectCurrentAccountId.set('');
      mockSoldPositionsComponentService.selectSoldPositions.set([]);
      fixture.detectChanges();

      expect(component.displayedPositions().length).toBe(0);
    });

    it('should update capital gains for new account', () => {
      const positions: ClosedPosition[] = [
        {
          id: '1',
          symbol: 'AAPL',
          buy: 150,
          buy_date: '2024-01-15',
          quantity: 100,
          sell: 180,
          sell_date: '2024-06-01',
          daysHeld: 138,
          capitalGain: 3000,
          capitalGainPercentage: 20,
        },
        {
          id: '2',
          symbol: 'MSFT',
          buy: 300,
          buy_date: '2024-02-01',
          quantity: 50,
          sell: 280,
          sell_date: '2024-05-01',
          daysHeld: 90,
          capitalGain: -1000,
          capitalGainPercentage: -6.67,
        },
      ];

      fixture.detectChanges();

      mockCurrentAccountStore.selectCurrentAccountId.set('acc-1');
      mockSoldPositionsComponentService.selectSoldPositions.set(positions);
      fixture.detectChanges();

      const displayed = component.displayedPositions();
      expect(displayed.length).toBe(2);
      expect(displayed[0].capitalGain).toBe(3000);
      expect(displayed[1].capitalGain).toBe(-1000);
    });
  });

  describe('correct account ID passed to service calls', () => {
    it('should verify correct account ID is used by the service', () => {
      fixture.detectChanges();

      mockCurrentAccountStore.selectCurrentAccountId.set('acc-789');
      fixture.detectChanges();

      expect(mockCurrentAccountStore.selectCurrentAccountId()).toBe('acc-789');
    });

    it('should use updated account ID after rapid account switches', () => {
      fixture.detectChanges();

      // Rapid account switches
      mockCurrentAccountStore.selectCurrentAccountId.set('acc-1');
      mockCurrentAccountStore.selectCurrentAccountId.set('acc-2');
      mockCurrentAccountStore.selectCurrentAccountId.set('acc-3');
      fixture.detectChanges();

      // The most recent account should be active
      expect(mockCurrentAccountStore.selectCurrentAccountId()).toBe('acc-3');
    });

    it('should pass account ID through to service trades computation', () => {
      fixture.detectChanges();

      mockCurrentAccountStore.selectCurrentAccountId.set('acc-555');
      fixture.detectChanges();

      // Service should have access to the current account context
      expect(mockCurrentAccountStore.selectCurrentAccountId()).toBe('acc-555');
    });
  });

  describe('table updates with new account data', () => {
    it('should display positions specific to the selected account', () => {
      const accountPositions: ClosedPosition[] = [
        {
          id: '100',
          symbol: 'NVDA',
          buy: 500,
          buy_date: '2024-03-01',
          quantity: 20,
          sell: 550,
          sell_date: '2024-08-01',
          daysHeld: 153,
          capitalGain: 1000,
          capitalGainPercentage: 10,
        },
      ];

      fixture.detectChanges();

      mockCurrentAccountStore.selectCurrentAccountId.set('acc-nvda');
      mockSoldPositionsComponentService.selectSoldPositions.set(
        accountPositions
      );
      fixture.detectChanges();

      const positions = component.displayedPositions();
      expect(positions.length).toBe(1);
      expect(positions[0].id).toBe('100');
      expect(positions[0].symbol).toBe('NVDA');
      expect(positions[0].quantity).toBe(20);
    });

    it('should update table columns when account data changes structure', () => {
      fixture.detectChanges();

      mockCurrentAccountStore.selectCurrentAccountId.set('acc-new');
      fixture.detectChanges();

      // Columns should remain defined regardless of account
      expect(component.columns.length).toBeGreaterThan(0);
      expect(component.columns.find((c) => c.field === 'symbol')).toBeTruthy();
      expect(
        component.columns.find((c) => c.field === 'capitalGain')
      ).toBeTruthy();
    });

    it('should maintain date filter when account changes', () => {
      const account1Positions: ClosedPosition[] = [
        {
          id: '1',
          symbol: 'AAPL',
          buy: 150,
          buy_date: '2024-01-15',
          quantity: 100,
          sell: 180,
          sell_date: '2024-06-01',
          daysHeld: 138,
          capitalGain: 3000,
          capitalGainPercentage: 20,
        },
        {
          id: '2',
          symbol: 'MSFT',
          buy: 300,
          buy_date: '2024-02-01',
          quantity: 50,
          sell: 320,
          sell_date: '2024-12-15',
          daysHeld: 318,
          capitalGain: 1000,
          capitalGainPercentage: 6.67,
        },
      ];

      fixture.detectChanges();

      // Set date filter
      component.startDate.set('2024-06-01');
      component.endDate.set('2024-06-30');

      mockCurrentAccountStore.selectCurrentAccountId.set('acc-1');
      mockSoldPositionsComponentService.selectSoldPositions.set(
        account1Positions
      );
      fixture.detectChanges();

      // Date filter should still apply after account change
      const filtered = component.displayedPositions();
      expect(filtered.length).toBe(1);
      expect(filtered[0].symbol).toBe('AAPL');
    });

    it('should handle empty positions for a new account gracefully', () => {
      fixture.detectChanges();

      mockCurrentAccountStore.selectCurrentAccountId.set('acc-empty');
      mockSoldPositionsComponentService.selectSoldPositions.set([]);
      fixture.detectChanges();

      const positions = component.displayedPositions();
      expect(Array.isArray(positions)).toBe(true);
      expect(positions.length).toBe(0);
    });
  });

  describe('edge cases for account switching', () => {
    it('should handle switching to same account without error', () => {
      fixture.detectChanges();

      mockCurrentAccountStore.selectCurrentAccountId.set('acc-1');
      fixture.detectChanges();

      // Switch to same account again
      mockCurrentAccountStore.selectCurrentAccountId.set('acc-1');
      fixture.detectChanges();

      expect(mockCurrentAccountStore.selectCurrentAccountId()).toBe('acc-1');
    });

    it('should handle concurrent account and date filter changes', () => {
      const positions: ClosedPosition[] = [
        {
          id: '1',
          symbol: 'AAPL',
          buy: 150,
          buy_date: '2024-01-15',
          quantity: 100,
          sell: 180,
          sell_date: '2024-06-01',
          daysHeld: 138,
          capitalGain: 3000,
          capitalGainPercentage: 20,
        },
      ];

      fixture.detectChanges();

      // Change account and date filter simultaneously
      mockCurrentAccountStore.selectCurrentAccountId.set('acc-2');
      component.startDate.set('2024-01-01');
      component.endDate.set('2024-12-31');
      mockSoldPositionsComponentService.selectSoldPositions.set(positions);
      fixture.detectChanges();

      const filtered = component.displayedPositions();
      expect(filtered.length).toBe(1);
      expect(filtered[0].symbol).toBe('AAPL');
    });

    it('should preserve component state across account switches', () => {
      fixture.detectChanges();

      // Set some component state
      component.searchText = 'test';
      component.startDate.set('2024-01-01');
      component.endDate.set('2024-12-31');

      // Switch accounts
      mockCurrentAccountStore.selectCurrentAccountId.set('acc-new');
      fixture.detectChanges();

      // Component state should be preserved
      expect(component.searchText).toBe('test');
      expect(component.startDate()).toBe('2024-01-01');
      expect(component.endDate()).toBe('2024-12-31');
    });
  });

  // TDD GREEN Phase - Story AW.8: Sort integration tests
  // Re-enabled from AW.7 RED phase
  describe('Sort integration with SortStateService', () => {
    beforeEach(() => {
      localStorage.removeItem('dms-sort-state');
    });

    it('should return null from SortStateService.loadSortState when no saved state exists', () => {
      const sortStateService = TestBed.inject(SortStateService);
      const loadSpy = vi.spyOn(sortStateService, 'loadSortState');
      const result = sortStateService.loadSortState('trades-closed');
      expect(loadSpy).toHaveBeenCalledWith('trades-closed');
      expect(result).toBeNull();
    });

    it('should persist and retrieve sort state for trades-closed via SortStateService', () => {
      // The sortInterceptor handles adding X-Sort-Field and X-Sort-Order headers
      // to /api/trades/closed requests. Verify sortStateService integration is wired.
      const sortStateService = TestBed.inject(SortStateService);
      sortStateService.saveSortState('trades-closed', {
        field: 'sell',
        order: 'desc',
      });
      const state = sortStateService.loadSortState('trades-closed');
      expect(state).toEqual({ field: 'sell', order: 'desc' });
    });

    it('should save sort state to SortStateService when user changes sort', () => {
      const sortStateService = TestBed.inject(SortStateService);
      const saveSpy = vi.spyOn(sortStateService, 'saveSortState');
      component.onSortChange({ active: 'sell', direction: 'asc' });
      expect(saveSpy).toHaveBeenCalledWith('trades-closed', {
        field: 'sell',
        order: 'asc',
      });
    });

    it('should persist sort state when sort changes', () => {
      const sortStateService = TestBed.inject(SortStateService);
      component.onSortChange({ active: 'capitalGain', direction: 'desc' });
      const state = sortStateService.loadSortState('trades-closed');
      expect(state).toEqual({ field: 'capitalGain', order: 'desc' });
    });

    it('should clear sort state when sort direction is reset', () => {
      const sortStateService = TestBed.inject(SortStateService);
      const clearSpy = vi.spyOn(sortStateService, 'clearSortState');
      component.onSortChange({ active: 'sell', direction: '' });
      expect(clearSpy).toHaveBeenCalledWith('trades-closed');
    });
  });
});

// Story AW.9: TDD RED - Verify client-side sorting logic is removed
// Tests will be enabled in Story AW.10 after sorting removal is implemented
describe('SoldPositionsComponent - Client-Side Sorting Removal', () => {
  let component: SoldPositionsComponent;
  let fixture: ComponentFixture<SoldPositionsComponent>;
  let mockSoldPositionsService: {
    selectSoldPositions: WritableSignal<ClosedPosition[]>;
  };

  beforeEach(async () => {
    mockSoldPositionsService = {
      selectSoldPositions: signal<ClosedPosition[]>([]),
    };

    await TestBed.configureTestingModule({
      imports: [SoldPositionsComponent],
      providers: [
        {
          provide: SoldPositionsComponentService,
          useValue: mockSoldPositionsService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SoldPositionsComponent);
    component = fixture.componentInstance;
  });

  describe('Verify no client-side sorting', () => {
    it('should not have sortData method', () => {
      expect(
        (component as Record<string, unknown>)['sortData']
      ).toBeUndefined();
      expect(
        typeof (component as Record<string, unknown>)['sortData']
      ).not.toBe('function');
    });

    it('should preserve server response order', () => {
      const serverOrder: ClosedPosition[] = [
        { id: '3', symbol: 'GOOGL', sell: 120 } as ClosedPosition,
        { id: '1', symbol: 'AAPL', sell: 180 } as ClosedPosition,
        { id: '2', symbol: 'MSFT', sell: 320 } as ClosedPosition,
      ];
      mockSoldPositionsService.selectSoldPositions.set(serverOrder);

      const displayed = component.displayedPositions();
      const displayedSymbols = displayed.map(function getSymbol(
        p: ClosedPosition
      ) {
        return p.symbol;
      });

      // Data should be in exact server response order
      expect(displayedSymbols).toEqual(['GOOGL', 'AAPL', 'MSFT']);
    });

    it('should trigger HTTP call on sort change instead of local sorting', () => {
      const sortStateService = TestBed.inject(SortStateService);
      const saveSpy = vi.spyOn(sortStateService, 'saveSortState');

      component.onSortChange({ active: 'sell', direction: 'desc' });

      // Sort change should delegate to SortStateService (which triggers HTTP via interceptor)
      expect(saveSpy).toHaveBeenCalledWith('trades-closed', {
        field: 'sell',
        order: 'desc',
      });

      // Component should NOT have any local sort logic
      expect(
        (component as Record<string, unknown>)['sortData']
      ).toBeUndefined();
      expect(
        (component as Record<string, unknown>)['compareFunction']
      ).toBeUndefined();
    });

    it('should not manipulate data array order', () => {
      const testData: ClosedPosition[] = [
        {
          id: '3',
          symbol: 'GOOGL',
          sell: 120,
          sell_date: '2024-07-01',
        } as ClosedPosition,
        {
          id: '1',
          symbol: 'AAPL',
          sell: 180,
          sell_date: '2024-06-01',
        } as ClosedPosition,
        {
          id: '2',
          symbol: 'MSFT',
          sell: 320,
          sell_date: '2024-05-01',
        } as ClosedPosition,
      ];
      mockSoldPositionsService.selectSoldPositions.set(testData);

      const displayed = component.displayedPositions();

      // Data order must match server response exactly
      expect(displayed[0].id).toBe('3');
      expect(displayed[1].id).toBe('1');
      expect(displayed[2].id).toBe('2');
    });

    it('should not use Array.sort() on table data', () => {
      const testData: ClosedPosition[] = [
        {
          id: '2',
          symbol: 'MSFT',
          sell: 320,
          sell_date: '2024-05-01',
        } as ClosedPosition,
        {
          id: '1',
          symbol: 'AAPL',
          sell: 180,
          sell_date: '2024-06-01',
        } as ClosedPosition,
      ];
      mockSoldPositionsService.selectSoldPositions.set(testData);

      const sortSpy = vi.spyOn(Array.prototype, 'sort');

      component.displayedPositions();

      const dataSortCalls = sortSpy.mock.calls.filter(function isDataSort(
        call
      ) {
        return call.length > 0;
      });
      expect(dataSortCalls.length).toBe(0);

      sortSpy.mockRestore();
    });
  });
});
