import { createSmartSignal } from '@smarttools/smart-signals';

import { Account } from '../../accounts/account.interface';
import { selectAccountsEntity } from '../../accounts/selectors/select-accounts-entity.function';
import { DivDeposit } from '../../div-deposits/div-deposit.interface';
import { selectDivDepositEntity } from '../../div-deposits/div-deposits.selectors';
import { Trade } from '../trade.interface';
import { selectOpenTradeEntity } from './select-open-trade-entity.function';
import { selectSoldTradeEntity } from './select-sold-trade-entity.function';

export const selectAccountChildren = createSmartSignal<
  Account,
  DivDeposit | Trade
>(selectAccountsEntity, [
  {
    childFeature: 'app',
    childEntity: 'openTrades',
    parentField: 'openTrades',
    parentFeature: 'app',
    parentEntity: 'accounts',
    childSelector: selectOpenTradeEntity,
  },
  {
    childFeature: 'app',
    childEntity: 'soldTrades',
    parentField: 'soldTrades',
    parentFeature: 'app',
    parentEntity: 'accounts',
    childSelector: selectSoldTradeEntity,
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
