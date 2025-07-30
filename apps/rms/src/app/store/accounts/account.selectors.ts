import { createSmartSignal, getTopChildRows } from '@smarttools/smart-signals';

import { Top } from '../top/top.interface';
import { selectTopEntities } from '../top/top.selectors';
import { Account } from './account.interface';

export const selectAccountsEntity = createSmartSignal<Account>(
  'app',
  'accounts'
);

export const selectTopAccounts = createSmartSignal(selectTopEntities, [
  {
    childFeature: 'app',
    childEntity: 'accounts',
    parentField: 'accounts',
    parentFeature: 'app',
    parentEntity: 'top',
    childSelector: selectAccountsEntity,
  },
]);

export const selectAccounts = getTopChildRows<Top, Account>(
  selectTopAccounts,
  'accounts'
);

