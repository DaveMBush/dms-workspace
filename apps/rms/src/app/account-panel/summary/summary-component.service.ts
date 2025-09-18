import { httpResource } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';

import {
  createGraphComputed,
  createSelectedMonthSignal,
  createSummaryComputed,
} from '../../shared/base-summary-component.service';
import { currentAccountSignalStore } from '../../store/current-account/current-account.signal-store';
import { selectCurrentAccountSignal } from '../../store/current-account/select-current-account.signal';
import { Graph } from './graph.interface';
import { Summary } from './summary.interface';

@Injectable()
export class SummaryComponentService {
  currentAccount = inject(currentAccountSignalStore);
  selectedMonth = createSelectedMonthSignal();
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- can't get at this otherwise
  httpSummary = httpResource<Summary>(() => {
    const currentAccount = selectCurrentAccountSignal(this.currentAccount);
    const month = this.selectedMonth() ?? '';
    const accountId = currentAccount()?.id ?? '';
    if (!month || !accountId) {
      return undefined;
    }
    return {
      url: '/api/summary',
      params: {
        month,
        account_id: accountId,
      },
    };
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- can't get at this otherwise
  httpGraph = httpResource<Graph[]>(() => {
    const currentAccount = selectCurrentAccountSignal(this.currentAccount);
    const year = new Date().getFullYear();
    const accountId = currentAccount()?.id ?? '';
    return {
      url: '/api/summary/graph',
      params: {
        year,
        account_id: accountId,
        time_period: 'year',
      },
    };
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- can't get at this otherwise
  months = computed(() => {
    const currentAccount = selectCurrentAccountSignal(this.currentAccount);
    const account = currentAccount();
    return account.months.map(function accountMonthsMap(month) {
      return {
        label: `${month.month}/${month.year}`,
        value: `${month.year}-${month.month}`,
      };
    });
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  summary = createSummaryComputed(computed(() => this.httpSummary));
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  graph = createGraphComputed(computed(() => this.httpGraph));
}
