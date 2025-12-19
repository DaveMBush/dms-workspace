import { CurrencyPipe, DecimalPipe, PercentPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { ChartData } from 'chart.js';

import { SummaryDisplayComponent } from '../shared/components/summary-display/summary-display';

function computeAllocationChartData(): ChartData<'pie'> {
  return {
    labels: ['Equities', 'Income', 'Tax Free'],
    datasets: [
      {
        data: [50, 30, 20],
        backgroundColor: ['#3B82F6', '#10B981', '#F59E0B'],
      },
    ],
  };
}

function computePerformanceChartData(): ChartData<'line'> {
  return {
    labels: [
      '01-2025',
      '02-2025',
      '03-2025',
      '04-2025',
      '05-2025',
      '06-2025',
      '07-2025',
      '08-2025',
      '09-2025',
      '10-2025',
      '11-2025',
      '12-2025',
    ],
    datasets: [
      {
        label: 'Base',
        data: [
          40000, 40200, 40500, 40800, 41000, 41200, 41400, 41600, 41800, 42000,
          42100, 42200,
        ],
        borderColor: '#3B82F6',
        tension: 0.2,
      },
      {
        label: 'Capital Gains',
        data: [0, 100, 300, 500, 700, 900, 1000, 1050, 1100, 1150, 1175, 1200],
        borderColor: '#10B981',
        tension: 0.2,
      },
      {
        label: 'Dividends',
        data: [0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 525],
        borderColor: '#F59E0B',
        tension: 0.2,
      },
    ],
  };
}

function createMonthOptions(): Array<{ label: string; value: string }> {
  const months = [];
  for (let m = 1; m <= 12; m++) {
    const paddedMonth = m.toString().padStart(2, '0');
    months.push({
      label: `${paddedMonth}/2025`,
      value: `2025-${paddedMonth}`,
    });
  }
  return months;
}

function computePercentIncrease(
  basis: number,
  gains: number,
  divs: number
): number {
  return (12 * (gains + divs)) / basis;
}

@Component({
  selector: 'rms-global-summary',
  imports: [
    CurrencyPipe,
    DecimalPipe,
    MatCardModule,
    MatOptionModule,
    MatSelectModule,
    PercentPipe,
    ReactiveFormsModule,
    SummaryDisplayComponent,
  ],
  templateUrl: './global-summary.html',
  styleUrl: './global-summary.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalSummary {
  readonly selectedMonth = new FormControl('2025-03');
  readonly monthOptionsSignal = computed(createMonthOptions);

  readonly allocationChartData = computed(computeAllocationChartData);
  readonly performanceChartData = computed(computePerformanceChartData);

  readonly basis$ = signal(40500.0);
  readonly capitalGain$ = signal(1000.0);
  readonly dividends$ = signal(525.0);

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- need access to this
  readonly percentIncrease$ = computed(() => {
    return computePercentIncrease(
      this.basis$(),
      this.capitalGain$(),
      this.dividends$()
    );
  });

  get monthOptions(): Array<{ label: string; value: string }> {
    return this.monthOptionsSignal();
  }

  get allocationData(): ChartData<'pie'> {
    return this.allocationChartData();
  }

  get performanceData(): ChartData<'line'> {
    return this.performanceChartData();
  }
}
