import { computed, Signal } from '@angular/core';

import { Account } from '../accounts/account.interface';
import { selectAccountChildren } from '../trades/trade.selectors';
import { currentAccountSignalStore } from './current-account.signal-store';


// Define the store instance type to properly type the parameter
type CurrentAccountStore = InstanceType<typeof currentAccountSignalStore>;

export function selectCurrentAccountSignal(
  store: CurrentAccountStore,
): Signal<Account> {
  return computed(function selectCurrentAccount() {
    const currentAccountId = store.selectCurrentAccountId();

    const accountsState = selectAccountChildren();
    const account = accountsState.entities[currentAccountId];

    if (account) {
      // The departments array should automatically handle its child signals
      const trades = account.trades;
      const divDeposits = account.divDeposits;
      return {
        ...account,
        trades,
        divDeposits,
        months: account.months,
      };
    }

    return {
      id: '',
      name: '',
      trades: [],
      divDeposits: [],
      months: [],
    };
  });
}
