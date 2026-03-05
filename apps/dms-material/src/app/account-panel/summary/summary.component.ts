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
import { MatSelectModule } from '@angular/material/select';
import { ChartData } from 'chart.js';

import { GraphPoint } from '../../global/services/graph-point.interface';
import { Summary } from '../../global/services/summary.interface';
import { SummaryService } from '../../global/services/summary.service';
import { SummaryDisplayComponent } from '../../shared/components/summary-display/summary-display';
import { currentAccountSignalStore } from '../../store/current-account/current-account.signal-store';

const CHART_COLORS = {
  equities: '#42A5F5',
  income: '#66BB6A',
  taxFree: '#FFA726',
  equitiesHover: '#64B5F6',
  incomeHover: '#81C784',
  taxFreeHover: '#FFB74D',
  base: '#42A5F5',
  capitalGains: '#66BB6A',
  dividends: '#FFA726',
  baseAlpha: 'rgba(66,165,245,0.2)',
  capitalGainsAlpha: 'rgba(102,187,106,0.2)',
  dividendsAlpha: 'rgba(255,167,38,0.2)',
};

function createMonthOptions(): Array<{ label: string; value: string }> {
  return Array.from({ length: 12 }, function buildMonthOption(_, index) {
    const month = (index + 1).toString().padStart(2, '0');
    return { label: `${month}/2025`, value: `2025-${month}` };
  });
}

function onFetchComplete(): void {
  // intentionally empty – required callback placeholder
}

function buildAllocationData(summary: Summary): ChartData<'pie'> {
  const { equities, income, tax_free_income } = summary;
  const total = equities + income + tax_free_income;
  const pctEquities = total > 0 ? (100 * equities) / total : 0;
  const pctIncome = total > 0 ? (100 * income) / total : 0;
  const pctTaxFree = total > 0 ? (100 * tax_free_income) / total : 0;

  return {
    labels: ['Equities', 'Income', 'Tax Free'],
    datasets: [
      {
        data: [pctEquities, pctIncome, pctTaxFree],
        backgroundColor: [
          CHART_COLORS.equities,
          CHART_COLORS.income,
          CHART_COLORS.taxFree,
        ],
        hoverBackgroundColor: [
          CHART_COLORS.equitiesHover,
          CHART_COLORS.incomeHover,
          CHART_COLORS.taxFreeHover,
        ],
      },
    ],
  };
}

function createLineDataset(
  label: string,
  data: number[],
  borderColor: string,
  backgroundColor: string
): {
  label: string;
  data: number[];
  borderColor: string;
  backgroundColor: string;
  fill: boolean;
  tension: number;
} {
  return {
    label,
    data,
    borderColor,
    backgroundColor,
    fill: false,
    tension: 0.1,
  };
}

function buildPerformanceDatasets(
  graphPoints: GraphPoint[]
): ChartData<'line'>['datasets'] {
  const baseData = graphPoints.map(function baseMap(gp) {
    return gp.deposits;
  });
  const capitalGainsData = graphPoints.map(function capGainsMap(gp) {
    return gp.deposits + gp.capitalGains;
  });
  const dividendsData = graphPoints.map(function dividendsMap(gp) {
    return gp.deposits + gp.capitalGains + gp.dividends;
  });

  return [
    createLineDataset(
      'Base',
      baseData,
      CHART_COLORS.base,
      CHART_COLORS.baseAlpha
    ),
    createLineDataset(
      'Capital Gains',
      capitalGainsData,
      CHART_COLORS.capitalGains,
      CHART_COLORS.capitalGainsAlpha
    ),
    createLineDataset(
      'Dividends',
      dividendsData,
      CHART_COLORS.dividends,
      CHART_COLORS.dividendsAlpha
    ),
  ];
}

function buildPerformanceData(graphPoints: GraphPoint[]): ChartData<'line'> {
  if (graphPoints.length === 0) {
    return {
      labels: [],
      datasets: buildPerformanceDatasets([]),
    };
  }

  const labels = graphPoints.map(function labelMap(gp) {
    return gp.month;
  });

  return {
    labels,
    datasets: buildPerformanceDatasets(graphPoints),
  };
}

@Component({
  selector: 'dms-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCardModule,
    MatOptionModule,
    MatSelectModule,
    ReactiveFormsModule,
    SummaryDisplayComponent,
    CurrencyPipe,
    PercentPipe,
  ],
  templateUrl: './summary.component.html',
  styleUrl: './summary.component.scss',
})
export class SummaryComponent {
  private readonly summaryService = inject(SummaryService);
  private readonly accountStore = inject(currentAccountSignalStore);
  private readonly destroyRef = inject(DestroyRef);

  private allocationDataSignal = computed(
    this.computeAllocationData.bind(this)
  );

  private performanceDataSignal = computed(
    this.computePerformanceData.bind(this)
  );

  readonly selectedMonth = new FormControl('2025-03');
  private monthOptionsSignal = computed(createMonthOptions);

  constructor() {
    const self = this;

    effect(function onAccountChange() {
      const accountId = self.accountStore.selectCurrentAccountId();
      if (accountId !== '') {
        const month = self.selectedMonth.value ?? '2025-03';
        const year = Number.parseInt(month.slice(0, 4), 10);
        self.summaryService.fetchSummary(month, onFetchComplete, accountId);
        self.summaryService.fetchGraph(year, accountId, month);
        self.summaryService.fetchMonths(accountId, year);
      }
    });

    this.selectedMonth.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(function onMonthChange(month: string | null) {
        if (month === null) {
          return;
        }
        const accountId = self.accountStore.selectCurrentAccountId();
        if (accountId !== '') {
          self.summaryService.fetchSummary(month, onFetchComplete, accountId);
        }
      });
  }

  private totalValueSignal = computed(this.computeTotalValue.bind(this));

  private totalGainSignal = computed(this.computeTotalGain.bind(this));

  private gainPercentSignal = computed(this.computeGainPercent.bind(this));

  private capitalGainSignal = computed(this.computeCapitalGain.bind(this));

  // Getters for template
  get allocationData(): ChartData<'pie'> {
    return this.allocationDataSignal();
  }

  get performanceData(): ChartData<'line'> {
    return this.performanceDataSignal();
  }

  get totalValue(): number {
    return this.totalValueSignal();
  }

  get totalGain(): number {
    return this.totalGainSignal();
  }

  get capitalGain(): number {
    return this.capitalGainSignal();
  }

  get monthOptions(): Array<{ label: string; value: string }> {
    return this.monthOptionsSignal();
  }

  get gainPercent(): number {
    return this.gainPercentSignal();
  }

  private computeAllocationData(): ChartData<'pie'> {
    return buildAllocationData(this.summaryService.summary());
  }

  private computePerformanceData(): ChartData<'line'> {
    return buildPerformanceData(this.summaryService.graph());
  }

  private computeTotalValue(): number {
    const s = this.summaryService.summary();
    return s.equities + s.income + s.tax_free_income;
  }

  private computeTotalGain(): number {
    const s = this.summaryService.summary();
    return s.capitalGains + s.dividends;
  }

  private computeGainPercent(): number {
    const s = this.summaryService.summary();
    return s.deposits > 0 ? (s.capitalGains + s.dividends) / s.deposits : 0;
  }

  private computeCapitalGain(): number {
    return this.summaryService.summary().capitalGains;
  }
}
