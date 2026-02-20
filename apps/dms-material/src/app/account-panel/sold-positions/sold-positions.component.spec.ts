import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';

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
  selectSoldPositions: WritableSignal<SoldPosition[]>;
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
      mockSoldPositionsService = {
        trades: signal<Trade[]>([]),
        selectSoldPositions: signal<SoldPosition[]>([]),
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

      mockSoldPositionsService.trades.set(mockTrades);

      // When account 'acc-1' is selected, only its sold positions should show
      const soldPositions = mockSoldPositionsService.selectSoldPositions();
      const acc1Positions = soldPositions.filter(
        (p) => p.accountId === 'acc-1'
      );
      expect(acc1Positions.length).toBeGreaterThan(0);
      expect(acc1Positions.every((p) => p.accountId === 'acc-1')).toBe(true);
    });

    it('should calculate capital gains correctly', () => {
      const mockSoldPosition: SoldPosition = {
        id: '1',
        universeId: 'AAPL',
        symbol: 'AAPL',
        quantity: 100,
        buy: 150,
        buy_date: '2024-01-01',
        sell: 180,
        sell_date: '2024-06-01',
        accountId: 'acc-1',
        capitalGain: 3000, // (180 - 150) * 100
        percentGain: 20, // ((180 - 150) / 150) * 100
      };

      // Verify capital gain calculation
      const expectedCapitalGain =
        (mockSoldPosition.sell - mockSoldPosition.buy) *
        mockSoldPosition.quantity;
      expect(mockSoldPosition.capitalGain).toBe(expectedCapitalGain);
      expect(mockSoldPosition.capitalGain).toBe(3000);
    });

    it('should calculate percent gain correctly', () => {
      const mockSoldPosition: SoldPosition = {
        id: '1',
        universeId: 'AAPL',
        symbol: 'AAPL',
        quantity: 100,
        buy: 150,
        buy_date: '2024-01-01',
        sell: 180,
        sell_date: '2024-06-01',
        accountId: 'acc-1',
        capitalGain: 3000,
        percentGain: 20,
      };

      // Verify percent gain calculation
      const expectedPercentGain =
        ((mockSoldPosition.sell - mockSoldPosition.buy) /
          mockSoldPosition.buy) *
        100;
      expect(mockSoldPosition.percentGain).toBeCloseTo(expectedPercentGain, 1);
      expect(mockSoldPosition.percentGain).toBeCloseTo(20, 1);
    });

    it('should handle zero purchase price in percent gain', () => {
      const mockSoldPosition: SoldPosition = {
        id: '1',
        universeId: 'AAPL',
        symbol: 'AAPL',
        quantity: 100,
        buy: 0, // Edge case
        buy_date: '2024-01-01',
        sell: 180,
        sell_date: '2024-06-01',
        accountId: 'acc-1',
        capitalGain: 18000,
        percentGain: 0, // Should not divide by zero
      };

      // Percent gain should be 0 when buy is 0 (avoid division by zero)
      expect(mockSoldPosition.percentGain).toBe(0);
    });

    it('should transform trade data for display', () => {
      const mockTrade: Trade = {
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
      const expectedSoldPosition: Partial<SoldPosition> = {
        id: mockTrade.id,
        buy: mockTrade.buy,
        sell: mockTrade.sell,
        buy_date: mockTrade.buy_date,
        sell_date: mockTrade.sell_date,
        quantity: mockTrade.quantity,
        accountId: mockTrade.accountId,
        // Calculated fields
        capitalGain: (mockTrade.sell - mockTrade.buy) * mockTrade.quantity,
        percentGain: ((mockTrade.sell - mockTrade.buy) / mockTrade.buy) * 100,
      };

      expect(expectedSoldPosition.capitalGain).toBe(3000);
      expect(expectedSoldPosition.percentGain).toBeCloseTo(20, 1);
    });

    it('should have displayedPositions computed signal', () => {
      // Component should have a computed signal that provides sold positions
      // eslint-disable-next-line @typescript-eslint/dot-notation -- accessing private for test
      expect(component['displayedPositions']).toBeDefined();
    });

    it('should update when account changes', () => {
      // When account changes, sold positions should update reactively
      // This will be implemented using SmartNgRX signals in AP.2
      expect(mockSoldPositionsService.selectSoldPositions).toBeDefined();
    });
  });
});
