import { CurrencyPipe, PercentPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute } from '@angular/router';
import { ChartConfiguration, ChartData } from 'chart.js';

import { GraphPoint } from '../../global/services/graph-point.interface';
import { SummaryService } from '../../global/services/summary.service';
import { SummaryDisplayComponent } from '../../shared/components/summary-display/summary-display';

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

@Component({
  selector: 'dms-account-summary',
  imports: [
    CurrencyPipe,
    MatCardModule,
    MatProgressSpinnerModule,
    PercentPipe,
    SummaryDisplayComponent,
  ],
  templateUrl: './account-summary.html',
  styleUrl: './account-summary.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountSummary implements OnInit {
  private readonly summaryService = inject(SummaryService);
  private readonly route = inject(ActivatedRoute);
  private accountId = '';

  readonly selectedMonth = new FormControl('2025-03');

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

  readonly monthOptions = computed(() => this.summaryService.months());

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
        position: 'bottom' as const,
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
    this.summaryService.fetchSummary('', undefined, this.accountId);
    this.summaryService.fetchGraph(
      undefined,
      this.accountId,
      this.selectedMonth.value ?? '2025-03'
    );
    this.summaryService.fetchMonths(this.accountId);
  }
}
