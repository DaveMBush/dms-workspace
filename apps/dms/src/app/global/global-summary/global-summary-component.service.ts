import { httpResource } from '@angular/common/http';
import { computed, Injectable } from '@angular/core';

import { Graph } from '../../account-panel/summary/graph.interface';
import { Summary } from '../../account-panel/summary/summary.interface';
import {
  createGraphComputed,
  createSelectedMonthSignal,
  createSummaryComputed,
} from '../../shared/base-summary-component.service';

interface AvailableMonth {
  month: string;
  label: string;
}

@Injectable()
export class GlobalSummaryComponentService {
  selectedMonth = createSelectedMonthSignal();

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- can't get at this otherwise
  httpSummary = httpResource<Summary>(() => {
    const month = this.selectedMonth() ?? '';
    if (!month) {
      return undefined;
    }
    return {
      url: '/api/summary',
      params: {
        month,
        // No account_id means global data
      },
    };
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- can't get at this otherwise
  httpGraph = httpResource<Graph[]>(() => {
    const year = new Date().getFullYear();
    return {
      url: '/api/summary/graph',
      params: {
        year,
        time_period: 'year',
        // No account_id means global data
      },
    };
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- can't get at this otherwise
  httpAvailableMonths = httpResource<AvailableMonth[]>(() => {
    return {
      url: '/api/summary/months',
    };
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- can't get at this otherwise
  months = computed(() => {
    const httpValue = this.httpAvailableMonths.value();
    if (httpValue === undefined && this.httpAvailableMonths.isLoading()) {
      return [];
    }
    return (httpValue || []).map(function mapMonth(month) {
      return { label: month.label, value: month.month };
    });
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  summary = createSummaryComputed(computed(() => this.httpSummary));
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  graph = createGraphComputed(computed(() => this.httpGraph));
}
