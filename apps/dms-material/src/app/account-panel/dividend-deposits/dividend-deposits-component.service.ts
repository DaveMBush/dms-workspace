import { computed, inject, Injectable } from '@angular/core';
import { SmartArray } from '@smarttools/smart-signals';

import { buildUniverseMap } from '../../shared/build-universe-map.function';
import { Account } from '../../store/accounts/account.interface';
import { currentAccountSignalStore } from '../../store/current-account/current-account.signal-store';
import { selectCurrentAccountSignal } from '../../store/current-account/select-current-account.signal';
import { selectDivDepositTypes } from '../../store/div-deposit-types/selectors/select-div-deposit-types.function';
import { DivDeposit } from '../../store/div-deposits/div-deposit.interface';

@Injectable({ providedIn: 'root' })
export class DividendDepositsComponentService {
  private currentAccountStore = inject(currentAccountSignalStore);
  private currentAccount = selectCurrentAccountSignal(this.currentAccountStore);

  readonly selectedAccountId = this.currentAccountStore.selectCurrentAccountId;

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- computed signal
  readonly dividends = computed(() => {
    // Access SmartArray directly to trigger SmartNgRX loading of div-deposit entities
    const divDepositsArray = this.currentAccount().divDeposits as DivDeposit[];
    // Resolve universe symbols and type names via entity lookups
    const universeMap = buildUniverseMap();
    const typesList = selectDivDepositTypes();
    const typeNamesMap = new Map<string, string>();
    for (let ti = 0; ti < typesList.length; ti++) {
      typeNamesMap.set(typesList[ti].id, typesList[ti].name);
    }
    const result = [];
    for (let i = 0; i < divDepositsArray.length; i++) {
      const d = divDepositsArray[i];
      result.push({
        id: d.id,
        date: d.date,
        amount: d.amount,
        accountId: d.accountId,
        divDepositTypeId: d.divDepositTypeId,
        universeId: d.universeId,
        symbol:
          d.universeId !== null
            ? universeMap.get(d.universeId)?.symbol ?? ''
            : '',
        type: typeNamesMap.get(d.divDepositTypeId) ?? '',
      });
    }
    return result;
  });

  addDivDeposit(dividend: Partial<DivDeposit>): void {
    const account = this.currentAccount();
    const divDepositsArray = account.divDeposits as SmartArray<
      Account,
      DivDeposit
    >;
    divDepositsArray.add!(
      {
        id: 'new',
        date: dividend.date ?? new Date(),
        amount: Number(dividend.amount ?? 0),
        accountId: account.id,
        divDepositTypeId: dividend.divDepositTypeId ?? '',
        universeId: dividend.universeId ?? null,
      },
      account
    );
  }
}
