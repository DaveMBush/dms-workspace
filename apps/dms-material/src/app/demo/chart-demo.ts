import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { ChartData } from 'chart.js';

import { SummaryDisplayComponent } from '../shared/components/summary-display/summary-display';

@Component({
  selector: 'dms-chart-demo',
  imports: [MatCardModule, MatButtonModule, SummaryDisplayComponent],
  templateUrl: './chart-demo.html',
  styleUrl: './chart-demo.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartDemo {
  pieChartData$ = signal<ChartData<'pie'>>({
    labels: ['Stocks', 'Bonds', 'Cash', 'Real Estate'],
    datasets: [
      {
        data: [45, 25, 15, 15],
        backgroundColor: ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444'],
      },
    ],
  });

  lineChartData$ = signal<ChartData<'line'>>({
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Portfolio Value',
        data: [10000, 10500, 10200, 11000, 11500, 12000],
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.1,
        fill: true,
      },
    ],
  });

  emptyChartData$ = signal<ChartData<'pie'>>({
    labels: [],
    datasets: [{ data: [] }],
  });

  singlePointData$ = signal<ChartData<'line'>>({
    labels: ['Today'],
    datasets: [
      {
        label: 'Value',
        data: [5000],
        borderColor: '#22C55E',
      },
    ],
  });

  largeDataset$ = signal<ChartData<'line'>>({
    labels: this.generateLabels(100),
    datasets: [
      {
        label: 'Large Dataset',
        data: this.generateRandomData(100),
        borderColor: '#8B5CF6',
        tension: 0.1,
      },
    ],
  });

  negativeValuesData$ = signal<ChartData<'line'>>({
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Profit/Loss',
        data: [1000, -500, 2000, -1500, 3000, -200],
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.1,
        fill: true,
      },
    ],
  });

  smallValuesData$ = signal<ChartData<'pie'>>({
    labels: ['Large', 'Medium', 'Small', 'Tiny'],
    datasets: [
      {
        data: [1000000, 10000, 100, 0.01],
        backgroundColor: ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444'],
      },
    ],
  });

  largeValuesData$ = signal<ChartData<'pie'>>({
    labels: ['Billions', 'Millions', 'Thousands'],
    datasets: [
      {
        data: [5000000000, 250000000, 10000000],
        backgroundColor: ['#3B82F6', '#22C55E', '#F59E0B'],
      },
    ],
  });

  showUpdatedData$ = signal(false);

  updatePieData(): void {
    this.pieChartData$.set({
      labels: ['Stocks', 'Bonds', 'Cash', 'Real Estate'],
      datasets: [
        {
          data: [60, 20, 10, 10],
          backgroundColor: ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444'],
        },
      ],
    });
    this.showUpdatedData$.set(true);
  }

  updateLineData(): void {
    this.lineChartData$.set({
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
      datasets: [
        {
          label: 'Portfolio Value',
          data: [10000, 10500, 10200, 11000, 11500, 12000, 13000],
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.1,
          fill: true,
        },
      ],
    });
  }

  private generateLabels(count: number): string[] {
    const labels: string[] = [];
    for (let i = 0; i < count; i++) {
      labels.push(`Day ${String(i + 1)}`);
    }
    return labels;
  }

  // Using deterministic data for consistent test results
  private generateRandomData(count: number): number[] {
    const data: number[] = [];
    let value = 10000;
    for (let i = 0; i < count; i++) {
      // Deterministic pattern: alternating ups and downs
      const adjustment = ((i % 7) - 3) * 100;
      value += adjustment;
      data.push(Math.round(value));
    }
    return data;
  }
}
