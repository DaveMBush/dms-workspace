import { createSmartSignal, getTopChildRows } from '@smarttools/smart-signals';
import { Top } from '../../../store/top/top.interface';
import { Account } from './account.interface';
import { selectTopEntities } from '../../../store/top/top.selectors';

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

