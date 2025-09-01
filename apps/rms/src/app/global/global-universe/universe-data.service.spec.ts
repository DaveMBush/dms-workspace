import { beforeEach, describe, expect, test, vi } from 'vitest';

import { UniverseDataService } from './universe-data.service';

const { mockSelectUniverses, mockSelectAccountChildren } = vi.hoisted(() => ({
  mockSelectUniverses: vi.fn(),
  mockSelectAccountChildren: vi.fn(),
}));

vi.mock('../../store/universe/selectors/select-universes.function', () => ({
  selectUniverses: mockSelectUniverses,
}));

vi.mock(
  '../../store/trades/selectors/select-account-children.function',
  () => ({
    selectAccountChildren: mockSelectAccountChildren,
  })
);

describe('UniverseDataService', () => {
  let service: UniverseDataService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UniverseDataService();

    // Mock default returns for selectors
    mockSelectUniverses.mockReturnValue([
      {
        id: UNIVERSE_1_ID,
        symbol: AAPL_SYMBOL,
        distribution: 0.25,
        distributions_per_year: DISTRIBUTIONS_PER_YEAR,
        last_price: 150.0,
      },
      {
        id: 'universe-2',
        symbol: 'MSFT',
        distribution: 0.5,
        distributions_per_year: DISTRIBUTIONS_PER_YEAR,
        last_price: 200.0,
      },
    ]);

    mockSelectAccountChildren.mockReturnValue({
      entities: {
        [ACCOUNT_1_ID]: {
          id: ACCOUNT_1_ID,
          trades: [
            {
              id: 'trade-1',
              universeId: UNIVERSE_1_ID,
              accountId: ACCOUNT_1_ID,
              buy: 120.0,
              quantity: 10,
              sell_date: undefined,
            },
          ],
        },
      },
    });
  });

  const MOCK_YIELD_PERCENT = 0.667;
  const GROWTH_RISK_GROUP = 'Growth';
  const AAPL_SYMBOL = 'AAPL';
  const DISTRIBUTIONS_PER_YEAR = 4;
  const MOCK_AVG_YIELD = 1.0;
  const EX_DATE = '2024-03-15';
  const AVG_PURCHASE_YIELD_FIELD = 'avg_purchase_yield_percent';
  const ACCOUNT_1_ID = 'account-1';
  const UNIVERSE_1_ID = 'universe-1';

  describe('getFieldValueFromDisplayData', () => {
    const mockDisplayData = {
      symbol: AAPL_SYMBOL,
      riskGroup: GROWTH_RISK_GROUP,
      distribution: 0.25,
      distributions_per_year: DISTRIBUTIONS_PER_YEAR,
      last_price: 150.0,
      most_recent_sell_date: null,
      most_recent_sell_price: null,
      ex_date: new Date(EX_DATE),
      yield_percent: MOCK_YIELD_PERCENT,
      avg_purchase_yield_percent: MOCK_AVG_YIELD,
      expired: false,
      position: 1000.0,
    };

    test('returns avg_purchase_yield_percent field value', () => {
      const result = service.getFieldValueFromDisplayData(
        mockDisplayData,
        AVG_PURCHASE_YIELD_FIELD
      );
      expect(result).toBe(MOCK_AVG_YIELD);
    });

    test('returns 0 for avg_purchase_yield_percent when field is null', () => {
      const dataWithNullYield = {
        ...mockDisplayData,
        avg_purchase_yield_percent: null,
      };
      const result = service.getFieldValueFromDisplayData(
        dataWithNullYield,
        AVG_PURCHASE_YIELD_FIELD
      );
      expect(result).toBe(0);
    });

    test('returns 0 for avg_purchase_yield_percent when field is undefined', () => {
      const dataWithUndefinedYield = { ...mockDisplayData };
      delete dataWithUndefinedYield.avg_purchase_yield_percent;
      const result = service.getFieldValueFromDisplayData(
        dataWithUndefinedYield,
        AVG_PURCHASE_YIELD_FIELD
      );
      expect(result).toBe(0);
    });

    test('maintains existing yield_percent field handling', () => {
      const result = service.getFieldValueFromDisplayData(
        mockDisplayData,
        'yield_percent'
      );
      expect(result).toBe(MOCK_YIELD_PERCENT);
    });

    test('handles other fields through default case', () => {
      const result = service.getFieldValueFromDisplayData(
        mockDisplayData,
        'symbol'
      );
      expect(result).toBe(AAPL_SYMBOL);
    });

    test('handles ex_date field through existing logic', () => {
      const result = service.getFieldValueFromDisplayData(
        mockDisplayData,
        'ex_date'
      );
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('avg_purchase_yield_percent in sorting and filtering', () => {
    const mockUniverseData = [
      {
        symbol: AAPL_SYMBOL,
        riskGroup: GROWTH_RISK_GROUP,
        distribution: 0.25,
        distributions_per_year: DISTRIBUTIONS_PER_YEAR,
        last_price: 150.0,
        most_recent_sell_date: null,
        most_recent_sell_price: null,
        ex_date: new Date(EX_DATE),
        yield_percent: MOCK_YIELD_PERCENT,
        avg_purchase_yield_percent: 1.5,
        expired: false,
        position: 1000.0,
      },
      {
        symbol: 'MSFT',
        riskGroup: GROWTH_RISK_GROUP,
        distribution: 0.5,
        distributions_per_year: DISTRIBUTIONS_PER_YEAR,
        last_price: 200.0,
        most_recent_sell_date: null,
        most_recent_sell_price: null,
        ex_date: new Date('2024-03-20'),
        yield_percent: 1.0,
        avg_purchase_yield_percent: 0.8,
        expired: false,
        position: 2000.0,
      },
    ];

    test('supports sorting by avg_purchase_yield_percent ascending', () => {
      const params = {
        rawData: mockUniverseData,
        sortCriteria: [{ field: AVG_PURCHASE_YIELD_FIELD, order: 1 }],
        minYield: null,
        selectedAccount: 'all',
        symbolFilter: '',
        riskGroupFilter: null,
        expiredFilter: null,
      };

      const result = service.filterAndSortUniverses(params);

      expect(result[0].symbol).toBe('MSFT'); // 0.8 yield
      expect(result[1].symbol).toBe('AAPL'); // 1.5 yield
    });

    test('supports sorting by avg_purchase_yield_percent descending', () => {
      const params = {
        rawData: mockUniverseData,
        sortCriteria: [{ field: AVG_PURCHASE_YIELD_FIELD, order: -1 }],
        minYield: null,
        selectedAccount: 'all',
        symbolFilter: '',
        riskGroupFilter: null,
        expiredFilter: null,
      };

      const result = service.filterAndSortUniverses(params);

      expect(result[0].symbol).toBe('AAPL'); // 1.5 yield
      expect(result[1].symbol).toBe('MSFT'); // 0.8 yield
    });

    test('handles mixed sorting criteria with avg_purchase_yield_percent', () => {
      const dataWithSameYield = [
        { ...mockUniverseData[0], avg_purchase_yield_percent: 1.0 },
        { ...mockUniverseData[1], avg_purchase_yield_percent: 1.0 },
      ];

      const params = {
        rawData: dataWithSameYield,
        sortCriteria: [
          { field: AVG_PURCHASE_YIELD_FIELD, order: -1 },
          { field: 'symbol', order: 1 },
        ],
        minYield: null,
        selectedAccount: 'all',
        symbolFilter: '',
        riskGroupFilter: null,
        expiredFilter: null,
      };

      const result = service.filterAndSortUniverses(params);

      // Since avg yields are equal, should sort by symbol alphabetically
      expect(result[0].symbol).toBe('AAPL');
      expect(result[1].symbol).toBe('MSFT');
    });
  });

  describe('integration with existing filtering', () => {
    test('preserves avg_purchase_yield_percent through filtering operations', () => {
      const mockData = [
        {
          symbol: AAPL_SYMBOL,
          riskGroup: GROWTH_RISK_GROUP,
          distribution: 0.25,
          distributions_per_year: DISTRIBUTIONS_PER_YEAR,
          last_price: 150.0,
          most_recent_sell_date: null,
          most_recent_sell_price: null,
          ex_date: new Date(EX_DATE),
          yield_percent: MOCK_YIELD_PERCENT,
          avg_purchase_yield_percent: 1.5,
          expired: false,
          position: 1000.0,
        },
      ];

      const params = {
        rawData: mockData,
        sortCriteria: [],
        minYield: null,
        selectedAccount: 'all',
        symbolFilter: 'AAPL',
        riskGroupFilter: null,
        expiredFilter: null,
      };

      const result = service.filterAndSortUniverses(params);

      expect(result).toHaveLength(1);
      // For 'all' accounts, calculates from mocked data: 100 * 4 * (0.25 / 120.0) = 0.8333
      expect(result[0].avg_purchase_yield_percent).toBeCloseTo(0.8333, 3);
    });

    test('maintains avg_purchase_yield_percent during account-specific filtering', () => {
      const mockData = [
        {
          symbol: AAPL_SYMBOL,
          riskGroup: GROWTH_RISK_GROUP,
          distribution: 0.25,
          distributions_per_year: DISTRIBUTIONS_PER_YEAR,
          last_price: 150.0,
          most_recent_sell_date: null,
          most_recent_sell_price: null,
          ex_date: new Date(EX_DATE),
          yield_percent: MOCK_YIELD_PERCENT,
          avg_purchase_yield_percent: 1.5,
          expired: false,
          position: 1000.0,
        },
      ];

      mockSelectUniverses.mockReturnValue([
        {
          id: UNIVERSE_1_ID,
          symbol: AAPL_SYMBOL,
          distribution: 0.25,
          distributions_per_year: DISTRIBUTIONS_PER_YEAR,
        },
      ]);

      mockSelectAccountChildren.mockReturnValue({
        entities: {
          [ACCOUNT_1_ID]: {
            id: ACCOUNT_1_ID,
            trades: [
              {
                id: 'trade-1',
                universeId: UNIVERSE_1_ID,
                accountId: ACCOUNT_1_ID,
                buy: 100.0,
                sell: 0,
                buy_date: '2024-01-01',
                quantity: 10,
                sell_date: undefined,
              },
            ],
          },
        },
      });

      const params = {
        rawData: mockData,
        sortCriteria: [],
        minYield: null,
        selectedAccount: ACCOUNT_1_ID,
        symbolFilter: '',
        riskGroupFilter: null,
        expiredFilter: null,
      };

      const result = service.filterAndSortUniverses(params);

      expect(result).toHaveLength(1);
      // Now calculated: 100 * 4 * (0.25 / 100.0) = 1.0
      expect(result[0].avg_purchase_yield_percent).toBe(1.0);
      expect(result[0].position).toBe(1000.0); // Updated by account-specific logic
    });
  });
});
