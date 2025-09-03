import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Account } from '../../store/accounts/account.interface';
import type { Trade } from '../../store/trades/trade.interface';
import { calculateTradeTotals } from './account-data-calculator.function';
import { UniverseDataService } from './universe-data.service';

// Mock the selector functions
const { mockSelectAccountChildren, mockSelectUniverses } = vi.hoisted(() => ({
  mockSelectAccountChildren: vi.fn(),
  mockSelectUniverses: vi.fn(),
}));

vi.mock(
  '../../store/trades/selectors/select-account-children.function',
  () => ({
    selectAccountChildren: mockSelectAccountChildren,
  })
);

vi.mock('../../store/universe/selectors/select-universes.function', () => ({
  selectUniverses: mockSelectUniverses,
}));

describe('Integration Tests - End-to-End Data Flow', () => {
  let service: UniverseDataService;

  const ACCOUNT_ID = 'test-account-1';
  const ACCOUNT_2_ID = 'test-account-2';
  const UNIVERSE_AAPL_ID = 'universe-aapl';
  const UNIVERSE_MSFT_ID = 'universe-msft';
  const AAPL_SYMBOL = 'AAPL';
  const MSFT_SYMBOL = 'MSFT';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UniverseDataService();
  });

  describe('complete end-to-end data flow', () => {
    test('calculates from trades through universe data to final yield display', () => {
      // Setup mock universes
      mockSelectUniverses.mockReturnValue([
        {
          id: UNIVERSE_AAPL_ID,
          symbol: AAPL_SYMBOL,
          distribution: 0.25,
          distributions_per_year: 4,
          last_price: 150.0,
        },
        {
          id: UNIVERSE_MSFT_ID,
          symbol: MSFT_SYMBOL,
          distribution: 0.5,
          distributions_per_year: 4,
          last_price: 200.0,
        },
      ]);

      // Setup mock account data with trades
      mockSelectAccountChildren.mockReturnValue({
        entities: {
          [ACCOUNT_ID]: {
            id: ACCOUNT_ID,
            name: 'Test Account',
            trades: [
              {
                id: 'trade-1',
                universeId: UNIVERSE_AAPL_ID,
                accountId: ACCOUNT_ID,
                buy: 120.0,
                quantity: 100,
                sell_date: undefined,
              } as Trade,
              {
                id: 'trade-2',
                universeId: UNIVERSE_AAPL_ID,
                accountId: ACCOUNT_ID,
                buy: 130.0,
                quantity: 50,
                sell_date: undefined,
              } as Trade,
              {
                id: 'trade-3',
                universeId: UNIVERSE_MSFT_ID,
                accountId: ACCOUNT_ID,
                buy: 180.0,
                quantity: 40,
                sell_date: undefined,
              } as Trade,
            ],
          } as Partial<Account>,
        },
      });

      // Test complete flow for AAPL
      const aaplData = service.getAccountSpecificData(AAPL_SYMBOL, ACCOUNT_ID);

      // Verify position calculation
      expect(aaplData.position).toBe(18500); // (120*100 + 130*50)

      // Verify weighted average yield calculation
      // Weighted avg price: (120*100 + 130*50) / (100+50) = 18500/150 = 123.33
      // Expected yield: 100 * 4 * (0.25 / 123.33) = 0.81%
      expect(aaplData.avg_purchase_yield_percent).toBeCloseTo(0.81, 2);

      // Test complete flow for MSFT
      const msftData = service.getAccountSpecificData(MSFT_SYMBOL, ACCOUNT_ID);

      // Verify position calculation
      expect(msftData.position).toBe(7200); // (180*40)

      // Verify yield calculation
      // Expected yield: 100 * 4 * (0.5 / 180) = 1.11%
      expect(msftData.avg_purchase_yield_percent).toBeCloseTo(1.11, 2);
    });

    test('handles multi-account aggregation through calculateTradeTotals', () => {
      mockSelectUniverses.mockReturnValue([
        {
          id: UNIVERSE_AAPL_ID,
          symbol: AAPL_SYMBOL,
          distribution: 0.25,
          distributions_per_year: 4,
          last_price: 150.0,
        },
      ]);

      mockSelectAccountChildren.mockReturnValue({
        entities: {
          [ACCOUNT_ID]: {
            id: ACCOUNT_ID,
            trades: [
              {
                id: 'trade-1',
                universeId: UNIVERSE_AAPL_ID,
                accountId: ACCOUNT_ID,
                buy: 100.0,
                quantity: 100,
                sell_date: undefined,
              } as Trade,
            ],
          } as Partial<Account>,
          [ACCOUNT_2_ID]: {
            id: ACCOUNT_2_ID,
            trades: [
              {
                id: 'trade-2',
                universeId: UNIVERSE_AAPL_ID,
                accountId: ACCOUNT_2_ID,
                buy: 120.0,
                quantity: 50,
                sell_date: undefined,
              } as Trade,
            ],
          } as Partial<Account>,
        },
      });

      // Test the direct calculation method that aggregates across all accounts
      const { totalCost, totalQuantity } = calculateTradeTotals(
        UNIVERSE_AAPL_ID,
        'all'
      );

      // Verify the totals are calculated correctly across both accounts
      expect(totalCost).toBe(16000); // (100*100 + 120*50)
      expect(totalQuantity).toBe(150); // (100 + 50)

      // Calculate expected yield manually to verify the math
      const avgPrice = totalCost / totalQuantity; // 16000/150 = 106.67
      const expectedYield = 100 * 4 * (0.25 / avgPrice); // 100 * 4 * (0.25 / 106.67) = 0.94%
      expect(expectedYield).toBeCloseTo(0.94, 2);
    });

    test('integrates with filtering and sorting end-to-end', () => {
      const mockDisplayData = [
        {
          symbol: AAPL_SYMBOL,
          riskGroup: 'Growth',
          distribution: 0.25,
          distributions_per_year: 4,
          last_price: 150.0,
          most_recent_sell_date: null,
          most_recent_sell_price: null,
          ex_date: new Date('2024-03-15'),
          yield_percent: 0.667,
          avg_purchase_yield_percent: 8.33,
          expired: false,
          position: 1200.0,
        },
        {
          symbol: MSFT_SYMBOL,
          riskGroup: 'Conservative',
          distribution: 0.5,
          distributions_per_year: 4,
          last_price: 200.0,
          most_recent_sell_date: null,
          most_recent_sell_price: null,
          ex_date: new Date('2024-03-20'),
          yield_percent: 1.0,
          avg_purchase_yield_percent: 6.5,
          expired: false,
          position: 2000.0,
        },
      ];

      const filterParams = {
        rawData: mockDisplayData,
        sortCriteria: [{ field: 'avg_purchase_yield_percent', order: -1 }], // Descending
        minYield: null,
        selectedAccount: ACCOUNT_ID,
        symbolFilter: '',
        riskGroupFilter: null,
        expiredFilter: null,
      };

      const result = service.filterAndSortUniverses(filterParams);

      // Should be sorted by avg_purchase_yield_percent descending
      expect(result[0].symbol).toBe(AAPL_SYMBOL); // 8.33% yield
      expect(result[1].symbol).toBe(MSFT_SYMBOL); // 6.5% yield
    });
  });

  describe('edge cases and error handling', () => {
    test('handles empty trade arrays gracefully', () => {
      mockSelectUniverses.mockReturnValue([
        {
          id: UNIVERSE_AAPL_ID,
          symbol: AAPL_SYMBOL,
          distribution: 0.25,
          distributions_per_year: 4,
          last_price: 150.0,
        },
      ]);

      mockSelectAccountChildren.mockReturnValue({
        entities: {
          [ACCOUNT_ID]: {
            id: ACCOUNT_ID,
            trades: [], // Empty trades
          } as Partial<Account>,
        },
      });

      const result = service.getAccountSpecificData(AAPL_SYMBOL, ACCOUNT_ID);

      expect(result.position).toBe(0);
      expect(result.avg_purchase_yield_percent).toBe(0);
    });

    test('handles missing universe data', () => {
      mockSelectUniverses.mockReturnValue([]); // No universes
      mockSelectAccountChildren.mockReturnValue({ entities: {} });

      const result = service.getAccountSpecificData('NONEXISTENT', ACCOUNT_ID);

      expect(result.position).toBe(0);
      expect(result.avg_purchase_yield_percent).toBe(0);
    });

    test('handles account switching scenarios', () => {
      mockSelectUniverses.mockReturnValue([
        {
          id: UNIVERSE_AAPL_ID,
          symbol: AAPL_SYMBOL,
          distribution: 0.25,
          distributions_per_year: 4,
          last_price: 150.0,
        },
      ]);

      mockSelectAccountChildren.mockReturnValue({
        entities: {
          [ACCOUNT_ID]: {
            id: ACCOUNT_ID,
            trades: [
              {
                id: 'trade-1',
                universeId: UNIVERSE_AAPL_ID,
                accountId: ACCOUNT_ID,
                buy: 100.0,
                quantity: 100,
                sell_date: undefined,
              } as Trade,
            ],
          } as Partial<Account>,
          [ACCOUNT_2_ID]: {
            id: ACCOUNT_2_ID,
            trades: [
              {
                id: 'trade-2',
                universeId: UNIVERSE_AAPL_ID,
                accountId: ACCOUNT_2_ID,
                buy: 200.0,
                quantity: 50,
                sell_date: undefined,
              } as Trade,
            ],
          } as Partial<Account>,
        },
      });

      // Test first account
      const account1Data = service.getAccountSpecificData(
        AAPL_SYMBOL,
        ACCOUNT_ID
      );
      expect(account1Data.avg_purchase_yield_percent).toBeCloseTo(1.0, 1); // 100 * 4 * (0.25 / 100)

      // Test second account
      const account2Data = service.getAccountSpecificData(
        AAPL_SYMBOL,
        ACCOUNT_2_ID
      );
      expect(account2Data.avg_purchase_yield_percent).toBeCloseTo(0.5, 1); // 100 * 4 * (0.25 / 200)
    });
  });
});
