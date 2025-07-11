import { Component, inject } from '@angular/core';
import { DropdownModule } from 'primeng/dropdown';
import { FormsModule } from '@angular/forms';
import { ChartModule } from 'primeng/chart';
import { SummaryComponentService } from './summary-component.service';

@Component({
  selector: 'app-summary',
  standalone: true,
  imports: [DropdownModule, FormsModule, ChartModule],
  templateUrl: './summary.component.html',
  styleUrls: ['./summary.component.scss'],
  viewProviders: [SummaryComponentService]
})
export class SummaryComponent {
  summaryComponentService = inject(SummaryComponentService);
  selectedMonth: string | null = null;

  months = this.summaryComponentService.months;

  compositionData = {
    labels: ['Equities', 'Income', 'Tax Free'],
    datasets: [
      {
        data: [33.3, 33.3, 33.3],
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

  monthlyLabels = [
    'Jan 2024', 'Feb 2024', 'Mar 2024', 'Apr 2024', 'May 2024', 'Jun 2024'
  ];

  lineChartData = {
    labels: this.monthlyLabels,
    datasets: [
      {
        label: 'Deposits',
        data: [1000, 2000, 3000, 4000, 5000, 6000],
        borderColor: '#42A5F5',
        backgroundColor: 'rgba(66,165,245,0.2)',
        fill: false,
        tension: 0.3
      },
      {
        label: 'Deposits + Capital Gains',
        data: [1000, 2200, 3500, 4800, 6300, 8000],
        borderColor: '#66BB6A',
        backgroundColor: 'rgba(102,187,106,0.2)',
        fill: false,
        tension: 0.3
      },
      {
        label: 'Deposits + Capital Gains + Dividends',
        data: [1000, 2300, 3700, 5100, 6700, 8500],
        borderColor: '#FFA726',
        backgroundColor: 'rgba(255,167,38,0.2)',
        fill: false,
        tension: 0.3
      }
    ]
  };

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
        ticks: { color: '#6B7280' }
      }
    }
  };
}
