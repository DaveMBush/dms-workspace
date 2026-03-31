import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ChartData } from 'chart.js';

import { SummaryDisplayComponent } from '../summary-display/summary-display';

@Component({
  selector: 'dms-performance-chart',
  imports: [
    MatFormFieldModule,
    MatOptionModule,
    MatSelectModule,
    ReactiveFormsModule,
    SummaryDisplayComponent,
  ],
  templateUrl: './performance-chart.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col flex-1 min-h-0' },
})
export class PerformanceChartComponent {
  performanceData$ = input.required<ChartData<'line'>>();
  selectedYear$ = input.required<FormControl<number | null>>();
  yearOptions$ = input.required<number[]>();
}
