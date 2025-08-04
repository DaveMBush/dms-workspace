import { createSmartSignal } from '@smarttools/smart-signals';

import { Account } from '../account.interface';

export const selectAccountsEntity = createSmartSignal<Account>(
  'app',
  'accounts'
);
