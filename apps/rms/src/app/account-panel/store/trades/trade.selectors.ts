import { createSmartSignal, getTopChildRows } from '@smarttools/smart-signals';
import { Top } from '../../../store/top/top.interface';
import { Trade } from './trade.interface';
import { selectTopEntities } from '../../../store/top/top.selectors';

export const selectTradesEntity = createSmartSignal<Trade>(
  'app',
  'trades'
);

export const selectTopTrades = createSmartSignal(selectTopEntities, [
  {
    childFeature: 'app',
    childEntity: 'trades',
    parentField: 'trades',
    parentFeature: 'app',
    parentEntity: 'top',
    childSelector: selectTradesEntity,
  },
]);

export const selectTrades = getTopChildRows<Top, Trade>(
  selectTopTrades,
  'trades'
);
