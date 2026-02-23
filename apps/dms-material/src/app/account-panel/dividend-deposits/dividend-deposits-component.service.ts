import { computed, inject, Injectable } from '@angular/core';

import { currentAccountSignalStore } from '../../store/current-account/current-account.signal-store';
import { DivDeposit } from '../../store/div-deposits/div-deposit.interface';
import { selectDivDepositEntity } from '../../store/div-deposits/div-deposits.selectors';

@Injectable({ providedIn: 'root' })
export class DividendDepositsComponentService {
  private currentAccountStore = inject(currentAccountSignalStore);

  readonly selectedAccountId = this.currentAccountStore.selectCurrentAccountId;

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- computed signal
  readonly dividends = computed(() => {
    const entities = selectDivDepositEntity();
    const accountId = this.selectedAccountId();
    if (!accountId) {
      return Object.values(entities) as DivDeposit[];
    }
    return (Object.values(entities) as DivDeposit[]).filter(
      function filterByAccount(d: DivDeposit): boolean {
        return d.accountId === accountId;
      }
    );
  });
}
