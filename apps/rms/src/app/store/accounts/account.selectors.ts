import { createSmartSignal, getTopChildRows } from '@smarttools/smart-signals';
import { Top } from '../top/top.interface';
import { Account } from './account.interface';
import { selectTopEntities } from '../top/top.selectors';
import { computed } from '@angular/core';

export const selectAccounts = getTopChildRows<Top, Account>(
  selectTopEntities,
  'accounts'
);

export const selectAccountsEntity = computed(() => {
  const accounts = selectAccounts();
  return {
    ids: accounts.map((account) => account.id),
    entities: accounts.reduce((acc, account) => {
      acc[account.id] = account;
      return acc;
    }, {} as Record<string, Account>),
  };
 });

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
