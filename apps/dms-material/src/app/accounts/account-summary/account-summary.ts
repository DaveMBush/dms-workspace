import { CurrencyPipe, PercentPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatOptionModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { ChartData } from 'chart.js';

import { SummaryService } from '../../global/services/summary.service';
import { AllocationChartComponent } from '../../shared/components/allocation-chart/allocation-chart';
import { PerformanceChartComponent } from '../../shared/components/performance-chart/performance-chart';
import { buildAllocationChartData } from '../../shared/utils/build-allocation-chart-data.function';
import { buildPerformanceChartData } from '../../shared/utils/build-performance-chart-data.function';
import { computePercentIncrease } from '../../shared/utils/compute-percent-increase.function';
import { defaultPieChartOptions } from '../../shared/utils/default-pie-chart-options.const';
import { currentAccountSignalStore } from '../../store/current-account/current-account.signal-store';

function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const monthStr = (now.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${monthStr}`;
}

function enableSelectors(this: AccountSummaryComponent): void {
  this.selectedMonth.enable({ emitEvent: false });
  this.selectedYear.enable({ emitEvent: false });
}

@Component({
  selector: 'dms-account-summary',
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
  templateUrl: './account-summary.html',
  styleUrl: './account-summary.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col w-full h-full overflow-hidden' },
})
export class AccountSummaryComponent {
  private readonly summaryService = inject(SummaryService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly accountStore = inject(currentAccountSignalStore);
  private accountId = '';

  readonly selectedMonth = new FormControl(getCurrentMonth());
  readonly selectedYear = new FormControl(new Date().getFullYear());

  readonly loading$ = this.summaryService.loading;
  readonly loading = this.loading$;
  readonly error$ = this.summaryService.error;
  readonly error = this.error$;

  /* eslint-disable @smarttools/no-anonymous-functions -- computed signals need service access */
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

  readonly monthOptions$ = computed(() => this.summaryService.accountMonths());

  readonly yearOptions$ = computed(() => this.summaryService.years());

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

  get allocationData(): ChartData<'pie'> {
    return this.allocationChartData();
  }

  get performanceData(): ChartData<'line'> {
    return this.performanceChartData();
  }

  constructor() {
    const component = this;
    effect(function watchAccountChange(): void {
      const accountId = component.accountStore.selectCurrentAccountId();
      if (accountId !== '') {
        component.accountId = accountId;
        component.fetchAccountData();
      }
    });

    this.selectedMonth.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(this.onMonthChange.bind(this));

    this.selectedYear.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(this.onYearChange.bind(this));
  }

  private fetchAccountData(): void {
    this.selectedMonth.setValue(getCurrentMonth(), { emitEvent: false });
    this.selectedYear.setValue(new Date().getFullYear(), { emitEvent: false });
    this.selectedMonth.disable({ emitEvent: false });
    this.selectedYear.disable({ emitEvent: false });
    this.summaryService.fetchSummary(
      this.selectedMonth.value ?? getCurrentMonth(),
      enableSelectors.bind(this),
      this.accountId
    );
    this.summaryService.fetchGraph(
      undefined,
      this.accountId,
      this.selectedMonth.value ?? getCurrentMonth()
    );
    this.summaryService.fetchMonths(this.accountId);
    this.summaryService.fetchYears();
  }

  private onMonthChange(month: string | null): void {
    if (month !== null && this.accountId !== '') {
      this.selectedMonth.disable({ emitEvent: false });
      this.summaryService.fetchSummary(
        month,
        enableSelectors.bind(this),
        this.accountId
      );
      this.summaryService.fetchGraph(
        this.selectedYear.value ?? undefined,
        this.accountId,
        month
      );
    }
  }

  private onYearChange(year: number | null): void {
    if (year !== null && this.accountId !== '') {
      this.summaryService.fetchMonths(this.accountId, year);
      this.summaryService.fetchGraph(
        year,
        this.accountId,
        this.selectedMonth.value ?? getCurrentMonth()
      );
    }
  }
}
