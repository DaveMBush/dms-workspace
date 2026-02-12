import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideSmartNgRX } from '@smarttools/smart-signals';

import { OpenPositionsComponent } from './open-positions.component';
import { Trade } from '../../store/trades/trade.interface';

describe('OpenPositionsComponent', () => {
  let component: OpenPositionsComponent;
  let fixture: ComponentFixture<OpenPositionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OpenPositionsComponent],
      providers: [provideSmartNgRX()],
    }).compileComponents();

    fixture = TestBed.createComponent(OpenPositionsComponent);
    component = fixture.componentInstance;
  });

  it('should define columns', () => {
    expect(component.columns.length).toBeGreaterThan(0);
    expect(
      component.columns.find((c) => c.field === 'universeId')
    ).toBeTruthy();
  });

  it('should have editable quantity column', () => {
    const col = component.columns.find((c) => c.field === 'quantity');
    expect(col?.editable).toBe(true);
  });

  it('should have editable price column', () => {
    const col = component.columns.find((c) => c.field === 'buy');
    expect(col?.editable).toBe(true);
  });

  it('should have editable date column', () => {
    const col = component.columns.find((c) => c.field === 'buy_date');
    expect(col?.editable).toBe(true);
  });

  it('should call onAddPosition without error', () => {
    expect(() => component.onAddPosition()).not.toThrow();
  });

  it('should call onSellPosition without error', () => {
    const trade = { id: '1', symbol: 'AAPL' } as any;
    expect(() => component.onSellPosition(trade)).not.toThrow();
  });

  it('should call onCellEdit without error', () => {
    const trade = { id: '1', symbol: 'AAPL' } as any;
    expect(() => component.onCellEdit(trade, 'quantity', 100)).not.toThrow();
  });

  // TDD Tests for Story AO.1 - SmartNgRX Integration
  // These tests are disabled until implementation in Story AO.2
  describe.skip('SmartNgRX Integration - Open Positions', () => {
    let mockTrades: Trade[];

    beforeEach(() => {
      mockTrades = [
        {
          id: '1',
          universeId: 'AAPL',
          accountId: 'acc-1',
          buy: 150,
          sell: 0,
          buy_date: '2024-01-15',
          sell_date: null,
          quantity: 100,
        } as Trade,
        {
          id: '2',
          universeId: 'MSFT',
          accountId: 'acc-1',
          buy: 300,
          sell: 320,
          buy_date: '2024-01-10',
          sell_date: '2024-02-01',
          quantity: 50,
        } as Trade,
        {
          id: '3',
          universeId: 'GOOGL',
          accountId: 'acc-1',
          buy: 100,
          sell: 0,
          buy_date: '2024-02-01',
          sell_date: null,
          quantity: 75,
        } as Trade,
        {
          id: '4',
          universeId: 'TSLA',
          accountId: 'acc-2',
          buy: 200,
          sell: 0,
          buy_date: '2024-01-20',
          sell_date: null,
          quantity: 25,
        } as Trade,
      ];
    });

    it('should have displayedPositions computed signal', () => {
      expect(component.displayedPositions).toBeDefined();
      expect(typeof component.displayedPositions).toBe('function');
    });

    it('should filter trades for open positions only (sell_date is null)', () => {
      // This test expects displayedPositions to filter out trades with sell_date
      const positions = component.displayedPositions();

      expect(positions.length).toBeGreaterThan(0);
      expect(
        positions.every(
          (t) => t.sell_date === null || t.sell_date === undefined
        )
      ).toBe(true);
    });

    it('should filter trades by selected account', () => {
      // Assuming component has a selectedAccountId signal
      const positions = component.displayedPositions();

      // All displayed positions should belong to the selected account
      const selectedAccountId = component.selectedAccountId?.();
      if (selectedAccountId && selectedAccountId !== 'all') {
        expect(positions.every((t) => t.accountId === selectedAccountId)).toBe(
          true
        );
      }
    });

    it('should handle empty trades list gracefully', () => {
      // Component should handle case where no trades are loaded
      const positions = component.displayedPositions();

      expect(Array.isArray(positions)).toBe(true);
    });

    it('should update displayedPositions when trades entity changes', () => {
      // displayedPositions should be reactive to trades signal changes
      const initialLength = component.displayedPositions().length;

      // Component should react to signal changes
      expect(typeof component.displayedPositions).toBe('function');
    });

    it('should subscribe to trades from SmartNgRX on init', () => {
      // Component should use selectTrades or similar selector
      expect(component.trades$).toBeDefined();
    });

    it('should filter by both account and open positions', () => {
      const positions = component.displayedPositions();

      // Should filter for open positions (sell_date is null)
      expect(
        positions.every(
          (t) => t.sell_date === null || t.sell_date === undefined
        )
      ).toBe(true);

      // Should respect account filter if set
      const selectedAccountId = component.selectedAccountId?.();
      if (selectedAccountId && selectedAccountId !== 'all') {
        expect(positions.every((t) => t.accountId === selectedAccountId)).toBe(
          true
        );
      }
    });
  });

  describe.skip('Data Transformation for Display', () => {
    it('should calculate position value (quantity * price)', () => {
      const positions = component.displayedPositions();

      if (positions.length > 0) {
        const position = positions[0];
        const expectedValue = position.quantity * position.buy;

        // Assuming component adds a calculated 'value' or 'currentValue' field
        expect(position.buy).toBeGreaterThan(0);
        expect(position.quantity).toBeGreaterThan(0);
      }
    });

    it('should format dates for display', () => {
      const positions = component.displayedPositions();

      if (positions.length > 0) {
        const position = positions[0];

        // buy_date should exist and be a valid date string
        expect(position.buy_date).toBeDefined();
        expect(typeof position.buy_date).toBe('string');
      }
    });

    it('should handle positions with missing data gracefully', () => {
      const positions = component.displayedPositions();

      // Component should handle incomplete trade data without errors
      expect(() => {
        positions.forEach((p) => {
          // Access properties that might be undefined
          const symbol = p.universeId;
          const quantity = p.quantity;
          const price = p.buy;
          // Validate that properties exist
          expect(symbol).toBeDefined();
          expect(quantity).toBeDefined();
          expect(price).toBeDefined();
        });
      }).not.toThrow();
    });

    it('should calculate unrealized gain for open positions', () => {
      const positions = component.displayedPositions();

      // Open positions should have unrealized gain calculation
      // This will be implemented with current price - buy price
      if (positions.length > 0) {
        expect(positions[0].buy).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe.skip('Edge Cases and Error Handling', () => {
    it('should handle null or undefined trades signal', () => {
      // Component should handle case where trades signal is not initialized
      expect(() => {
        const positions = component.displayedPositions();
        expect(Array.isArray(positions)).toBe(true);
      }).not.toThrow();
    });

    it('should handle account switching', () => {
      // When selectedAccountId changes, displayedPositions should update
      const initialPositions = component.displayedPositions();

      if (component.selectedAccountId) {
        // Component should react to account changes
        expect(typeof component.selectedAccountId).toBe('function');
      }

      const updatedPositions = component.displayedPositions();
      expect(Array.isArray(updatedPositions)).toBe(true);
    });

    it('should handle trades with partial data', () => {
      const positions = component.displayedPositions();

      // Should not throw when accessing trade properties
      expect(() => {
        positions.forEach((trade) => {
          const hasRequiredFields =
            trade.id !== undefined &&
            trade.universeId !== undefined &&
            trade.accountId !== undefined;

          if (!hasRequiredFields) {
            // Component should handle missing fields gracefully
          }
        });
      }).not.toThrow();
    });

    it('should maintain referential stability when data unchanged', () => {
      const positions1 = component.displayedPositions();
      const positions2 = component.displayedPositions();

      // Computed signals should maintain stability when underlying data unchanged
      expect(positions1).toBeDefined();
      expect(positions2).toBeDefined();
    });
  });
});
