import { getTopChildRows } from '@smarttools/smart-signals';

import { Top } from '../../top/top.interface';
import { Account } from '../account.interface';
import { selectTopAccounts } from './select-top-accounts.function';

export const selectAccounts = getTopChildRows<Top, Account>(
  selectTopAccounts,
  'accounts'
);
