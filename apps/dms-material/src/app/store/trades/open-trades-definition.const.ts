import { SmartEntityDefinition } from '@smarttools/smart-signals';

import { Trade } from './trade.interface';
import { tradeEffectsServiceToken } from './trade-effect-service-token';

export const openTradesDefinition: SmartEntityDefinition<Trade> = {
  entityName: 'openTrades',
  effectServiceToken: tradeEffectsServiceToken,
  defaultRow: function openTradesDefaultRowFunction(id) {
    return {
      id,
      universeId: '',
      accountId: '',
      symbol: '',
      buy: 0,
      sell: 0,
      buy_date: '',
      sell_date: undefined,
      quantity: 0,
      expected_dollars: 0,
      last_dollars_unrealized_gain_percent: 0,
      unrealized_gain_dollars: 0,
      target_gain: 0,
      target_sell: 0,
    };
  },
};
