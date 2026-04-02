import { CurrencyPipe, PercentPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatOptionModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { AllocationChartComponent } from '../shared/components/allocation-chart/allocation-chart';
import { PerformanceChartComponent } from '../shared/components/performance-chart/performance-chart';
import { getCurrentMonth } from '../shared/components/summary-view/get-current-month.function';
import { SummaryViewBase } from '../shared/components/summary-view/summary-view.base';

@Component({
  selector: 'dms-global-summary',
  imports: [
    AllocationChartComponent,
    CurrencyPipe,
    MatCardModule,
    MatOptionModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    PercentPipe,
    PerformanceChartComponent,
    ReactiveFormsModule,
  ],
  templateUrl: '../shared/components/summary-view/summary-view.html',
  styleUrl: '../shared/components/summary-view/summary-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col w-full h-full overflow-hidden' },
})
export class GlobalSummaryComponent extends SummaryViewBase implements OnInit {
  readonly mode = 'global' as const;

  /**
   * Refresh summary data for the currently selected month.
   */
  refreshData(): void {
    this.selectedMonth.disable({ emitEvent: false });
    this.summaryService.fetchSummary(
      this.selectedMonth.value ?? getCurrentMonth(),
      this.enableSelectors.bind(this)
    );
  }

  ngOnInit(): void {
    this.summaryService.fetchMonths();
    this.summaryService.fetchYears();
    this.summaryService.fetchGraph(
      this.selectedYear.value ?? new Date().getFullYear()
    );
    this.summaryService.fetchSummary(
      this.selectedMonth.value ?? getCurrentMonth()
    );

    this.selectedYear.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        // eslint-disable-next-line @smarttools/no-anonymous-functions -- need inline access to service
        (year: number | null) => {
          if (year !== null) {
            this.summaryService.fetchGraph(year);
          }
        }
      );

    this.selectedMonth.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        // eslint-disable-next-line @smarttools/no-anonymous-functions -- need inline access to service
        (month: string | null) => {
          if (month !== null) {
            this.selectedMonth.disable({ emitEvent: false });
            this.summaryService.fetchSummary(
              month,
              this.enableSelectors.bind(this)
            );
          }
        }
      );
  }
}
