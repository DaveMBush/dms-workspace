import { SmartEntityDefinition } from '@smarttools/smart-signals';

import { Trade } from './trade.interface';
import { tradeEffectsServiceToken } from './trade-effect-service-token';

export const tradesDefinition: SmartEntityDefinition<Trade> = {
  entityName: 'trades',
  effectServiceToken: tradeEffectsServiceToken,
  defaultRow: function standardTradesDefaultRowFunction(id) {
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
