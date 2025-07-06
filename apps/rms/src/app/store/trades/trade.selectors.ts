import { createSmartSignal, getTopChildRows } from '@smarttools/smart-signals';
import { Account } from '../accounts/account.interface';
import { Trade } from './trade.interface';
import { selectAccountsEntity } from '../accounts/account.selectors';
import { computed, inject } from '@angular/core';
import { selectUniverses } from '../universe/universe.selectors';
import { OpenPosition } from './open-position.interface';
import { ClosedPosition } from './closed-position.interface';
import { Universe } from '../universe/universe.interface';
import { currentAccountSignalStore } from '../current-account/current-account.signal-store';
import { selectCurrentAccountSignal } from '../current-account/select-current-account.signal';
import { differenceInTradingDays } from './difference-in-trading-days.function';

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
