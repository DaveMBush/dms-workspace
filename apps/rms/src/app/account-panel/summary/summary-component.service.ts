import { httpResource } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';

import { currentAccountSignalStore } from '../../store/current-account/current-account.signal-store';
import { selectCurrentAccountSignal } from '../../store/current-account/select-current-account.signal';
import { Graph } from './graph.interface';
import { Summary } from './summary.interface';

@Injectable()
export class SummaryComponentService {
  currentAccount = inject(currentAccountSignalStore)
  selectedMonth = signal<string | null>(null);
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- can't get at this otherwise
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

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- can't get at this otherwise
  httpGraph = httpResource<Graph[]>(() => {
    const currentAccount = selectCurrentAccountSignal(this.currentAccount);
    const year = (new Date()).getFullYear();
    const accountId = currentAccount()?.id ?? '';
    return {
      url: 'http://localhost:4200/api/summary/graph',
      params: {
        year,
        account_id: accountId,
        time_period: 'year',
      }
    };
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- can't get at this otherwise
  months = computed(() => {
    const currentAccount = selectCurrentAccountSignal(this.currentAccount);
    const account = currentAccount();
    return account.months.map(function accountMonthsMap(month) {
      return { label: `${month.month}/${month.year}`, value: `${month.year}-${month.month}` };
    });
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  summary = computed((): Summary => {
    const httpValue = this.httpSummary.value();
    // Return default value if new data is loading to prevent flash
    if (httpValue === undefined && this.httpSummary.isLoading()) {
      return {
        deposits: 0,
        dividends: 0,
        capitalGains: 0,
        equities: 0,
        income: 0,
        tax_free_income: 0,
      };
    }
    return httpValue || {
      deposits: 0,
      dividends: 0,
      capitalGains: 0,
      equities: 0,
      income: 0,
      tax_free_income: 0,
    };
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  graph = computed((): Graph[] => {
    const httpValue = this.httpGraph.value();
    // Return empty array if new data is loading to prevent flash
    if (httpValue === undefined && this.httpGraph.isLoading()) {
      return [];
    }
    return httpValue || [];
  });

}
