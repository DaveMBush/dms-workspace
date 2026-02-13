import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpenPositionsComponent } from './open-positions.component';
import { Trade } from '../../store/trades/trade.interface';

describe('OpenPositionsComponent', () => {
  let component: OpenPositionsComponent;
  let fixture: ComponentFixture<OpenPositionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OpenPositionsComponent],
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
  // Re-enabled in Story AO.2
  describe('SmartNgRX Integration - Open Positions', () => {
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

      // AO.2: Inject mockTrades into component
      component.trades$.set(mockTrades);
      // Set selected account to acc-1
      component.selectedAccountId.set('acc-1');
    });

    it('should have displayedPositions computed signal', () => {
      expect(component.displayedPositions).toBeDefined();
      expect(typeof component.displayedPositions).toBe('function');
    });

    it('should filter trades for open positions only (sell_date is null)', () => {
      // AO.2: After injecting mockTrades above, with acc-1 filter, should return 2 open positions
      const positions = component.displayedPositions();

      // Should only include trades with sell_date === null and accountId === 'acc-1' (ids: 1, 3)
      expect(positions.length).toBe(2);
      expect(
        positions.every(
          (t) => t.sell_date === null || t.sell_date === undefined
        )
      ).toBe(true);
      expect(positions.find((t) => t.id === '1')).toBeDefined();
      expect(positions.find((t) => t.id === '3')).toBeDefined();
      expect(positions.find((t) => t.id === '2')).toBeUndefined(); // sold
      expect(positions.find((t) => t.id === '4')).toBeUndefined(); // acc-2
    });

    it('should filter trades by selected account', () => {
      // AO.2: Component should have selectedAccountId signal set to 'acc-1'
      expect(component.selectedAccountId).toBeDefined();

      const positions = component.displayedPositions();

      // Should only show acc-1 open positions (ids: 1, 3)
      expect(positions.length).toBe(2);
      expect(positions.every((t) => t.accountId === 'acc-1')).toBe(true);
      expect(positions.find((t) => t.id === '1')).toBeDefined();
      expect(positions.find((t) => t.id === '3')).toBeDefined();
      expect(positions.find((t) => t.id === '4')).toBeUndefined(); // acc-2
    });

    it('should handle empty trades list gracefully', () => {
      // AO.2: Component should handle empty trades array
      component.trades$.set([]);

      const positions = component.displayedPositions();

      expect(Array.isArray(positions)).toBe(true);
      expect(positions.length).toBe(0);
    });

    it('should update displayedPositions when trades entity changes', () => {
      // AO.2: Initially should have 2 open positions for acc-1 (from mockTrades)
      const initialPositions = component.displayedPositions();
      expect(initialPositions.length).toBe(2);

      // AO.2: After adding a new open trade, should have 3 positions
      const newTrade: Trade = {
        id: '5',
        universeId: 'NVDA',
        accountId: 'acc-1',
        buy: 500,
        sell: 0,
        buy_date: '2024-02-10',
        sell_date: null,
        quantity: 10,
      } as Trade;

      // Add the new trade to the signal
      component.trades$.set([...mockTrades, newTrade]);

      const updatedPositions = component.displayedPositions();
      expect(updatedPositions.length).toBe(3);
      expect(updatedPositions.find((t) => t.id === '5')).toBeDefined();
    });

    it('should subscribe to trades from SmartNgRX on init', () => {
      // AO.2: Component should use selectTrades or similar selector
      expect(component.trades$).toBeDefined();
    });

    it('should filter by both account and open positions', () => {
      // AO.2: Set account filter to 'acc-2', should return only id 4
      component.selectedAccountId.set('acc-2');

      const positions = component.displayedPositions();

      // Should filter for open positions AND acc-2 (only id: 4)
      expect(positions.length).toBe(1);
      expect(
        positions.every(
          (t) => t.sell_date === null || t.sell_date === undefined
        )
      ).toBe(true);
      expect(positions.every((t) => t.accountId === 'acc-2')).toBe(true);
      expect(positions[0].id).toBe('4');
    });
  });

  describe.skip('Data Transformation for Display', () => {
    beforeEach(() => {
      // AO.2: Inject test data with currentPrice for unrealized gain calculation
      // Test data should include: buy=150, currentPrice=175, quantity=100
    });

    it('should calculate position value (quantity * price)', () => {
      const positions = component.displayedPositions();

      expect(positions.length).toBeGreaterThan(0);

      const position = positions[0];
      const expectedValue = position.quantity * position.buy;

      // AO.2: Component should add calculated 'value' or 'currentValue' field
      expect(position.value || position.currentValue).toBeCloseTo(
        expectedValue
      );
      expect(expectedValue).toBe(15000); // 100 * 150
    });

    it('should format dates for display', () => {
      const positions = component.displayedPositions();

      expect(positions.length).toBeGreaterThan(0);

      const position = positions[0];

      // buy_date should exist and be a valid date string
      expect(position.buy_date).toBeDefined();
      expect(typeof position.buy_date).toBe('string');
      expect(position.buy_date).toMatch(/^\d{4}-\d{2}-\d{2}/);
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

      expect(positions.length).toBeGreaterThan(0);

      const position = positions[0];

      // AO.2: Unrealized gain = (currentPrice - buyPrice) * quantity
      // Assuming test data: buy=150, currentPrice=175, quantity=100
      const expectedUnrealized = (175 - 150) * 100; // 2500

      // Component should calculate and store unrealized gain
      expect(position.unrealizedGain).toBeDefined();
      expect(position.unrealizedGain).toBeCloseTo(expectedUnrealized);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null or undefined trades signal', () => {
      // AO.2: Component should handle empty trades array
      component.trades$.set([]);
      component.selectedAccountId.set('acc-1');

      expect(() => {
        const positions = component.displayedPositions();
        expect(Array.isArray(positions)).toBe(true);
        expect(positions.length).toBe(0);
      }).not.toThrow();
    });

    it('should handle account switching', () => {
      // AO.2: Set initial trades with multiple accounts, filter to acc-1
      const mockTrades: Trade[] = [
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
      component.trades$.set(mockTrades);
      component.selectedAccountId.set('acc-1');

      const initialPositions = component.displayedPositions();
      expect(initialPositions.every((t) => t.accountId === 'acc-1')).toBe(true);

      // AO.2: Switch account to acc-2
      component.selectedAccountId.set('acc-2');

      const updatedPositions = component.displayedPositions();
      expect(Array.isArray(updatedPositions)).toBe(true);
      expect(updatedPositions.every((t) => t.accountId === 'acc-2')).toBe(true);
    });

    it('should handle trades with partial data', () => {
      // AO.2: Component should validate required fields exist
      const mockTrades: Trade[] = [
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
      ];
      component.trades$.set(mockTrades);
      component.selectedAccountId.set('acc-1');

      const positions = component.displayedPositions();

      // Should not throw when accessing trade properties
      expect(() => {
        positions.forEach((trade) => {
          const hasRequiredFields =
            trade.id !== undefined &&
            trade.universeId !== undefined &&
            trade.accountId !== undefined;

          expect(hasRequiredFields).toBe(true);
        });
      }).not.toThrow();
    });

    it('should maintain referential stability when data unchanged', () => {
      // AO.2: Inject stable test data into component
      const mockTrades: Trade[] = [
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
      ];
      component.trades$.set(mockTrades);
      component.selectedAccountId.set('acc-1');

      const positions1 = component.displayedPositions();
      const positions2 = component.displayedPositions();

      // Computed signals should maintain referential stability
      // when underlying data is unchanged
      expect(positions1).toBe(positions2); // Same object reference
    });
  });

  // Story AO.3: TDD Tests for Editable Cells (RED state)
  describe.skip('Editable Cells', () => {
    beforeEach(() => {
      // Mock tradesEffects with Jest functions
      component.tradesEffects = {
        update: jest.fn().mockResolvedValue(undefined),
      } as any;
    });

    it('should update quantity when edited', () => {
      const trade = {
        id: '1',
        universeId: 'AAPL',
        accountId: '1',
        quantity: 100,
        buy: 150,
        sell: 0,
        buy_date: '2024-01-01',
        sell_date: null,
      } as Trade;
      component.trades$.set([trade]);

      component.ngOnInit();
      component.updateQuantity('1', 200);

      expect(component.tradesEffects.update).toHaveBeenCalledWith({
        id: '1',
        quantity: 200,
      });
    });

    it('should update price when edited', () => {
      const trade = {
        id: '1',
        universeId: 'AAPL',
        accountId: '1',
        quantity: 100,
        buy: 150,
        sell: 0,
        buy_date: '2024-01-01',
        sell_date: null,
      } as Trade;
      component.trades$.set([trade]);

      component.ngOnInit();
      component.updatePrice('1', 175);

      expect(component.tradesEffects.update).toHaveBeenCalledWith({
        id: '1',
        price: 175,
      });
    });

    it('should update purchase_date when edited', () => {
      const trade = {
        id: '1',
        universeId: 'AAPL',
        accountId: '1',
        quantity: 100,
        buy: 150,
        sell: 0,
        buy_date: '2024-01-01',
        sell_date: null,
      } as Trade;
      component.trades$.set([trade]);

      component.ngOnInit();
      component.updatePurchaseDate('1', '2024-02-01');

      expect(component.tradesEffects.update).toHaveBeenCalledWith({
        id: '1',
        purchase_date: '2024-02-01',
      });
    });

    it('should validate quantity is positive', () => {
      component.updateQuantity('1', -50);

      expect(component.tradesEffects.update).not.toHaveBeenCalled();
      expect(component.errorMessage()).toBe('Quantity must be positive');
    });

    it('should validate price is positive', () => {
      component.updatePrice('1', -100);

      expect(component.tradesEffects.update).not.toHaveBeenCalled();
      expect(component.errorMessage()).toBe('Price must be positive');
    });

    it('should validate date format', () => {
      component.updatePurchaseDate('1', 'invalid-date');

      expect(component.tradesEffects.update).not.toHaveBeenCalled();
      expect(component.errorMessage()).toBe('Invalid date format');
    });

    it('should handle update errors gracefully', async () => {
      component.tradesEffects.update.mockRejectedValueOnce(
        new Error('Update failed')
      );

      await component.updateQuantity('1', 200);

      expect(component.errorMessage()).toContain('Update failed');
    });

    it('should show loading indicator during update', async () => {
      component.tradesEffects.update.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      component.updateQuantity('1', 200);

      expect(component.updating()).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(component.updating()).toBe(false);
    });
  });
});
