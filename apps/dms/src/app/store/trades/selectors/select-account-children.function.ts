import { createSmartSignal } from '@smarttools/smart-signals';

import { Account } from '../../accounts/account.interface';
import { selectAccountsEntity } from '../../accounts/selectors/select-accounts-entity.function';
import { DivDeposit } from '../../div-deposits/div-deposit.interface';
import { selectDivDepositEntity } from '../../div-deposits/div-deposits.selectors';
import { Trade } from '../trade.interface';
import { selectTradesEntity } from './select-trades-entity.function';

export const selectAccountChildren = createSmartSignal<
  Account,
  DivDeposit | Trade
>(selectAccountsEntity, [
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
  },
]);
