import { SmartEntityDefinition } from '@smarttools/smart-signals';

import { Trade } from './trade.interface';
import { tradeEffectsServiceToken } from './trade-effect-service-token';

export const soldTradesDefinition: SmartEntityDefinition<Trade> = {
  entityName: 'soldTrades',
  effectServiceToken: tradeEffectsServiceToken,
  defaultRow: function soldTradesDefaultRowFunction(id) {
    return {
      id,
      universeId: '',
      accountId: '',
      buy: 0,
      sell: 0,
      buy_date: '',
      sell_date: undefined,
      quantity: 0,
    };
  },
};
