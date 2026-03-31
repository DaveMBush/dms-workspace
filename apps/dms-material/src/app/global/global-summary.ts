import { CurrencyPipe, PercentPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatOptionModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { ChartData } from 'chart.js';

import { AllocationChartComponent } from '../shared/components/allocation-chart/allocation-chart';
import { PerformanceChartComponent } from '../shared/components/performance-chart/performance-chart';
import { buildAllocationChartData } from '../shared/utils/build-allocation-chart-data.function';
import { buildPerformanceChartData } from '../shared/utils/build-performance-chart-data.function';
import { computePercentIncrease } from '../shared/utils/compute-percent-increase.function';
import { defaultPieChartOptions } from '../shared/utils/default-pie-chart-options.const';
import { SummaryService } from './services/summary.service';

function enableMonthSelector(this: GlobalSummaryComponent): void {
  this.selectedMonth.enable({ emitEvent: false });
}

@Component({
  selector: 'dms-global-summary',
  imports: [
    AllocationChartComponent,
    CurrencyPipe,
    MatCardModule,
    MatOptionModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    PercentPipe,
    PerformanceChartComponent,
    ReactiveFormsModule,
  ],
  templateUrl: './global-summary.html',
  styleUrl: './global-summary.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col w-full h-full overflow-hidden' },
})
export class GlobalSummaryComponent implements OnInit {
  private readonly summaryService = inject(SummaryService);
  private readonly destroyRef = inject(DestroyRef);

  readonly selectedMonth = new FormControl('2025-03');
  readonly selectedYear = new FormControl(new Date().getFullYear());

  get yearOptions(): number[] {
    return this.summaryService.years();
  }

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- need access to service signal
  readonly allocationChartData = computed((): ChartData<'pie'> => {
    return buildAllocationChartData(this.summaryService.summary());
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- need access to computed signal
  readonly hasAllocationData$ = computed(() => {
    const data = this.allocationChartData();
    return data.datasets[0].data.some(function isNonZero(v: unknown): boolean {
      return (v as number) !== 0;
    });
  });

  readonly pieChartOptions = defaultPieChartOptions;

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- need access to service signal
  readonly performanceChartData = computed((): ChartData<'line'> => {
    return buildPerformanceChartData(this.summaryService.graph());
  });

  /* eslint-disable @smarttools/no-anonymous-functions -- computed signals need service access */
  readonly basis$ = computed(() => this.summaryService.summary().deposits);

  readonly capitalGain$ = computed(
    () => this.summaryService.summary().capitalGains
  );

  readonly dividends$ = computed(() => this.summaryService.summary().dividends);
  /* eslint-enable @smarttools/no-anonymous-functions -- end computed signals block */

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- need access to this
  readonly percentIncrease$ = computed(() => {
    return computePercentIncrease(
      this.basis$(),
      this.capitalGain$(),
      this.dividends$()
    );
  });

  readonly loading$ = this.summaryService.loading;
  readonly error$ = this.summaryService.error;

  constructor() {
    // Auto-select first available month when months load
    effect(
      // eslint-disable-next-line @smarttools/no-anonymous-functions -- Required for effect
      () => {
        const months = this.summaryService.months();
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

  get monthOptions(): Array<{ label: string; value: string }> {
    return this.summaryService.months();
  }

  get allocationData(): ChartData<'pie'> {
    return this.allocationChartData();
  }

  get performanceData(): ChartData<'line'> {
    return this.performanceChartData();
  }

  /**
   * Refresh summary data for the currently selected month.
   */
  refreshData(): void {
    this.selectedMonth.disable({ emitEvent: false });
    this.summaryService.fetchSummary(
      this.selectedMonth.value ?? '2025-03',
      enableMonthSelector.bind(this)
    );
  }

  ngOnInit(): void {
    this.summaryService.fetchMonths();
    this.summaryService.fetchYears();
    this.summaryService.fetchGraph(
      this.selectedYear.value ?? new Date().getFullYear()
    );
    this.summaryService.fetchSummary(this.selectedMonth.value ?? '2025-03');

    this.selectedYear.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        // eslint-disable-next-line @smarttools/no-anonymous-functions -- need inline access to service
        (year: number | null) => {
          if (year !== null) {
            this.summaryService.fetchGraph(year);
          }
        }
      );

    this.selectedMonth.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        // eslint-disable-next-line @smarttools/no-anonymous-functions -- need inline access to service
        (month: string | null) => {
          if (month !== null) {
            this.selectedMonth.disable({ emitEvent: false });
            this.summaryService.fetchSummary(
              month,
              enableMonthSelector.bind(this)
            );
          }
        }
      );
  }
}
