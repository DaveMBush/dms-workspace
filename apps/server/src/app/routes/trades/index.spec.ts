import { describe, it, expect } from 'vitest';

import { mapTradeToResponse, type TradeWithUniverseAndDates } from './index';

describe('mapTradeToResponse', function () {
  it('should always return symbol as string (not undefined)', function () {
    const trade: TradeWithUniverseAndDates = {
      id: '1',
      universeId: 'uni-1',
      accountId: 'acc-1',
      buy: 100,
      sell: 110,
      buy_date: new Date('2024-01-01'),
      sell_date: null,
      quantity: 10,
      universe: {
        symbol: 'AAPL',
        last_price: 110,
        distribution: 5,
        distributions_per_year: 12,
      },
    };

    const result = mapTradeToResponse(trade);

    expect(result.symbol).toBeTypeOf('string');
    expect(result.symbol).toBe('AAPL');
  });

  it('should return empty string when universe is null', function () {
    const trade: TradeWithUniverseAndDates = {
      id: '2',
      universeId: 'uni-2',
      accountId: 'acc-2',
      buy: 50,
      sell: 60,
      buy_date: new Date('2024-02-01'),
      sell_date: null,
      quantity: 5,
      universe: null,
    };

    const result = mapTradeToResponse(trade);

    expect(result.symbol).toBeTypeOf('string');
    expect(result.symbol).toBe('');
  });

  it('should return empty string when universe.symbol is undefined', function () {
    const trade: TradeWithUniverseAndDates = {
      id: '3',
      universeId: 'uni-3',
      accountId: 'acc-3',
      buy: 75,
      sell: 85,
      buy_date: new Date('2024-03-01'),
      sell_date: null,
      quantity: 15,
      universe: {
        symbol: undefined as unknown as string,
        last_price: 85,
        distribution: 3,
        distributions_per_year: 4,
      },
    };

    const result = mapTradeToResponse(trade);

    expect(result.symbol).toBeTypeOf('string');
    expect(result.symbol).toBe('');
  });

  it('should handle sell_date as Date', function () {
    const trade: TradeWithUniverseAndDates = {
      id: '4',
      universeId: 'uni-4',
      accountId: 'acc-4',
      buy: 200,
      sell: 220,
      buy_date: new Date('2024-04-01'),
      sell_date: new Date('2024-05-01'),
      quantity: 20,
      universe: {
        symbol: 'MSFT',
        last_price: 220,
        distribution: 2,
        distributions_per_year: 4,
      },
    };

    const result = mapTradeToResponse(trade);

    expect(result.symbol).toBeTypeOf('string');
    expect(result.symbol).toBe('MSFT');
    expect(result.sell_date).toBeDefined();
  });

  // --- expected_dollars = quantity × distribution × distributions_per_year ---

  describe('expected_dollars', function () {
    it('should compute expected_dollars as quantity × distribution × distributions_per_year', function () {
      const trade: TradeWithUniverseAndDates = {
        id: '10',
        universeId: 'uni-10',
        accountId: 'acc-10',
        buy: 150,
        sell: 0,
        buy_date: new Date('2024-01-01'),
        sell_date: null,
        quantity: 100,
        universe: {
          symbol: 'DIV',
          last_price: 155,
          distribution: 5,
          distributions_per_year: 2,
        },
      };

      const result = mapTradeToResponse(trade);

      // 100 × 5 × 2 = 1000
      expect(result.expected_dollars).toBe(1000);
    });

    it('should return 0 for expected_dollars when distribution is 0', function () {
      const trade: TradeWithUniverseAndDates = {
        id: '11',
        universeId: 'uni-11',
        accountId: 'acc-11',
        buy: 100,
        sell: 0,
        buy_date: new Date('2024-01-01'),
        sell_date: null,
        quantity: 50,
        universe: {
          symbol: 'NODIV',
          last_price: 105,
          distribution: 0,
          distributions_per_year: 12,
        },
      };

      const result = mapTradeToResponse(trade);

      expect(result.expected_dollars).toBe(0);
    });

    it('should return 0 for expected_dollars when distributions_per_year is 0', function () {
      const trade: TradeWithUniverseAndDates = {
        id: '12',
        universeId: 'uni-12',
        accountId: 'acc-12',
        buy: 100,
        sell: 0,
        buy_date: new Date('2024-01-01'),
        sell_date: null,
        quantity: 50,
        universe: {
          symbol: 'FREQ0',
          last_price: 105,
          distribution: 5,
          distributions_per_year: 0,
        },
      };

      const result = mapTradeToResponse(trade);

      expect(result.expected_dollars).toBe(0);
    });

    it('should return 0 for expected_dollars when universe is null', function () {
      const trade: TradeWithUniverseAndDates = {
        id: '13',
        universeId: 'uni-13',
        accountId: 'acc-13',
        buy: 100,
        sell: 0,
        buy_date: new Date('2024-01-01'),
        sell_date: null,
        quantity: 50,
        universe: null,
      };

      const result = mapTradeToResponse(trade);

      expect(result.expected_dollars).toBe(0);
    });
  });

  // --- last_dollars_unrealized_gain_percent = ((lastPrice - buy) / buy) × 100 ---

  describe('last_dollars_unrealized_gain_percent', function () {
    it('should compute last_dollars_unrealized_gain_percent as ((lastPrice - buy) / buy) × 100', function () {
      const trade: TradeWithUniverseAndDates = {
        id: '20',
        universeId: 'uni-20',
        accountId: 'acc-20',
        buy: 100,
        sell: 0,
        buy_date: new Date('2024-01-01'),
        sell_date: null,
        quantity: 10,
        universe: {
          symbol: 'GAIN',
          last_price: 110,
          distribution: 2,
          distributions_per_year: 4,
        },
      };

      const result = mapTradeToResponse(trade);

      // ((110 - 100) / 100) × 100 = 10
      expect(result.last_dollars_unrealized_gain_percent).toBe(10);
    });

    it('should return 0 for last_dollars_unrealized_gain_percent when last_price is 0', function () {
      const trade: TradeWithUniverseAndDates = {
        id: '21',
        universeId: 'uni-21',
        accountId: 'acc-21',
        buy: 100,
        sell: 0,
        buy_date: new Date('2024-01-01'),
        sell_date: null,
        quantity: 10,
        universe: {
          symbol: 'NOPRICE',
          last_price: 0,
          distribution: 2,
          distributions_per_year: 4,
        },
      };

      const result = mapTradeToResponse(trade);

      expect(result.last_dollars_unrealized_gain_percent).toBe(0);
    });

    it('should return 0 for last_dollars_unrealized_gain_percent when buy is 0 (division-by-zero guard)', function () {
      const trade: TradeWithUniverseAndDates = {
        id: '22',
        universeId: 'uni-22',
        accountId: 'acc-22',
        buy: 0,
        sell: 0,
        buy_date: new Date('2024-01-01'),
        sell_date: null,
        quantity: 10,
        universe: {
          symbol: 'NOBUY',
          last_price: 110,
          distribution: 2,
          distributions_per_year: 4,
        },
      };

      const result = mapTradeToResponse(trade);

      expect(result.last_dollars_unrealized_gain_percent).toBe(0);
    });

    it('should return 0 for last_dollars_unrealized_gain_percent when universe is null', function () {
      const trade: TradeWithUniverseAndDates = {
        id: '23',
        universeId: 'uni-23',
        accountId: 'acc-23',
        buy: 100,
        sell: 0,
        buy_date: new Date('2024-01-01'),
        sell_date: null,
        quantity: 10,
        universe: null,
      };

      const result = mapTradeToResponse(trade);

      expect(result.last_dollars_unrealized_gain_percent).toBe(0);
    });
  });

  // --- unrealized_gain_dollars = (lastPrice - buy) × quantity ---

  describe('unrealized_gain_dollars', function () {
    it('should compute unrealized_gain_dollars as (lastPrice - buy) × quantity', function () {
      const trade: TradeWithUniverseAndDates = {
        id: '30',
        universeId: 'uni-30',
        accountId: 'acc-30',
        buy: 100,
        sell: 0,
        buy_date: new Date('2024-01-01'),
        sell_date: null,
        quantity: 10,
        universe: {
          symbol: 'GAIN2',
          last_price: 110,
          distribution: 2,
          distributions_per_year: 4,
        },
      };

      const result = mapTradeToResponse(trade);

      // (110 - 100) × 10 = 100
      expect(result.unrealized_gain_dollars).toBe(100);
    });

    it('should return 0 for unrealized_gain_dollars when last_price is 0', function () {
      const trade: TradeWithUniverseAndDates = {
        id: '31',
        universeId: 'uni-31',
        accountId: 'acc-31',
        buy: 100,
        sell: 0,
        buy_date: new Date('2024-01-01'),
        sell_date: null,
        quantity: 10,
        universe: {
          symbol: 'NOPRICE2',
          last_price: 0,
          distribution: 2,
          distributions_per_year: 4,
        },
      };

      const result = mapTradeToResponse(trade);

      expect(result.unrealized_gain_dollars).toBe(0);
    });

    it('should return 0 for unrealized_gain_dollars when universe is null', function () {
      const trade: TradeWithUniverseAndDates = {
        id: '32',
        universeId: 'uni-32',
        accountId: 'acc-32',
        buy: 100,
        sell: 0,
        buy_date: new Date('2024-01-01'),
        sell_date: null,
        quantity: 10,
        universe: null,
      };

      const result = mapTradeToResponse(trade);

      expect(result.unrealized_gain_dollars).toBe(0);
    });
  });

  // --- target_gain = quantity × distribution ---

  describe('target_gain', function () {
    it('should compute target_gain as quantity × distribution', function () {
      const trade: TradeWithUniverseAndDates = {
        id: '40',
        universeId: 'uni-40',
        accountId: 'acc-40',
        buy: 150,
        sell: 0,
        buy_date: new Date('2024-01-01'),
        sell_date: null,
        quantity: 100,
        universe: {
          symbol: 'TGT',
          last_price: 155,
          distribution: 5,
          distributions_per_year: 2,
        },
      };

      const result = mapTradeToResponse(trade);

      // 100 × 5 = 500
      expect(result.target_gain).toBe(500);
    });

    it('should return 0 for target_gain when distribution is 0', function () {
      const trade: TradeWithUniverseAndDates = {
        id: '41',
        universeId: 'uni-41',
        accountId: 'acc-41',
        buy: 100,
        sell: 0,
        buy_date: new Date('2024-01-01'),
        sell_date: null,
        quantity: 50,
        universe: {
          symbol: 'NOTGT',
          last_price: 105,
          distribution: 0,
          distributions_per_year: 4,
        },
      };

      const result = mapTradeToResponse(trade);

      expect(result.target_gain).toBe(0);
    });

    it('should return 0 for target_gain when universe is null', function () {
      const trade: TradeWithUniverseAndDates = {
        id: '42',
        universeId: 'uni-42',
        accountId: 'acc-42',
        buy: 100,
        sell: 0,
        buy_date: new Date('2024-01-01'),
        sell_date: null,
        quantity: 50,
        universe: null,
      };

      const result = mapTradeToResponse(trade);

      expect(result.target_gain).toBe(0);
    });
  });
});
