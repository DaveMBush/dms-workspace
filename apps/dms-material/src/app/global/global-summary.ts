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
import { ChartConfiguration, ChartData } from 'chart.js';

import { SummaryDisplayComponent } from '../shared/components/summary-display/summary-display';
import { SummaryService } from './services/summary.service';

function enableMonthSelector(this: GlobalSummary): void {
  this.selectedMonth.enable({ emitEvent: false });
}

function computePercentIncrease(
  basis: number,
  gains: number,
  divs: number
): number {
  if (basis === 0) {
    return 0;
  }
  return (12 * (gains + divs)) / basis;
}

@Component({
  selector: 'dms-global-summary',
  imports: [
    CurrencyPipe,
    MatCardModule,
    MatOptionModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    PercentPipe,
    ReactiveFormsModule,
    SummaryDisplayComponent,
  ],
  templateUrl: './global-summary.html',
  styleUrl: './global-summary.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalSummary implements OnInit {
  private readonly summaryService = inject(SummaryService);
  private readonly destroyRef = inject(DestroyRef);

  readonly selectedMonth = new FormControl('2025-03');

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- need access to service signal
  readonly allocationChartData = computed((): ChartData<'pie'> => {
    const summary = this.summaryService.summary();
    return {
      labels: ['Equities', 'Income', 'Tax Free'],
      datasets: [
        {
          data: [summary.equities, summary.income, summary.tax_free_income],
          backgroundColor: ['#3B82F6', '#10B981', '#F59E0B'],
        },
      ],
    };
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- need access to computed signal
  readonly hasAllocationData$ = computed(() => {
    const data = this.allocationChartData();
    return data.datasets[0].data.some(function isNonZero(v: unknown): boolean {
      return (v as number) !== 0;
    });
  });

  readonly pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      tooltip: {
        callbacks: {
          label: function formatTooltip(context: {
            label?: string;
            raw?: unknown;
            dataIndex: number;
            dataset: { data: unknown[] };
          }): string {
            const label = context.label ?? '';
            const value = (context.raw as number) ?? 0;
            const total = (context.dataset.data as number[]).reduce(
              function sum(a: number, b: number): number {
                return a + b;
              },
              0
            );
            const percentage =
              total > 0 ? Math.round((value / total) * 100) : 0;
            const formatted = value.toLocaleString('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            });
            return `${label}: ${formatted} (${String(percentage)}%)`;
          },
        },
      },
    },
  };

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- need access to service signal
  readonly performanceChartData = computed((): ChartData<'line'> => {
    const graphData = this.summaryService.graph();
    return {
      labels: graphData.map(function getMonth(p: { month: string }): string {
        return p.month;
      }),
      datasets: [
        {
          label: 'Base',
          data: graphData.map(function getDeposits(p: {
            deposits: number;
          }): number {
            return p.deposits;
          }),
          borderColor: '#3B82F6',
          tension: 0.2,
        },
        {
          label: 'Capital Gains',
          data: graphData.map(function getCapitalGains(p: {
            capitalGains: number;
          }): number {
            return p.capitalGains;
          }),
          borderColor: '#10B981',
          tension: 0.2,
        },
        {
          label: 'Dividends',
          data: graphData.map(function getDividends(p: {
            dividends: number;
          }): number {
            return p.dividends;
          }),
          borderColor: '#F59E0B',
          tension: 0.2,
        },
      ],
    };
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
    this.summaryService.fetchGraph();
    this.summaryService.fetchSummary(this.selectedMonth.value ?? '2025-03');

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
