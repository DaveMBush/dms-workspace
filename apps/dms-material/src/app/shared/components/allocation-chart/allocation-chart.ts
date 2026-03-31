import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ChartConfiguration, ChartData } from 'chart.js';

import { SummaryDisplayComponent } from '../summary-display/summary-display';

@Component({
  selector: 'dms-allocation-chart',
  imports: [SummaryDisplayComponent],
  templateUrl: './allocation-chart.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllocationChartComponent {
  allocationData$ = input.required<ChartData<'pie'>>();
  hasAllocationData$ = input.required<boolean>();
  pieChartOptions$ = input.required<ChartConfiguration['options']>();
}
