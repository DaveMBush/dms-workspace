import { createSmartSignal, getTopChildRows } from '@smarttools/smart-signals';

import { Account } from '../accounts/account.interface';
import { selectAccountsEntity } from '../accounts/account.selectors';
import { DivDeposit } from '../div-deposits/div-deposit.interface';
import { selectDivDepositEntity } from '../div-deposits/div-deposits.selectors';
import { Trade } from './trade.interface';

export const selectTradesEntity = createSmartSignal<Trade>(
  'app',
  'trades'
);

export const selectAccountChildren = createSmartSignal<Account, DivDeposit | Trade>(selectAccountsEntity, [
  {
    childFeature: 'app',
    childEntity: 'trades',
    parentField: 'trades',
    parentFeature: 'app',
    parentEntity: 'accounts',
    childSelector: selectTradesEntity,
  },
  {
    childFeature: 'app',
    childEntity: 'divDeposits',
    parentField: 'divDeposits',
    parentFeature: 'app',
    parentEntity: 'accounts',
    childSelector: selectDivDepositEntity,
  }
]);

export const selectTrades = getTopChildRows<Account, Trade>(
  selectAccountChildren,
  'trades'
);
