import { computed, effect, Signal, WritableSignal } from '@angular/core';

import {
  createCompositionChartData,
  createCompositionOptions,
  createEmptyCompositionData,
  createEmptyLineChartData,
  createLineChartData,
  createLineChartOptions,
} from './chart-utils.function';

interface SummaryData {
  equities: number;
  income: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention -- matches server API
  tax_free_income: number;
}

interface MonthOption {
  value: string | null;
}

interface GraphData {
  month: string;
  deposits: number;
  capitalGains: number;
  dividends: number;
}

export abstract class BaseSummaryComponent {
  abstract summary$: Signal<SummaryData>;
  abstract selectedMonth: WritableSignal<string | null>;
  abstract months$: Signal<MonthOption[]>;
  abstract getGraph(): GraphData[];

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  compositionData$ = computed(() => {
    const s = this.summary$();
    const { equities, income, tax_free_income } = s;
    return createCompositionChartData(equities, income, tax_free_income);
  });

  private emptyCompositionData = createEmptyCompositionData();
  compositionOptions = createCompositionOptions();

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  lineChartData$ = computed(() => {
    const graphData = this.getGraph();
    return createLineChartData(graphData);
  });

  private emptyLineChartData = createEmptyLineChartData();
  lineChartOptions = createLineChartOptions();

  constructor() {
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
    effect(() => {
      const months = this.months$();
      if (months.length > 0) {
        this.selectedMonth.set(months[0].value);
      } else {
        this.selectedMonth.set(null);
      }
    });
  }
}
