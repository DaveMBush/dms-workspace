import { createSmartSignal } from '@smarttools/smart-signals';

import { Trade } from '../trade.interface';

export const selectOpenTradeEntity = createSmartSignal<Trade>(
  'app',
  'openTrades'
);
