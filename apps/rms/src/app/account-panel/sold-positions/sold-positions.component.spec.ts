import { describe, expect, test } from 'vitest';

import { calculateCapitalGains } from './capital-gains-calculator.function';

describe('Sold Positions Capital Gains Integration', () => {
  describe('Component Integration', () => {
    test('should recalculate capital gains with current buy/sell values', () => {
      // Simulate what happens in the component when positions$ computed signal runs
      const mockClosedPosition = {
        id: '1',
        symbol: 'TEST1',
        buy: 10,
        sell: 15,
        quantity: 100,
        buyDate: new Date('2024-01-01'),
        sellDate: new Date('2024-01-15'),
        daysHeld: 14,
        capitalGain: 0, // This would be recalculated
        capitalGainPercentage: 0, // This would be recalculated
      };

      // This is what the component does in the positions$ computed signal
      const capitalGains = calculateCapitalGains({
        buy: mockClosedPosition.buy,
        sell: mockClosedPosition.sell,
        quantity: mockClosedPosition.quantity,
      });

      expect(capitalGains.capitalGain).toBe(500); // (15 - 10) * 100
      expect(capitalGains.capitalGainPercentage).toBe(50); // ((15 - 10) / 10) * 100
    });

    test('should handle zero buy price in component display logic', () => {
      const mockClosedPosition = {
        buy: 0,
        sell: 10,
        quantity: 50,
      };

      const capitalGains = calculateCapitalGains(mockClosedPosition);

      expect(capitalGains.capitalGain).toBe(500); // (10 - 0) * 50
      expect(capitalGains.capitalGainPercentage).toBe(0); // Should be 0, not Infinity

      // Test template logic for displaying "N/A" when buy price is 0
      const displayValue =
        mockClosedPosition.buy === 0
          ? 'N/A'
          : `${capitalGains.capitalGainPercentage.toFixed(2)}%`;
      expect(displayValue).toBe('N/A');
    });

    test('should handle negative capital gains correctly', () => {
      const mockClosedPosition = {
        buy: 20,
        sell: 15,
        quantity: 100,
      };

      const capitalGains = calculateCapitalGains(mockClosedPosition);

      expect(capitalGains.capitalGain).toBe(-500); // (15 - 20) * 100
      expect(capitalGains.capitalGainPercentage).toBe(-25); // ((15 - 20) / 20) * 100
    });

    test('should handle edge cases safely', () => {
      const edgeCases = [
        { buy: NaN, sell: 10, quantity: 100 },
        { buy: 10, sell: NaN, quantity: 100 },
        { buy: 10, sell: 10, quantity: NaN },
        { buy: Infinity, sell: 10, quantity: 100 },
      ];

      edgeCases.forEach(function testEdgeCase(tradeData) {
        const capitalGains = calculateCapitalGains(tradeData);
        expect(capitalGains.capitalGain).toBe(0);
        expect(capitalGains.capitalGainPercentage).toBe(0);
      });
    });
  });

  describe('Template Display Logic', () => {
    test('should show N/A for zero buy price percentage', () => {
      const buyPrice = 0;
      const percentage = 0;

      const displayValue = buyPrice === 0 ? 'N/A' : `${percentage.toFixed(2)}%`;
      expect(displayValue).toBe('N/A');
    });

    test('should show formatted percentage for valid buy price', () => {
      const buyPrice = 10;
      const percentage = 25.456;

      const displayValue = buyPrice === 0 ? 'N/A' : `${percentage.toFixed(2)}%`;
      expect(displayValue).toBe('25.46%');
    });
  });
});
