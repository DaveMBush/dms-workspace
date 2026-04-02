import { CurrencyPipe, PercentPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatOptionModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { AllocationChartComponent } from '../../shared/components/allocation-chart/allocation-chart';
import { PerformanceChartComponent } from '../../shared/components/performance-chart/performance-chart';
import { getCurrentMonth } from '../../shared/components/summary-view/get-current-month.function';
import { SummaryViewBase } from '../../shared/components/summary-view/summary-view.base';
import { currentAccountSignalStore } from '../../store/current-account/current-account.signal-store';

@Component({
  selector: 'dms-account-summary',
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
  templateUrl: '../../shared/components/summary-view/summary-view.html',
  styleUrl: '../../shared/components/summary-view/summary-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col w-full h-full overflow-hidden' },
})
export class AccountSummaryComponent extends SummaryViewBase {
  readonly mode = 'account' as const;

  private readonly accountStore = inject(currentAccountSignalStore);
  private accountId = '';

  constructor() {
    super();

    const component = this;
    effect(function watchAccountChange(): void {
      const accountId = component.accountStore.selectCurrentAccountId();
      if (accountId !== '') {
        component.accountId = accountId;
        component.fetchAccountData();
      }
    });

    this.selectedMonth.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(this.onMonthChange.bind(this));

    this.selectedYear.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(this.onYearChange.bind(this));
  }

  private fetchAccountData(): void {
    this.selectedMonth.setValue(getCurrentMonth(), { emitEvent: false });
    this.selectedYear.setValue(new Date().getFullYear(), { emitEvent: false });
    this.selectedMonth.disable({ emitEvent: false });
    this.selectedYear.disable({ emitEvent: false });
    this.summaryService.fetchSummary(
      this.selectedMonth.value ?? getCurrentMonth(),
      this.enableSelectors.bind(this),
      this.accountId
    );
    this.summaryService.fetchGraph(
      undefined,
      this.accountId,
      this.selectedMonth.value ?? getCurrentMonth()
    );
    this.summaryService.fetchMonths(this.accountId);
    this.summaryService.fetchYears();
  }

  private onMonthChange(month: string | null): void {
    if (month !== null && this.accountId !== '') {
      this.selectedMonth.disable({ emitEvent: false });
      this.summaryService.fetchSummary(
        month,
        this.enableSelectors.bind(this),
        this.accountId
      );
      this.summaryService.fetchGraph(
        this.selectedYear.value ?? undefined,
        this.accountId,
        month
      );
    }
  }

  private onYearChange(year: number | null): void {
    if (year !== null && this.accountId !== '') {
      this.summaryService.fetchMonths(this.accountId, year);
      this.summaryService.fetchGraph(
        year,
        this.accountId,
        this.selectedMonth.value ?? getCurrentMonth()
      );
    }
  }
}
