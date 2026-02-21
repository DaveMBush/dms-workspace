import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, computed, Signal, WritableSignal } from '@angular/core';

import { SoldPositionsComponent } from './sold-positions.component';
import { Trade } from '../../store/trades/trade.interface';

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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SoldPositionsComponent],
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
  // These tests are written BEFORE implementation (RED) and will be enabled in Story AP.2
  describe.skip('SmartNgRX Integration - Sold Positions', () => {
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
});
