import { describe, expect, test, vi } from 'vitest';

import { applyAllAccountsFilter } from './apply-all-accounts-filter.function';
import type { UniverseDisplayData } from './universe-display-data.interface';

// Mock the dependencies
vi.mock('./account-data-calculator.function', () => ({
  calculateTradeTotals: vi.fn(),
}));

vi.mock('./find-universe-id-by-symbol.function', () => ({
  findUniverseIdBySymbol: vi.fn(),
}));

import { calculateTradeTotals } from './account-data-calculator.function';
import { findUniverseIdBySymbol } from './find-universe-id-by-symbol.function';

describe('applyAllAccountsFilter', () => {
  const mockCalculateAveragePurchaseYield = vi.fn();
  const mockCalculateTradeTotals = vi.mocked(calculateTradeTotals);
  const mockFindUniverseIdBySymbol = vi.mocked(findUniverseIdBySymbol);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockData = (
    symbol: string,
    avgPurchaseYieldPercent = 1.0
  ): UniverseDisplayData => ({
    symbol,
    riskGroup: 'Growth',
    distribution: 0.25,
    distributions_per_year: 4,
    last_price: 150.0,
    most_recent_sell_date: null,
    most_recent_sell_price: null,
    ex_date: new Date('2024-03-15'),
    yield_percent: 1.0,
    avg_purchase_yield_percent: avgPurchaseYieldPercent,
    expired: false,
    position: 0, // Will be set by the filter
  });

  test('calculates average purchase yield and total position for each symbol', () => {
    const data = [createMockData('AAPL'), createMockData('MSFT')];

    // Mock function returns
    mockCalculateAveragePurchaseYield
      .mockReturnValueOnce(3.5) // AAPL
      .mockReturnValueOnce(2.8); // MSFT

    mockFindUniverseIdBySymbol
      .mockReturnValueOnce('universe-1') // AAPL
      .mockReturnValueOnce('universe-2'); // MSFT

    mockCalculateTradeTotals
      .mockReturnValueOnce({ totalCost: 5000, totalQuantity: 100 }) // AAPL
      .mockReturnValueOnce({ totalCost: 3000, totalQuantity: 50 }); // MSFT

    const result = applyAllAccountsFilter(
      data,
      mockCalculateAveragePurchaseYield
    );

    expect(result).toHaveLength(2);

    // Check AAPL result
    expect(result[0]).toEqual({
      ...data[0],
      avg_purchase_yield_percent: 3.5,
      position: 5000,
    });

    // Check MSFT result
    expect(result[1]).toEqual({
      ...data[1],
      avg_purchase_yield_percent: 2.8,
      position: 3000,
    });

    // Verify mocks were called correctly
    expect(mockCalculateAveragePurchaseYield).toHaveBeenCalledWith(
      'AAPL',
      'all'
    );
    expect(mockCalculateAveragePurchaseYield).toHaveBeenCalledWith(
      'MSFT',
      'all'
    );
    expect(mockFindUniverseIdBySymbol).toHaveBeenCalledWith('AAPL');
    expect(mockFindUniverseIdBySymbol).toHaveBeenCalledWith('MSFT');
    expect(mockCalculateTradeTotals).toHaveBeenCalledWith('universe-1', 'all');
    expect(mockCalculateTradeTotals).toHaveBeenCalledWith('universe-2', 'all');
  });

  test('handles symbol with no universe ID found', () => {
    const data = [createMockData('UNKNOWN')];

    mockCalculateAveragePurchaseYield.mockReturnValue(1.5);
    mockFindUniverseIdBySymbol.mockReturnValue(undefined);
    mockCalculateTradeTotals.mockReturnValue({
      totalCost: 0,
      totalQuantity: 0,
    });

    const result = applyAllAccountsFilter(
      data,
      mockCalculateAveragePurchaseYield
    );

    expect(result).toHaveLength(1);
    expect(result[0].position).toBe(0);

    // Should call with empty string when universe ID is undefined
    expect(mockCalculateTradeTotals).toHaveBeenCalledWith('', 'all');
  });

  test('handles symbol with null universe ID', () => {
    const data = [createMockData('NULL_UNIVERSE')];

    mockCalculateAveragePurchaseYield.mockReturnValue(1.5);
    mockFindUniverseIdBySymbol.mockReturnValue(null as unknown as string);
    mockCalculateTradeTotals.mockReturnValue({
      totalCost: 0,
      totalQuantity: 0,
    });

    const result = applyAllAccountsFilter(
      data,
      mockCalculateAveragePurchaseYield
    );

    expect(result).toHaveLength(1);
    expect(result[0].position).toBe(0);

    // Should call with empty string when universe ID is null
    expect(mockCalculateTradeTotals).toHaveBeenCalledWith('', 'all');
  });

  test('preserves all original properties except avg_purchase_yield_percent and position', () => {
    const originalData = createMockData('TEST');
    const data = [originalData];

    mockCalculateAveragePurchaseYield.mockReturnValue(4.2);
    mockFindUniverseIdBySymbol.mockReturnValue('universe-test');
    mockCalculateTradeTotals.mockReturnValue({
      totalCost: 1500,
      totalQuantity: 30,
    });

    const result = applyAllAccountsFilter(
      data,
      mockCalculateAveragePurchaseYield
    );

    expect(result[0]).toEqual({
      ...originalData,
      avg_purchase_yield_percent: 4.2,
      position: 1500,
    });
  });

  test('handles empty data array', () => {
    const result = applyAllAccountsFilter(
      [],
      mockCalculateAveragePurchaseYield
    );

    expect(result).toEqual([]);
    expect(mockCalculateAveragePurchaseYield).not.toHaveBeenCalled();
    expect(mockFindUniverseIdBySymbol).not.toHaveBeenCalled();
    expect(mockCalculateTradeTotals).not.toHaveBeenCalled();
  });

  test('handles multiple symbols with varying position values', () => {
    const data = [
      createMockData('HIGH_POSITION'),
      createMockData('ZERO_POSITION'),
      createMockData('MID_POSITION'),
    ];

    mockCalculateAveragePurchaseYield
      .mockReturnValueOnce(5.0)
      .mockReturnValueOnce(0.0)
      .mockReturnValueOnce(3.0);

    mockFindUniverseIdBySymbol
      .mockReturnValueOnce('high-pos-id')
      .mockReturnValueOnce('zero-pos-id')
      .mockReturnValueOnce('mid-pos-id');

    mockCalculateTradeTotals
      .mockReturnValueOnce({ totalCost: 10000, totalQuantity: 200 })
      .mockReturnValueOnce({ totalCost: 0, totalQuantity: 0 })
      .mockReturnValueOnce({ totalCost: 5000, totalQuantity: 100 });

    const result = applyAllAccountsFilter(
      data,
      mockCalculateAveragePurchaseYield
    );

    expect(result).toHaveLength(3);
    expect(result[0].position).toBe(10000);
    expect(result[1].position).toBe(0);
    expect(result[2].position).toBe(5000);
  });

  test('handles large position values correctly', () => {
    const data = [createMockData('LARGE_POSITION')];

    mockCalculateAveragePurchaseYield.mockReturnValue(2.5);
    mockFindUniverseIdBySymbol.mockReturnValue('large-universe');
    mockCalculateTradeTotals.mockReturnValue({
      totalCost: 1000000.5, // Large decimal value
      totalQuantity: 10000,
    });

    const result = applyAllAccountsFilter(
      data,
      mockCalculateAveragePurchaseYield
    );

    expect(result[0].position).toBe(1000000.5);
  });
});
