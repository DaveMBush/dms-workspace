import { CurrencyPipe, PercentPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { ChartData } from 'chart.js';

import { SummaryDisplayComponent } from '../../shared/components/summary-display/summary-display';
import { selectTrades } from '../../store/trades/selectors/select-trades.function';

@Component({
  selector: 'rms-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatCardModule, SummaryDisplayComponent, CurrencyPipe, PercentPipe],
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

  private totalValueSignal = computed(function computeTotalValue() {
    return 11500;
  });

  private totalGainSignal = computed(function computeTotalGain() {
    return 1500;
  });

  private gainPercentSignal = computed(function computeGainPercent() {
    return 0.15;
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

  get gainPercent(): number {
    return this.gainPercentSignal();
  }
}
