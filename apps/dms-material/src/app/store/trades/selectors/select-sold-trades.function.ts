import { getTopChildRows } from '@smarttools/smart-signals';

import { Account } from '../../accounts/account.interface';
import { Trade } from '../trade.interface';
import { selectAccountChildren } from './select-account-children.function';

export const selectSoldTrades = getTopChildRows<Account, Trade>(
  selectAccountChildren,
  'soldTrades'
);
