import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { currentAccountSignalStore } from '../../store/current-account/current-account.signal-store';
import { selectCurrentAccountSignal } from '../../store/current-account/select-current-account.signal';

@Injectable()
export class SummaryComponentService {
  httpClient = inject(HttpClient);
  currentAccount = inject(currentAccountSignalStore)

  months = computed(() => {
    const currentAccount = selectCurrentAccountSignal(this.currentAccount);
    return currentAccount().months.map((month) => ({label: `${month.month}/${month.year}`, value: `${month.year}-${month.month}`}));
  })

}
