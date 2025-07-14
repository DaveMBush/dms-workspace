import { Component, computed, effect, inject, OnInit } from '@angular/core';
import { DropdownModule } from 'primeng/dropdown';
import { FormsModule } from '@angular/forms';
import { ChartModule } from 'primeng/chart';
import { SummaryComponentService } from './summary-component.service';
import { Summary } from './summary.interface';
import { CurrencyPipe, PercentPipe } from '@angular/common';

@Component({
  selector: 'app-summary',
  standalone: true,
  imports: [PercentPipe, CurrencyPipe, DropdownModule, FormsModule, ChartModule],
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
      return {
        labels: [],
        datasets: []
      };
    }
    const { equities, income, tax_free_income } = s;
    const total = equities + income + tax_free_income;
    return {
      labels: ['Equities', 'Income', 'Tax Free'],
      datasets: [
        {
          data: [100 * equities/total, 100 * income/total, 100 * tax_free_income/total],
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
    }
  });

  compositionOptions = {
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#6B7280',
          font: { size: 14 }
        }
      }
    }
  };

  lineChartData = computed(() => {
    const g = this.summaryComponentService.graph();
    return   {
      labels: g?.map((g) => g.month),
      datasets: [
        {
          label: 'Base',
          data: g?.map((g) => g.deposits),
          borderColor: '#42A5F5',
          backgroundColor: 'rgba(66,165,245,0.2)',
          fill: false,
          tension: 0.1
        },
        {
          label: 'Capital Gains',
          data: g?.map((g) => g.deposits + g.capitalGains),
          borderColor: '#66BB6A',
          backgroundColor: 'rgba(102,187,106,0.2)',
          fill: false,
          tension: 0.1
        },
        {
          label: 'Dividends',
          data: g?.map((g) => g.deposits + g.capitalGains + g.dividends),
          borderColor: '#FFA726',
          backgroundColor: 'rgba(255,167,38,0.2)',
          fill: false,
          tension: 0.1
        }
      ]
    };

  });

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
    }
  };
}
