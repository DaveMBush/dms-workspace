import { httpResource } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';

import { Graph } from '../../account-panel/summary/graph.interface';
import { Summary } from '../../account-panel/summary/summary.interface';

interface AvailableMonth {
  month: string;
  label: string;
}

@Injectable()
export class GlobalSummaryComponentService {
  selectedMonth = signal<string | null>(null);

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- can't get at this otherwise
  httpSummary = httpResource<Summary>(() => {
    const month = this.selectedMonth() ?? '';
    if (!month) {
      return undefined;
    }
    return {
      url: 'http://localhost:4200/api/summary',
      params: {
        month,
        // No account_id means global data
      }
    };
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- can't get at this otherwise
  httpGraph = httpResource<Graph[]>(() => {
    const year = (new Date()).getFullYear();
    return {
      url: 'http://localhost:4200/api/summary/graph',
      params: {
        year,
        time_period: 'year',
        // No account_id means global data
      }
    };
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- can't get at this otherwise
  httpAvailableMonths = httpResource<AvailableMonth[]>(() => {
    return {
      url: 'http://localhost:4200/api/summary/months',
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
