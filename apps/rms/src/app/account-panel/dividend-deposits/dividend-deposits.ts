import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy,Component, computed, inject } from '@angular/core';
import { RowProxyDelete, SmartArray } from '@smarttools/smart-signals';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';

import { Account } from '../../store/accounts/account.interface';
import { currentAccountSignalStore } from '../../store/current-account/current-account.signal-store';
import { selectCurrentAccountSignal } from '../../store/current-account/select-current-account.signal';
import { DivDepositType } from '../../store/div-deposit-types/div-deposit-type.interface';
import { selectDivDepositTypes } from '../../store/div-deposit-types/selectors/select-div-deposit-types.function';
import { DivDeposit } from '../../store/div-deposits/div-deposit.interface';
import { selectUniverses } from '../../store/universe/selectors/select-universes.function';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'rms-dividend-deposits',
  imports: [CommonModule, TableModule, ButtonModule],
  templateUrl: './dividend-deposits.html',
  styleUrl: './dividend-deposits.scss',
})
export class DividendDeposits {
  private currentAccount = inject(currentAccountSignalStore);
  symbolsMap = new Map<string, string>();

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- will hide this
  deposits$ = computed(() => {
    const symbols = selectUniverses();
    for (let i = 0; i < symbols.length; i++) {
      this.symbolsMap.set(symbols[i].id, symbols[i].symbol);
    }

    const divDepositTypes = selectDivDepositTypes();
    const divDepositTypesMap = new Map<string, DivDepositType>();
    for (let i = 0; i < divDepositTypes.length; i++) {
      divDepositTypesMap.set(divDepositTypes[i].id, divDepositTypes[i]);
    }
    const account = selectCurrentAccountSignal(this.currentAccount);
    const act = account();
    const divDeposits = [];
    const divDepositsArray = act.divDeposits as DivDeposit[] & SmartArray<Account, DivDeposit>;
    for (let i = 0; i < divDepositsArray.length; i++) {
      divDeposits.push({
        id: divDepositsArray[i].id,
        date: divDepositsArray[i].date,
        amount: divDepositsArray[i].amount,
        divDeposit: divDepositTypesMap.get(divDepositsArray[i].divDepositTypeId)?.name,
        symbol: this.symbolsMap.get(divDepositsArray[i].universeId),
      });
    }
    return divDeposits;
  });

  deleteDeposit(row: DivDeposit): void {
    const account = selectCurrentAccountSignal(this.currentAccount);
    const act = account();
    const divDepositsArray = act.divDeposits as DivDeposit[] & SmartArray<Account, DivDeposit>;
    for (let i = 0; i < divDepositsArray.length; i++) {
      const divDeposit = divDepositsArray[i] as DivDeposit & RowProxyDelete;
      if (divDeposit.id === row.id) {
        divDeposit.delete!();
        break;
      }
    }
  }

  trackById(index: number, row: DivDeposit): string {
    return row.id;
  }
}
