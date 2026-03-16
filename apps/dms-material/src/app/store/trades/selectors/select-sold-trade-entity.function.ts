import { createSmartSignal } from '@smarttools/smart-signals';

import { Trade } from '../trade.interface';

export const selectSoldTradeEntity = createSmartSignal<Trade>(
  'app',
  'soldTrades'
);
