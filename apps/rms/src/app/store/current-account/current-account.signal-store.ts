import { computed } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';

import { selectAccounts } from '../accounts/selectors/select-accounts.function';
import { CurrentAccount } from './current-account.interface';


export const currentAccountSignalStore = signalStore(
  { providedIn: 'root' },
  withState({
    id: '',
  } as CurrentAccount),
  withMethods(function withMethodsFunction(store) {
    return {
      setCurrentAccountId: function setCurrentAccountId(
        id: string,
      ): void {
        patchState(store, function setCurrentAccountIdPatch(state) {
          return { ...state, id };
        });
      },
    };
  }),
  withComputed(function computedFunction({ id }) {
    const accountsSignal = selectAccounts();

    return {
      selectCurrentAccountId: computed(
        function selectCurrentAccountIdComputedFunction(): string {
          const accounts = accountsSignal;
          if (id().length > 0) {
            return id();
          }
          if (accounts.length > 0 && typeof accounts[0] === 'object') {
            return accounts[0].id;
          }
          return '';
        },
      ),
    };
  }),
);
