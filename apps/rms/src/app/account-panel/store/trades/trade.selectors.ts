import { createSmartSignal, getTopChildRows } from '@smarttools/smart-signals';
import { Account } from '../../../accounts/store/accounts/account.interface';
import { Trade } from './trade.interface';
import { selectAccountsEntity } from '../../../accounts/store/accounts/account.selectors';

export const selectTradesEntity = createSmartSignal<Trade>(
  'app',
  'trades'
);

export const selectAccountTrades = createSmartSignal(selectAccountsEntity, [
  {
    childFeature: 'app',
    childEntity: 'trades',
    parentField: 'trades',
    parentFeature: 'app',
    parentEntity: 'accounts',
    childSelector: selectTradesEntity,
  },
]);

export const selectTrades = getTopChildRows<Account, Trade>(
  selectAccountTrades,
  'trades'
);
