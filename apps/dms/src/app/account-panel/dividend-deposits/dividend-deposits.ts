import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { RowProxyDelete, SmartArray } from '@smarttools/smart-signals';
import { ButtonModule } from 'primeng/button';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';

import { Account } from '../../store/accounts/account.interface';
import { currentAccountSignalStore } from '../../store/current-account/current-account.signal-store';
import { selectCurrentAccountSignal } from '../../store/current-account/select-current-account.signal';
import { DivDepositType } from '../../store/div-deposit-types/div-deposit-type.interface';
import { selectDivDepositTypes } from '../../store/div-deposit-types/selectors/select-div-deposit-types.function';
import { DivDeposit } from '../../store/div-deposits/div-deposit.interface';
import { selectUniverses } from '../../store/universe/selectors/select-universes.function';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dms-dividend-deposits',
  imports: [CommonModule, TableModule, ButtonModule],
  templateUrl: './dividend-deposits.html',
  styleUrl: './dividend-deposits.scss',
})
export class DividendDeposits {
  private currentEvent = { first: 0, last: 0, rows: 0 };
  private currentAccount = inject(currentAccountSignalStore);
  rows = 0;

  divDepositTypesMap$ = computed(function divDepositTypesMapFunction() {
    const divDepositTypes = selectDivDepositTypes();
    const divDepositTypesMap = new Map<string, DivDepositType>();
    for (let i = 0; i < divDepositTypes.length; i++) {
      divDepositTypesMap.set(divDepositTypes[i].id, divDepositTypes[i]);
    }
    return divDepositTypesMap;
  });

  symbolsMap$ = computed(function symbolsMapFunction() {
    const symbols = selectUniverses();
    const symbolsMap = new Map<string, string>();
    for (let i = 0; i < symbols.length; i++) {
      symbolsMap.set(symbols[i].id, symbols[i].symbol);
    }
    return symbolsMap;
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- will hide this
  deposits$ = computed(() => {
    const divDepositsTypesMap = this.divDepositTypesMap$();
    const symbolsMap = this.symbolsMap$();
    const account = selectCurrentAccountSignal(this.currentAccount);
    const act = account();
    const divDeposits = [];
    const divDepositsArray = act.divDeposits as DivDeposit[] &
      SmartArray<Account, DivDeposit>;
    divDeposits.length = this.currentEvent.first;
    for (let i = this.currentEvent.first; i < this.currentEvent.last; i++) {
      divDeposits.push({
        id: divDepositsArray[i].id,
        date: divDepositsArray[i].date,
        amount: divDepositsArray[i].amount,
        divDeposit: divDepositsTypesMap.get(
          divDepositsArray[i].divDepositTypeId
        )?.name,
        symbol: symbolsMap.get(divDepositsArray[i].universeId),
      });
    }
    this.rows = divDepositsArray.length;
    divDeposits.length = this.rows;
    return divDeposits;
  });

  loadDepositsLazy(event: TableLazyLoadEvent): void {
    this.currentEvent = event as { first: number; last: number; rows: number };
  }

  deleteDeposit(row: DivDeposit): void {
    const account = selectCurrentAccountSignal(this.currentAccount);
    const act = account();
    const divDepositsArray = act.divDeposits as DivDeposit[] &
      SmartArray<Account, DivDeposit>;
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
