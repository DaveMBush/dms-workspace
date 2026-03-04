import { CurrencyPipe, PercentPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute } from '@angular/router';
import { ChartConfiguration, ChartData } from 'chart.js';

import { GraphPoint } from '../../global/services/graph-point.interface';
import { SummaryService } from '../../global/services/summary.service';
import { SummaryDisplayComponent } from '../../shared/components/summary-display/summary-display';

function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const monthStr = (now.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${monthStr}`;
}

interface EnrichedPoint {
  month: string;
  base: number;
  capitalGainsLine: number;
  dividendsLine: number;
}

function buildEnrichedPoints(graphData: GraphPoint[]): EnrichedPoint[] {
  let cumulCapGains = 0;
  let cumulDividends = 0;
  return graphData.map(function buildPoint(p: GraphPoint): EnrichedPoint {
    cumulCapGains += p.capitalGains;
    cumulDividends += p.dividends;
    return {
      month: p.month,
      base: p.deposits,
      capitalGainsLine: p.deposits + cumulCapGains,
      dividendsLine: p.deposits + cumulCapGains + cumulDividends,
    };
  });
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

function enableSelectors(this: AccountSummary): void {
  this.selectedMonth.enable({ emitEvent: false });
  this.selectedYear.enable({ emitEvent: false });
}

@Component({
  selector: 'dms-account-summary',
  imports: [
    CurrencyPipe,
    MatCardModule,
    MatFormFieldModule,
    MatOptionModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    PercentPipe,
    ReactiveFormsModule,
    SummaryDisplayComponent,
  ],
  templateUrl: './account-summary.html',
  styleUrl: './account-summary.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountSummary implements OnInit {
  private readonly summaryService = inject(SummaryService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private accountId = '';

  readonly selectedMonth = new FormControl(getCurrentMonth());
  readonly selectedYear = new FormControl(new Date().getFullYear());

  readonly loading$ = this.summaryService.loading;
  readonly loading = this.loading$;
  readonly error$ = this.summaryService.error;
  readonly error = this.error$;

  /* eslint-disable @smarttools/no-anonymous-functions -- computed signals need service access */
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

  readonly hasAllocationData$ = computed(() => {
    const data = this.allocationChartData();
    return data.datasets[0].data.some(function isNonZero(v: unknown): boolean {
      return (v as number) !== 0;
    });
  });

  readonly performanceChartData = computed((): ChartData<'line'> => {
    const enriched = buildEnrichedPoints(this.summaryService.graph());
    return {
      labels: enriched.map(function getMonth(p: EnrichedPoint): string {
        return p.month;
      }),
      datasets: [
        {
          label: 'Base',
          data: enriched.map(function getBase(p: EnrichedPoint): number {
            return p.base;
          }),
          borderColor: '#3B82F6',
          tension: 0.2,
        },
        {
          label: 'Capital Gains',
          data: enriched.map(function getCapGainsLine(
            p: EnrichedPoint
          ): number {
            return p.capitalGainsLine;
          }),
          borderColor: '#10B981',
          tension: 0.2,
        },
        {
          label: 'Dividends',
          data: enriched.map(function getDividendsLine(
            p: EnrichedPoint
          ): number {
            return p.dividendsLine;
          }),
          borderColor: '#F59E0B',
          tension: 0.2,
        },
      ],
    };
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

  readonly pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: true,
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

  get allocationData(): ChartData<'pie'> {
    return this.allocationChartData();
  }

  get performanceData(): ChartData<'line'> {
    return this.performanceChartData();
  }

  ngOnInit(): void {
    this.accountId = this.route.snapshot.paramMap.get('id') ?? '';
    this.selectedMonth.disable({ emitEvent: false });
    this.selectedYear.disable({ emitEvent: false });
    this.summaryService.fetchSummary(
      '',
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

    this.selectedMonth.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        // eslint-disable-next-line @smarttools/no-anonymous-functions -- need inline access to service
        (month: string | null) => {
          if (month !== null && this.accountId !== '') {
            this.summaryService.fetchGraph(undefined, this.accountId, month);
          }
        }
      );

    this.selectedYear.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        // eslint-disable-next-line @smarttools/no-anonymous-functions -- need inline access to service
        (year: number | null) => {
          if (year !== null && this.accountId !== '') {
            this.summaryService.fetchMonths(this.accountId, year);
          }
        }
      );
  }
}
