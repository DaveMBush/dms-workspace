import { HttpClient, HttpParams, httpResource } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { currentAccountSignalStore } from '../../store/current-account/current-account.signal-store';
import { selectCurrentAccountSignal } from '../../store/current-account/select-current-account.signal';
import { Summary } from './summary.interface';

@Injectable()
export class SummaryComponentService {
  currentAccount = inject(currentAccountSignalStore)
  selectedMonth = signal<string | null>(null);
  httpSummary = httpResource<Summary>(() => {
    const currentAccount = selectCurrentAccountSignal(this.currentAccount);
    const month = this.selectedMonth() ?? '';
    const accountId = currentAccount()?.id ?? '';
    if (!month || !accountId) {
      return undefined;
    }
    return {
      url: 'http://localhost:4200/api/summary',
      params: {
        month,
        account_id: accountId,
      }
    };
  });

  months = computed(() => {
    const currentAccount = selectCurrentAccountSignal(this.currentAccount);
    return currentAccount().months.map((month) => ({label: `${month.month}/${month.year}`, value: `${month.year}-${month.month}`}));
  })

  summary = computed(() => {
    const currentAccount = selectCurrentAccountSignal(this.currentAccount);
    if (!this.selectedMonth() || !currentAccount()) {
      return {
        deposits: 0,
        dividends: 0,
        capitalGains: 0,
        equities: 0,
        income: 0,
        tax_free_income: 0,
      };
    }
    return this.httpSummary.value();
  });

}
