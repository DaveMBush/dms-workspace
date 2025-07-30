import { Component, computed, effect, inject, signal } from '@angular/core';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { ChartModule } from 'primeng/chart';
import { SummaryComponentService } from './summary-component.service';
import { CurrencyPipe, PercentPipe } from '@angular/common';
import { Graph } from './graph.interface';

@Component({
  selector: 'app-summary',
  standalone: true,
  imports: [PercentPipe, CurrencyPipe, SelectModule, FormsModule, ChartModule],
  templateUrl: './summary.component.html',
  styleUrls: ['./summary.component.scss'],
  viewProviders: [SummaryComponentService]
})
export class SummaryComponent {
  summaryComponentService = inject(SummaryComponentService);
  summary = this.summaryComponentService.summary;
  selectedMonth = this.summaryComponentService.selectedMonth;
  months = this.summaryComponentService.months;

  constructor() {
    effect(() => {
      const months = this.months();
      if (months.length > 0) {
        this.selectedMonth.set(months[0].value);
      } else {
        this.selectedMonth.set(null);
      }
    })
  }

  compositionData = computed(() => {
    const s = this.summary();
    if (!s) {
      return this.getEmptyCompositionData();
    }

    const { equities, income, tax_free_income } = s;
    const total = equities + income + tax_free_income;

    const newEquities = 100 * equities/total;
    const newIncome = 100 * income/total;
    const newTaxFree = 100 * tax_free_income/total;

    return {
      labels: ['Equities', 'Income', 'Tax Free'],
      datasets: [
        {
          data: [newEquities, newIncome, newTaxFree],
          backgroundColor: [
            '#42A5F5', // Equities
            '#66BB6A', // Income
            '#FFA726'  // Tax Free
          ],
          hoverBackgroundColor: [
            '#64B5F6',
            '#81C784',
            '#FFB74D'
          ]
        }
      ]
    };
  });

  private getEmptyCompositionData() {
    return {
      labels: ['Equities', 'Income', 'Tax Free'],
      datasets: [
        {
          data: [0, 0, 0],
          backgroundColor: [
            '#42A5F5', // Equities
            '#66BB6A', // Income
            '#FFA726'  // Tax Free
          ],
          hoverBackgroundColor: [
            '#64B5F6',
            '#81C784',
            '#FFB74D'
          ]
        }
      ]
    };
  }

  compositionOptions = {
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#6B7280',
          font: { size: 14 }
        }
      }
    },
    animation: {
      duration: 0 // Disable animations to prevent re-animation on data refresh
    }
  };

  lineChartData = computed(() => {
    const g = this.summaryComponentService.graph();
    if (!g || g.length === 0) {
      return this.getEmptyLineChartData();
    }

    const newLabels = g.map((g: Graph) => g.month);
    const newBaseData = g.map((g: Graph) => g.deposits);
    const newCapitalGainsData = g.map((g: Graph) => g.deposits + g.capitalGains);
    const newDividendsData = g.map((g: Graph) => g.deposits + g.capitalGains + g.dividends);

    return {
      labels: newLabels,
      datasets: [
        {
          label: 'Base',
          data: newBaseData,
          borderColor: '#42A5F5',
          backgroundColor: 'rgba(66,165,245,0.2)',
          fill: false,
          tension: 0.1
        },
        {
          label: 'Capital Gains',
          data: newCapitalGainsData,
          borderColor: '#66BB6A',
          backgroundColor: 'rgba(102,187,106,0.2)',
          fill: false,
          tension: 0.1
        },
        {
          label: 'Dividends',
          data: newDividendsData,
          borderColor: '#FFA726',
          backgroundColor: 'rgba(255,167,38,0.2)',
          fill: false,
          tension: 0.1
        }
      ]
    };
  });

  private getEmptyLineChartData() {
    return {
      labels: [],
      datasets: [
        {
          label: 'Base',
          data: [],
          borderColor: '#42A5F5',
          backgroundColor: 'rgba(66,165,245,0.2)',
          fill: false,
          tension: 0.1
        },
        {
          label: 'Capital Gains',
          data: [],
          borderColor: '#66BB6A',
          backgroundColor: 'rgba(102,187,106,0.2)',
          fill: false,
          tension: 0.1
        },
        {
          label: 'Dividends',
          data: [],
          borderColor: '#FFA726',
          backgroundColor: 'rgba(255,167,38,0.2)',
          fill: false,
          tension: 0.1
        }
      ]
    };
  }

  lineChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#6B7280',
          font: { size: 14 }
        }
      }
    },
    scales: {
      x: {
        title: { display: true, text: 'Month' },
        ticks: { color: '#6B7280' }
      },
      y: {
        title: { display: true, text: 'Amount ($)' },
        ticks: { color: '#6B7280' },
        min: 40000
      }
    },
    animation: {
      duration: 0 // Disable animations to prevent re-animation on data refresh
    }
  };
}
