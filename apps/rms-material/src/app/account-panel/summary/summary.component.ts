import { CurrencyPipe, PercentPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { ChartData } from 'chart.js';

import { SummaryDisplayComponent } from '../../shared/components/summary-display/summary-display';
import { selectTrades } from '../../store/trades/selectors/select-trades.function';

function createMonthOptions(): Array<{ label: string; value: string }> {
  return Array.from({ length: 12 }, function buildMonthOption(_, index) {
    const month = (index + 1).toString().padStart(2, '0');
    return { label: `${month}/2025`, value: `2025-${month}` };
  });
}

@Component({
  selector: 'rms-summary',
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
  private tradesSignal = selectTrades();

  private allocationDataSignal = computed<ChartData<'pie'>>(
    function computeAllocationData() {
      // Build from trades data
      return {
        labels: ['Open', 'Sold', 'Cash'],
        datasets: [
          {
            data: [60, 30, 10],
            backgroundColor: ['#3B82F6', '#22C55E', '#F59E0B'],
          },
        ],
      };
    }
  );

  private performanceDataSignal = computed<ChartData<'line'>>(
    function computePerformanceData() {
      return {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
        datasets: [
          {
            label: 'Base',
            data: [10000, 10200, 10100, 10300, 10500],
            borderColor: '#42A5F5',
            backgroundColor: 'rgba(66,165,245,0.2)',
            fill: false,
            tension: 0.1,
          },
          {
            label: 'Capital Gains',
            data: [10000, 10400, 10300, 10600, 11000],
            borderColor: '#66BB6A',
            backgroundColor: 'rgba(102,187,106,0.2)',
            fill: false,
            tension: 0.1,
          },
          {
            label: 'Dividends',
            data: [10000, 10500, 10400, 10800, 11500],
            borderColor: '#FFA726',
            backgroundColor: 'rgba(255,167,38,0.2)',
            fill: false,
            tension: 0.1,
          },
        ],
      };
    }
  );

  readonly selectedMonth = new FormControl('2025-03');
  private monthOptionsSignal = computed(createMonthOptions);

  private totalValueSignal = computed(function computeTotalValue() {
    return 11500;
  });

  private totalGainSignal = computed(function computeTotalGain() {
    return 1500;
  });

  private gainPercentSignal = computed(function computeGainPercent() {
    return 0.15;
  });

  private capitalGainSignal = computed(function computeCapitalGain() {
    return 1200;
  });

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
}
