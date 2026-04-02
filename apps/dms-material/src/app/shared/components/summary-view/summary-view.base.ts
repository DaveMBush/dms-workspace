import { computed, DestroyRef, effect, inject } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ChartData } from 'chart.js';

import { SummaryService } from '../../../global/services/summary.service';
import { buildAllocationChartData } from '../../utils/build-allocation-chart-data.function';
import { buildPerformanceChartData } from '../../utils/build-performance-chart-data.function';
import { computePercentIncrease } from '../../utils/compute-percent-increase.function';
import { defaultPieChartOptions } from '../../utils/default-pie-chart-options.const';
import { getCurrentMonth } from './get-current-month.function';

/**
 * Base class for the unified summary component.
 * Holds all shared computed signals, form controls, and template bindings.
 */
export class SummaryViewBase {
  mode: 'account' | 'global' = 'global';

  protected readonly summaryService = inject(SummaryService);
  protected readonly destroyRef = inject(DestroyRef);

  readonly selectedMonth = new FormControl(getCurrentMonth());
  readonly selectedYear = new FormControl(new Date().getFullYear());

  /* eslint-disable @smarttools/no-anonymous-functions -- computed signals need service access */
  readonly monthOptions$ = computed(() => {
    return this.mode === 'account'
      ? this.summaryService.accountMonths()
      : this.summaryService.months();
  });

  readonly yearOptions$ = computed(() => this.summaryService.years());

  readonly allocationChartData = computed((): ChartData<'pie'> => {
    return buildAllocationChartData(this.summaryService.summary());
  });

  readonly hasAllocationData$ = computed(() => {
    const data = this.allocationChartData();
    return data.datasets[0].data.some(function isNonZero(v: unknown): boolean {
      return (v as number) !== 0;
    });
  });

  readonly performanceChartData = computed((): ChartData<'line'> => {
    return buildPerformanceChartData(this.summaryService.graph());
  });

  readonly basis$ = computed(() => this.summaryService.summary().deposits);

  readonly capitalGain$ = computed(
    () => this.summaryService.summary().capitalGains
  );

  readonly dividends$ = computed(() => this.summaryService.summary().dividends);

  readonly percentIncrease$ = computed(() => {
    return computePercentIncrease(
      this.basis$(),
      this.capitalGain$(),
      this.dividends$()
    );
  });
  /* eslint-enable @smarttools/no-anonymous-functions -- end computed signals block */

  readonly pieChartOptions = defaultPieChartOptions;

  readonly loading$ = this.summaryService.loading;
  readonly loading = this.loading$;
  readonly error$ = this.summaryService.error;
  readonly error = this.error$;

  get containerTestId(): string {
    return this.mode === 'global'
      ? 'global-summary-container'
      : 'account-summary-container';
  }

  get title(): string {
    return this.mode === 'global' ? 'Global Summary' : 'Account Summary';
  }

  get labelClass(): string {
    return this.mode === 'global' ? 'text-gray-600' : 'text-gray-500';
  }

  get allocationData(): ChartData<'pie'> {
    return this.allocationChartData();
  }

  get performanceData(): ChartData<'line'> {
    return this.performanceChartData();
  }

  constructor() {
    // Auto-select first available month when months load
    effect(
      // eslint-disable-next-line @smarttools/no-anonymous-functions -- Required for effect
      () => {
        const months = this.monthOptions$();
        if (months.length > 0) {
          this.selectedMonth.setValue(months[0].value);
        }
      }
    );

    // Auto-select most recent available year when years load
    effect(
      // eslint-disable-next-line @smarttools/no-anonymous-functions -- Required for effect
      () => {
        const years = this.summaryService.years();
        if (years.length > 0) {
          const currentValue = this.selectedYear.value;
          if (currentValue === null || !years.includes(currentValue)) {
            this.selectedYear.setValue(years[0]);
          }
        }
      }
    );
  }

  protected enableSelectors(): void {
    this.selectedMonth.enable({ emitEvent: false });
    if (this.mode === 'account') {
      this.selectedYear.enable({ emitEvent: false });
    }
  }
}
