import { describe, expect, test } from 'vitest';

import { calculateCapitalGains } from './capital-gains-calculator.function';
import { formatCapitalGainsDollar } from './format-capital-gains-dollar.function';
import { formatCapitalGainsPercentage } from './format-capital-gains-percentage.function';
import type { TradeData } from './trade-data.interface';

describe('Capital Gains Calculator', () => {
  describe('calculateCapitalGains', () => {
    test('should calculate positive capital gains correctly', () => {
      const trade: TradeData = { buy: 10, sell: 15, quantity: 100 };
      const result = calculateCapitalGains(trade);

      expect(result.capitalGain).toBe(500); // (15 - 10) * 100
      expect(result.capitalGainPercentage).toBe(50); // ((15 - 10) / 10) * 100
    });

    test('should calculate negative capital gains correctly', () => {
      const trade: TradeData = { buy: 20, sell: 15, quantity: 50 };
      const result = calculateCapitalGains(trade);

      expect(result.capitalGain).toBe(-250); // (15 - 20) * 50
      expect(result.capitalGainPercentage).toBe(-25); // ((15 - 20) / 20) * 100
    });

    test('should handle zero buy price (avoid division by zero)', () => {
      const trade: TradeData = { buy: 0, sell: 10, quantity: 100 };
      const result = calculateCapitalGains(trade);

      expect(result.capitalGain).toBe(1000); // (10 - 0) * 100
      expect(result.capitalGainPercentage).toBe(0); // Special case: return 0 instead of Infinity
    });

    test('should handle zero sell price', () => {
      const trade: TradeData = { buy: 10, sell: 0, quantity: 100 };
      const result = calculateCapitalGains(trade);

      expect(result.capitalGain).toBe(-1000); // (0 - 10) * 100
      expect(result.capitalGainPercentage).toBe(-100); // ((0 - 10) / 10) * 100
    });

    test('should handle zero quantity', () => {
      const trade: TradeData = { buy: 10, sell: 15, quantity: 0 };
      const result = calculateCapitalGains(trade);

      expect(result.capitalGain).toBe(0); // (15 - 10) * 0
      expect(result.capitalGainPercentage).toBe(50); // ((15 - 10) / 10) * 100
    });

    test('should handle equal buy and sell prices', () => {
      const trade: TradeData = { buy: 10, sell: 10, quantity: 100 };
      const result = calculateCapitalGains(trade);

      expect(result.capitalGain).toBe(0); // (10 - 10) * 100
      expect(result.capitalGainPercentage).toBe(0); // ((10 - 10) / 10) * 100
    });

    test('should handle very small numbers', () => {
      const trade: TradeData = { buy: 0.01, sell: 0.02, quantity: 10000 };
      const result = calculateCapitalGains(trade);

      expect(result.capitalGain).toBe(100); // (0.02 - 0.01) * 10000
      expect(result.capitalGainPercentage).toBe(100); // ((0.02 - 0.01) / 0.01) * 100
    });

    test('should handle very large numbers', () => {
      const trade: TradeData = { buy: 1000000, sell: 1500000, quantity: 10 };
      const result = calculateCapitalGains(trade);

      expect(result.capitalGain).toBe(5000000); // (1500000 - 1000000) * 10
      expect(result.capitalGainPercentage).toBe(50); // ((1500000 - 1000000) / 1000000) * 100
    });

    test('should handle fractional shares', () => {
      const trade: TradeData = { buy: 10, sell: 12, quantity: 25.5 };
      const result = calculateCapitalGains(trade);

      expect(result.capitalGain).toBe(51); // (12 - 10) * 25.5
      expect(result.capitalGainPercentage).toBe(20); // ((12 - 10) / 10) * 100
    });

    test('should return zero for invalid inputs', () => {
      const invalidTrades: TradeData[] = [
        { buy: NaN, sell: 10, quantity: 100 },
        { buy: 10, sell: NaN, quantity: 100 },
        { buy: 10, sell: 10, quantity: NaN },
        { buy: Infinity, sell: 10, quantity: 100 },
        { buy: 10, sell: Infinity, quantity: 100 },
        { buy: 10, sell: 10, quantity: Infinity },
      ];

      invalidTrades.forEach(function testInvalidTrade(trade, index) {
        const result = calculateCapitalGains(trade);
        expect(result.capitalGain).toBe(0);
        expect(result.capitalGainPercentage).toBe(0);
      });
    });

    test('should handle negative buy price', () => {
      const trade: TradeData = { buy: -5, sell: 10, quantity: 100 };
      const result = calculateCapitalGains(trade);

      expect(result.capitalGain).toBe(1500); // (10 - (-5)) * 100
      expect(result.capitalGainPercentage).toBe(-300); // ((10 - (-5)) / -5) * 100
    });
  });

  describe('formatCapitalGainsPercentage', () => {
    test('should format normal percentage correctly', () => {
      const result = formatCapitalGainsPercentage(10, 25.456);
      expect(result).toBe('25.46%');
    });

    test('should return N/A for zero buy price', () => {
      const result = formatCapitalGainsPercentage(0, 100);
      expect(result).toBe('N/A');
    });

    test('should return N/A for invalid buy price', () => {
      const result = formatCapitalGainsPercentage(NaN, 25);
      expect(result).toBe('N/A');
    });

    test('should return N/A for invalid percentage', () => {
      const result = formatCapitalGainsPercentage(10, NaN);
      expect(result).toBe('N/A');
    });

    test('should handle negative percentages', () => {
      const result = formatCapitalGainsPercentage(10, -25.123);
      expect(result).toBe('-25.12%');
    });
  });

  describe('formatCapitalGainsDollar', () => {
    test('should format positive dollar amount correctly', () => {
      const result = formatCapitalGainsDollar(1234.5678);
      expect(result).toBe('$1,234.5678');
    });

    test('should format negative dollar amount correctly', () => {
      const result = formatCapitalGainsDollar(-500.25);
      expect(result).toBe('-$500.25');
    });

    test('should handle zero amount', () => {
      const result = formatCapitalGainsDollar(0);
      expect(result).toBe('$0.00');
    });

    test('should return $0.00 for invalid amount', () => {
      const result = formatCapitalGainsDollar(NaN);
      expect(result).toBe('$0.00');
    });

    test('should format large amounts with commas', () => {
      const result = formatCapitalGainsDollar(1234567.89);
      expect(result).toBe('$1,234,567.89');
    });

    test('should handle very small amounts', () => {
      const result = formatCapitalGainsDollar(0.0123);
      expect(result).toBe('$0.0123');
    });
  });
});
