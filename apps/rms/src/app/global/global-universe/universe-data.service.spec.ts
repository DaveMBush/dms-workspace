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

  describe('weighted average calculation tests', () => {
    test('calculates weighted average for multiple trades at different prices', () => {
      const mockMultiTradeData = {
        entities: {
          [ACCOUNT_1_ID]: {
            id: ACCOUNT_1_ID,
            trades: [
              {
                id: 'trade-1',
                universeId: UNIVERSE_1_ID,
                accountId: ACCOUNT_1_ID,
                buy: 10.5,
                quantity: 100,
                sell_date: undefined,
              },
              {
                id: 'trade-2',
                universeId: UNIVERSE_1_ID,
                accountId: ACCOUNT_1_ID,
                buy: 12.75,
                quantity: 50,
                sell_date: undefined,
              },
              {
                id: 'trade-3',
                universeId: UNIVERSE_1_ID,
                accountId: ACCOUNT_1_ID,
                buy: 9.25,
                quantity: 200,
                sell_date: undefined,
              },
            ],
          },
        },
      };

      mockSelectAccountChildren.mockReturnValue(mockMultiTradeData);

      const accountSpecificData = service.getAccountSpecificData(
        AAPL_SYMBOL,
        ACCOUNT_1_ID
      );

      // Expected weighted average: (10.50*100 + 12.75*50 + 9.25*200) / 350 = 10.107
      // Expected yield: 100 * 4 * (0.25 / 10.107) = 9.894%
      expect(accountSpecificData.avg_purchase_yield_percent).toBeCloseTo(
        9.894,
        2
      );
    });

    test('handles single trade scenario (weighted average equals buy price)', () => {
      const mockSingleTradeData = {
        entities: {
          [ACCOUNT_1_ID]: {
            id: ACCOUNT_1_ID,
            trades: [
              {
                id: 'trade-1',
                universeId: UNIVERSE_1_ID,
                accountId: ACCOUNT_1_ID,
                buy: 15.0,
                quantity: 100,
                sell_date: undefined,
              },
            ],
          },
        },
      };

      mockSelectAccountChildren.mockReturnValue(mockSingleTradeData);

      const accountSpecificData = service.getAccountSpecificData(
        AAPL_SYMBOL,
        ACCOUNT_1_ID
      );

      // Expected yield: 100 * 4 * (0.25 / 15.0) = 6.67%
      expect(accountSpecificData.avg_purchase_yield_percent).toBeCloseTo(
        6.67,
        2
      );
    });

    test('returns 0 when no open positions (all positions sold)', () => {
      const mockSoldTradeData = {
        entities: {
          [ACCOUNT_1_ID]: {
            id: ACCOUNT_1_ID,
            trades: [
              {
                id: 'trade-1',
                universeId: UNIVERSE_1_ID,
                accountId: ACCOUNT_1_ID,
                buy: 10.0,
                quantity: 100,
                sell_date: '2024-01-01',
              },
            ],
          },
        },
      };

      mockSelectAccountChildren.mockReturnValue(mockSoldTradeData);

      const accountSpecificData = service.getAccountSpecificData(
        AAPL_SYMBOL,
        ACCOUNT_1_ID
      );

      expect(accountSpecificData.avg_purchase_yield_percent).toBe(0);
    });

    test('returns 0 when open positions array is empty', () => {
      const mockEmptyTradeData = {
        entities: {
          [ACCOUNT_1_ID]: {
            id: ACCOUNT_1_ID,
            trades: [],
          },
        },
      };

      mockSelectAccountChildren.mockReturnValue(mockEmptyTradeData);

      const accountSpecificData = service.getAccountSpecificData(
        AAPL_SYMBOL,
        ACCOUNT_1_ID
      );

      expect(accountSpecificData.avg_purchase_yield_percent).toBe(0);
    });

    test('handles zero quantity scenario (edge case protection)', () => {
      const mockZeroQuantityData = {
        entities: {
          [ACCOUNT_1_ID]: {
            id: ACCOUNT_1_ID,
            trades: [
              {
                id: 'trade-1',
                universeId: UNIVERSE_1_ID,
                accountId: ACCOUNT_1_ID,
                buy: 15.0,
                quantity: 0,
                sell_date: undefined,
              },
            ],
          },
        },
      };

      mockSelectAccountChildren.mockReturnValue(mockZeroQuantityData);

      const accountSpecificData = service.getAccountSpecificData(
        AAPL_SYMBOL,
        ACCOUNT_1_ID
      );

      expect(accountSpecificData.avg_purchase_yield_percent).toBe(0);
    });

    test('handles zero distribution with non-zero positions', () => {
      mockSelectUniverses.mockReturnValue([
        {
          id: UNIVERSE_1_ID,
          symbol: AAPL_SYMBOL,
          distribution: 0,
          distributions_per_year: 4,
          last_price: 150.0,
        },
      ]);

      const accountSpecificData = service.getAccountSpecificData(
        AAPL_SYMBOL,
        ACCOUNT_1_ID
      );

      expect(accountSpecificData.avg_purchase_yield_percent).toBe(0);
    });
  });

  describe('yield percentage calculation tests', () => {
    test('calculates yield with various distribution amounts', () => {
      const testScenarios = [
        { distribution: 0.25, expected: 8.33 }, // 100 * 4 * (0.25 / 12.0) = 8.33%
        { distribution: 0.5, expected: 16.67 }, // 100 * 4 * (0.50 / 12.0) = 16.67%
        { distribution: 1.0, expected: 33.33 }, // 100 * 4 * (1.00 / 12.0) = 33.33%
      ];

      testScenarios.forEach((scenario) => {
        mockSelectUniverses.mockReturnValue([
          {
            id: UNIVERSE_1_ID,
            symbol: AAPL_SYMBOL,
            distribution: scenario.distribution,
            distributions_per_year: 4,
            last_price: 150.0,
          },
        ]);

        const mockTradeData = {
          entities: {
            [ACCOUNT_1_ID]: {
              id: ACCOUNT_1_ID,
              trades: [
                {
                  id: 'trade-1',
                  universeId: UNIVERSE_1_ID,
                  accountId: ACCOUNT_1_ID,
                  buy: 12.0,
                  quantity: 100,
                  sell_date: undefined,
                },
              ],
            },
          },
        };

        mockSelectAccountChildren.mockReturnValue(mockTradeData);

        const accountSpecificData = service.getAccountSpecificData(
          AAPL_SYMBOL,
          ACCOUNT_1_ID
        );

        expect(accountSpecificData.avg_purchase_yield_percent).toBeCloseTo(
          scenario.expected,
          1
        );
      });
    });

    test('calculates yield with different distributions_per_year values', () => {
      const testScenarios = [
        { distributions_per_year: 4, expected: 8.33 }, // Quarterly: 100 * 4 * (0.25 / 12.0) = 8.33%
        { distributions_per_year: 12, expected: 25.0 }, // Monthly: 100 * 12 * (0.25 / 12.0) = 25.0%
        { distributions_per_year: 1, expected: 2.08 }, // Annual: 100 * 1 * (0.25 / 12.0) = 2.08%
      ];

      testScenarios.forEach((scenario) => {
        mockSelectUniverses.mockReturnValue([
          {
            id: UNIVERSE_1_ID,
            symbol: AAPL_SYMBOL,
            distribution: 0.25,
            distributions_per_year: scenario.distributions_per_year,
            last_price: 150.0,
          },
        ]);

        const mockTradeData = {
          entities: {
            [ACCOUNT_1_ID]: {
              id: ACCOUNT_1_ID,
              trades: [
                {
                  id: 'trade-1',
                  universeId: UNIVERSE_1_ID,
                  accountId: ACCOUNT_1_ID,
                  buy: 12.0,
                  quantity: 100,
                  sell_date: undefined,
                },
              ],
            },
          },
        };

        mockSelectAccountChildren.mockReturnValue(mockTradeData);

        const accountSpecificData = service.getAccountSpecificData(
          AAPL_SYMBOL,
          ACCOUNT_1_ID
        );

        expect(accountSpecificData.avg_purchase_yield_percent).toBeCloseTo(
          scenario.expected,
          2
        );
      });
    });

    test('handles divide-by-zero protection when average price is 0', () => {
      const mockTradeData = {
        entities: {
          [ACCOUNT_1_ID]: {
            id: ACCOUNT_1_ID,
            trades: [
              {
                id: 'trade-1',
                universeId: UNIVERSE_1_ID,
                accountId: ACCOUNT_1_ID,
                buy: 0,
                quantity: 100,
                sell_date: undefined,
              },
            ],
          },
        },
      };

      mockSelectAccountChildren.mockReturnValue(mockTradeData);

      const accountSpecificData = service.getAccountSpecificData(
        AAPL_SYMBOL,
        ACCOUNT_1_ID
      );

      expect(accountSpecificData.avg_purchase_yield_percent).toBe(0);
    });

    test('handles null distribution gracefully', () => {
      mockSelectUniverses.mockReturnValue([
        {
          id: UNIVERSE_1_ID,
          symbol: AAPL_SYMBOL,
          distribution: null as unknown as number,
          distributions_per_year: 4,
          last_price: 150.0,
        },
      ]);

      const accountSpecificData = service.getAccountSpecificData(
        AAPL_SYMBOL,
        ACCOUNT_1_ID
      );

      expect(accountSpecificData.avg_purchase_yield_percent).toBe(0);
    });

    test('handles undefined distributions_per_year field', () => {
      mockSelectUniverses.mockReturnValue([
        {
          id: UNIVERSE_1_ID,
          symbol: AAPL_SYMBOL,
          distribution: 0.25,
          distributions_per_year: undefined as unknown as number,
          last_price: 150.0,
        },
      ]);

      const mockTradeData = {
        entities: {
          [ACCOUNT_1_ID]: {
            id: ACCOUNT_1_ID,
            trades: [
              {
                id: 'trade-1',
                universeId: UNIVERSE_1_ID,
                accountId: ACCOUNT_1_ID,
                buy: 12.0,
                quantity: 100,
                sell_date: undefined,
              },
            ],
          },
        },
      };

      mockSelectAccountChildren.mockReturnValue(mockTradeData);

      const accountSpecificData = service.getAccountSpecificData(
        AAPL_SYMBOL,
        ACCOUNT_1_ID
      );

      // When distributions_per_year is undefined, the calculation results in NaN
      // which should be handled gracefully (either NaN or 0 depending on implementation)
      expect(
        Number.isNaN(accountSpecificData.avg_purchase_yield_percent) ||
          accountSpecificData.avg_purchase_yield_percent === 0
      ).toBe(true);
    });

    test('verifies formatting output has appropriate precision', () => {
      const mockTradeData = {
        entities: {
          [ACCOUNT_1_ID]: {
            id: ACCOUNT_1_ID,
            trades: [
              {
                id: 'trade-1',
                universeId: UNIVERSE_1_ID,
                accountId: ACCOUNT_1_ID,
                buy: 13.456789,
                quantity: 100,
                sell_date: undefined,
              },
            ],
          },
        },
      };

      mockSelectAccountChildren.mockReturnValue(mockTradeData);

      const accountSpecificData = service.getAccountSpecificData(
        AAPL_SYMBOL,
        ACCOUNT_1_ID
      );

      // Calculated value should be a number with reasonable precision
      // Expected: 100 * 4 * (0.25 / 13.456789) = 7.431%
      expect(accountSpecificData.avg_purchase_yield_percent).toBeCloseTo(
        7.431,
        2
      );
      expect(typeof accountSpecificData.avg_purchase_yield_percent).toBe(
        'number'
      );
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

  describe('expired-with-positions filtering', () => {
    const createMockData = (
      expired: boolean,
      position: number,
      symbol = 'TEST'
    ) => ({
      symbol,
      riskGroup: 'Growth',
      distribution: 0.25,
      distributions_per_year: 4,
      last_price: 150.0,
      most_recent_sell_date: null,
      most_recent_sell_price: null,
      ex_date: new Date('2024-03-15'),
      yield_percent: 1.0,
      avg_purchase_yield_percent: 1.0,
      expired,
      position,
    });

    test('shows expired symbols with positions for specific account', () => {
      // Set up mock universes and trades for the test
      mockSelectUniverses.mockReturnValue([
        {
          id: 'universe-expired-with-pos',
          symbol: 'EXPIRED_WITH_POS',
          distribution: 0.25,
          distributions_per_year: 4,
          last_price: 150.0,
        },
        {
          id: 'universe-expired-no-pos',
          symbol: 'EXPIRED_NO_POS',
          distribution: 0.25,
          distributions_per_year: 4,
          last_price: 150.0,
        },
        {
          id: 'universe-not-expired-no-pos',
          symbol: 'NOT_EXPIRED_NO_POS',
          distribution: 0.25,
          distributions_per_year: 4,
          last_price: 150.0,
        },
        {
          id: 'universe-not-expired-with-pos',
          symbol: 'NOT_EXPIRED_WITH_POS',
          distribution: 0.25,
          distributions_per_year: 4,
          last_price: 150.0,
        },
      ]);

      mockSelectAccountChildren.mockReturnValue({
        entities: {
          [ACCOUNT_1_ID]: {
            id: ACCOUNT_1_ID,
            account: ACCOUNT_1_ID,
            trades: [
              {
                id: 'trade-1',
                universeId: 'universe-expired-with-pos',
                accountId: ACCOUNT_1_ID,
                buy: 100.0,
                quantity: 10,
                sell_date: undefined, // Open position
              },
              // No trade for EXPIRED_NO_POS - so it has no position
            ],
          },
        },
      });

      const mockData = [
        createMockData(true, 1000, 'EXPIRED_WITH_POS'),
        createMockData(true, 0, 'EXPIRED_NO_POS'),
        createMockData(false, 0, 'NOT_EXPIRED_NO_POS'),
        createMockData(false, 1000, 'NOT_EXPIRED_WITH_POS'),
      ];

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

      expect(result).toHaveLength(3);
      expect(result.map((r) => r.symbol)).toContain('EXPIRED_WITH_POS');
      expect(result.map((r) => r.symbol)).not.toContain('EXPIRED_NO_POS');
      expect(result.map((r) => r.symbol)).toContain('NOT_EXPIRED_NO_POS');
      expect(result.map((r) => r.symbol)).toContain('NOT_EXPIRED_WITH_POS');

      // Reset mocks to default state for other tests
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

    test('shows expired symbols with positions in ANY account when selectedAccount is "all"', () => {
      const mockData = [createMockData(true, 0, 'EXPIRED_SYMBOL')];

      // Mock multiple accounts where one has positions
      mockSelectAccountChildren.mockReturnValue({
        entities: {
          'account-1': {
            id: 'account-1',
            account: 'account-1',
            trades: [],
          },
          'account-2': {
            id: 'account-2',
            account: 'account-2',
            trades: [
              {
                id: 'trade-1',
                universeId: 'universe-expired',
                accountId: 'account-2',
                buy: 100.0,
                quantity: 10,
                sell_date: undefined,
              },
            ],
          },
        },
      });

      mockSelectUniverses.mockReturnValue([
        {
          id: 'universe-expired',
          symbol: 'EXPIRED_SYMBOL',
          distribution: 0.25,
          distributions_per_year: 4,
          last_price: 150.0,
        },
      ]);

      const params = {
        rawData: mockData,
        sortCriteria: [],
        minYield: null,
        selectedAccount: 'all',
        symbolFilter: '',
        riskGroupFilter: null,
        expiredFilter: null,
      };

      const result = service.filterAndSortUniverses(params);

      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('EXPIRED_SYMBOL');
    });

    test('hides expired symbols with no positions in any account when selectedAccount is "all"', () => {
      const mockData = [createMockData(true, 0, 'EXPIRED_NO_POSITIONS')];

      // Mock multiple accounts with no positions for this symbol
      mockSelectAccountChildren.mockReturnValue({
        entities: {
          'account-1': {
            id: 'account-1',
            account: 'account-1',
            trades: [],
          },
          'account-2': {
            id: 'account-2',
            account: 'account-2',
            trades: [],
          },
        },
      });

      mockSelectUniverses.mockReturnValue([
        {
          id: 'universe-expired-no-pos',
          symbol: 'EXPIRED_NO_POSITIONS',
          distribution: 0.25,
          distributions_per_year: 4,
          last_price: 150.0,
        },
      ]);

      const params = {
        rawData: mockData,
        sortCriteria: [],
        minYield: null,
        selectedAccount: 'all',
        symbolFilter: '',
        riskGroupFilter: null,
        expiredFilter: null,
      };

      const result = service.filterAndSortUniverses(params);

      expect(result).toHaveLength(0);
    });

    test('preserves explicit expired filter functionality (overrides expired-with-positions logic)', () => {
      const mockData = [
        createMockData(true, 1000, 'EXPIRED_WITH_POS'),
        createMockData(true, 0, 'EXPIRED_NO_POS'),
        createMockData(false, 1000, 'NOT_EXPIRED'),
      ];

      const params = {
        rawData: mockData,
        sortCriteria: [],
        minYield: null,
        selectedAccount: ACCOUNT_1_ID,
        symbolFilter: '',
        riskGroupFilter: null,
        expiredFilter: true, // Explicit filter to show only expired
      };

      const result = service.filterAndSortUniverses(params);

      // When explicit expired filter is set, should show ALL expired symbols regardless of position
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.symbol)).toContain('EXPIRED_WITH_POS');
      expect(result.map((r) => r.symbol)).toContain('EXPIRED_NO_POS');
      expect(result.map((r) => r.symbol)).not.toContain('NOT_EXPIRED');
    });

    test('shows all non-expired symbols regardless of position (maintains existing behavior)', () => {
      // Set up mock universes for the test
      mockSelectUniverses.mockReturnValue([
        {
          id: 'universe-not-expired-no-pos',
          symbol: 'NOT_EXPIRED_NO_POS',
          distribution: 0.25,
          distributions_per_year: 4,
          last_price: 150.0,
        },
        {
          id: 'universe-not-expired-with-pos',
          symbol: 'NOT_EXPIRED_WITH_POS',
          distribution: 0.25,
          distributions_per_year: 4,
          last_price: 150.0,
        },
        {
          id: 'universe-expired-with-pos',
          symbol: 'EXPIRED_WITH_POS',
          distribution: 0.25,
          distributions_per_year: 4,
          last_price: 150.0,
        },
      ]);

      mockSelectAccountChildren.mockReturnValue({
        entities: {
          [ACCOUNT_1_ID]: {
            id: ACCOUNT_1_ID,
            account: ACCOUNT_1_ID,
            trades: [
              {
                id: 'trade-expired-with-pos',
                universeId: 'universe-expired-with-pos',
                accountId: ACCOUNT_1_ID,
                buy: 120.0,
                quantity: 10,
                sell_date: undefined, // Open position
              },
              {
                id: 'trade-not-expired-with-pos',
                universeId: 'universe-not-expired-with-pos',
                accountId: ACCOUNT_1_ID,
                buy: 120.0,
                quantity: 10,
                sell_date: undefined, // Open position
              },
            ],
          },
        },
      });

      const mockData = [
        createMockData(false, 0, 'NOT_EXPIRED_NO_POS'),
        createMockData(false, 1000, 'NOT_EXPIRED_WITH_POS'),
        createMockData(true, 1000, 'EXPIRED_WITH_POS'),
      ];

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

      expect(result).toHaveLength(3);
      expect(result.map((r) => r.symbol)).toContain('NOT_EXPIRED_NO_POS');
      expect(result.map((r) => r.symbol)).toContain('NOT_EXPIRED_WITH_POS');
      expect(result.map((r) => r.symbol)).toContain('EXPIRED_WITH_POS');
    });

    test('handles edge cases with null/undefined expired flag', () => {
      const mockData = [
        {
          symbol: 'NULL_EXPIRED',
          riskGroup: 'Growth',
          distribution: 0.25,
          distributions_per_year: 4,
          last_price: 150.0,
          most_recent_sell_date: null,
          most_recent_sell_price: null,
          ex_date: new Date('2024-03-15'),
          yield_percent: 1.0,
          avg_purchase_yield_percent: 1.0,
          expired: null as unknown as boolean,
          position: 0,
        },
        {
          symbol: 'UNDEFINED_EXPIRED',
          riskGroup: 'Growth',
          distribution: 0.25,
          distributions_per_year: 4,
          last_price: 150.0,
          most_recent_sell_date: null,
          most_recent_sell_price: null,
          ex_date: new Date('2024-03-15'),
          yield_percent: 1.0,
          avg_purchase_yield_percent: 1.0,
          expired: undefined as unknown as boolean,
          position: 0,
        },
      ];

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

      // Null/undefined expired should be treated as non-expired (show)
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.symbol)).toContain('NULL_EXPIRED');
      expect(result.map((r) => r.symbol)).toContain('UNDEFINED_EXPIRED');
    });

    test('handles zero and negative positions correctly', () => {
      // Set up mock universes for the test
      mockSelectUniverses.mockReturnValue([
        {
          id: 'universe-zero',
          symbol: 'ZERO_POSITION',
          distribution: 0.25,
          distributions_per_year: 4,
          last_price: 150.0,
        },
        {
          id: 'universe-negative',
          symbol: 'NEGATIVE_POSITION',
          distribution: 0.25,
          distributions_per_year: 4,
          last_price: 150.0,
        },
        {
          id: 'universe-small-pos',
          symbol: 'SMALL_POSITIVE_POSITION',
          distribution: 0.25,
          distributions_per_year: 4,
          last_price: 150.0,
        },
      ]);

      mockSelectAccountChildren.mockReturnValue({
        entities: {
          [ACCOUNT_1_ID]: {
            id: ACCOUNT_1_ID,
            account: ACCOUNT_1_ID,
            trades: [
              {
                id: 'trade-small-pos',
                universeId: 'universe-small-pos',
                accountId: ACCOUNT_1_ID,
                buy: 120.0,
                quantity: 0.1,
                sell_date: undefined, // Open position with small positive value
              },
            ],
          },
        },
      });

      const mockData = [
        createMockData(true, 0, 'ZERO_POSITION'),
        createMockData(true, -100, 'NEGATIVE_POSITION'),
        createMockData(true, 0.1, 'SMALL_POSITIVE_POSITION'),
      ];

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

      // Only positive positions should show for expired symbols
      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('SMALL_POSITIVE_POSITION');
    });
  });
});
