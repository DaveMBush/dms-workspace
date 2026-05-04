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
      },
    };

    const result = mapTradeToResponse(trade);

    expect(result.symbol).toBeTypeOf('string');
    expect(result.symbol).toBe('MSFT');
    expect(result.sell_date).toBeDefined();
  });
});
