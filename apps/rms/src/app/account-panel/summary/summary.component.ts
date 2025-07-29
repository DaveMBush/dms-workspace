import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { ChartModule } from 'primeng/chart';
import { SummaryComponentService } from './summary-component.service';
import { CurrencyPipe, PercentPipe } from '@angular/common';

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

  // Use signals to track data changes more precisely
  private compositionDataSignal = signal<any>(null);
  private lineChartDataSignal = signal<any>(null);

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

  // Deep comparison helper
  private isEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true;
    if (obj1 == null || obj2 == null) return false;
    if (typeof obj1 !== typeof obj2) return false;

    if (typeof obj1 !== 'object') return obj1 === obj2;

    if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;

    if (Array.isArray(obj1)) {
      if (obj1.length !== obj2.length) return false;
      for (let i = 0; i < obj1.length; i++) {
        if (!this.isEqual(obj1[i], obj2[i])) return false;
      }
      return true;
    }

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) return false;

    for (const key of keys1) {
      if (!keys2.includes(key)) return false;
      if (!this.isEqual(obj1[key], obj2[key])) return false;
    }

    return true;
  }

  compositionData = computed(() => {
    const s = this.summary();
    if (!s) {
      return this.getEmptyCompositionData();
    }

    const { equities, income, tax_free_income } = s;
    const total = equities + income + tax_free_income;

    // Only update if the values have actually changed
    const currentData = this.compositionDataSignal();
    const newEquities = 100 * equities/total;
    const newIncome = 100 * income/total;
    const newTaxFree = 100 * tax_free_income/total;

    if (!currentData ||
        currentData.datasets[0].data[0] !== newEquities ||
        currentData.datasets[0].data[1] !== newIncome ||
        currentData.datasets[0].data[2] !== newTaxFree) {

      const newData = {
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
      this.compositionDataSignal.set(newData);
    }

    return this.compositionDataSignal();
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

    const newLabels = g.map((g) => g.month);
    const newBaseData = g.map((g) => g.deposits);
    const newCapitalGainsData = g.map((g) => g.deposits + g.capitalGains);
    const newDividendsData = g.map((g) => g.deposits + g.capitalGains + g.dividends);

    const currentData = this.lineChartDataSignal();

    // Only update if the data has actually changed
    if (!currentData ||
        !this.arraysEqual(currentData.labels, newLabels) ||
        !this.arraysEqual(currentData.datasets[0].data, newBaseData) ||
        !this.arraysEqual(currentData.datasets[1].data, newCapitalGainsData) ||
        !this.arraysEqual(currentData.datasets[2].data, newDividendsData)) {

      const newData = {
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
      this.lineChartDataSignal.set(newData);
    }

    return this.lineChartDataSignal();
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

  private arraysEqual(arr1: any[], arr2: any[]): boolean {
    if (arr1.length !== arr2.length) return false;
    for (let i = 0; i < arr1.length; i++) {
      if (arr1[i] !== arr2[i]) return false;
    }
    return true;
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
