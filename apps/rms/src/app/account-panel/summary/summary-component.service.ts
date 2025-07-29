import { HttpClient, HttpParams, httpResource } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { currentAccountSignalStore } from '../../store/current-account/current-account.signal-store';
import { selectCurrentAccountSignal } from '../../store/current-account/select-current-account.signal';
import { Summary } from './summary.interface';
import { Graph } from './graph.interface';

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
    const httpValue = this.httpSummary.value();
    // Return previous value if new data is loading to prevent flash
    if (httpValue === undefined && this.httpSummary.loading()) {
      return this.summary() || {
        deposits: 0,
        dividends: 0,
        capitalGains: 0,
        equities: 0,
        income: 0,
        tax_free_income: 0,
      };
    }
    return httpValue;
  });

  graph = computed(() => {
    const currentAccount = selectCurrentAccountSignal(this.currentAccount);
    if (!this.selectedMonth() || !currentAccount()) {
      return [];
    }
    const httpValue = this.httpGraph.value();
    // Return previous value if new data is loading to prevent flash
    if (httpValue === undefined && this.httpGraph.loading()) {
      return this.graph() || [];
    }
    return httpValue;
  });

}
