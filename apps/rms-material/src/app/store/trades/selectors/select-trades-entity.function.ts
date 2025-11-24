import { createSmartSignal } from '@smarttools/smart-signals';

import { Trade } from '../trade.interface';

export const selectTradesEntity = createSmartSignal<Trade>('app', 'trades');
