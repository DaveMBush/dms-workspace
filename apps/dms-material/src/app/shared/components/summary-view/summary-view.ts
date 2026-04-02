import { CurrencyPipe, PercentPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatOptionModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { currentAccountSignalStore } from '../../../store/current-account/current-account.signal-store';
import { AllocationChartComponent } from '../allocation-chart/allocation-chart';
import { PerformanceChartComponent } from '../performance-chart/performance-chart';
import { getCurrentMonth } from './get-current-month.function';
import { SummaryViewBase } from './summary-view.base';

@Component({
  selector: 'dms-summary-view',
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
  templateUrl: './summary-view.html',
  styleUrl: './summary-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col w-full h-full overflow-hidden' },
})
export class SummaryViewComponent extends SummaryViewBase implements OnInit {
  private readonly accountStore = inject(currentAccountSignalStore);
  private accountId = '';

  constructor() {
    super();
    const route = inject(ActivatedRoute);
    const routeMode = route.snapshot.data['mode'];
    if (routeMode === 'account' || routeMode === 'global') {
      this.mode = routeMode;
    }

    if (this.mode === 'account') {
      this.setupAccountWatcher();
    }
  }

  ngOnInit(): void {
    if (this.mode === 'global') {
      this.initGlobalMode();
    }
  }

  refreshData(): void {
    this.selectedMonth.disable({ emitEvent: false });
    this.summaryService.fetchSummary(
      this.selectedMonth.value ?? getCurrentMonth(),
      this.enableSelectors.bind(this)
    );
  }

  private setupAccountWatcher(): void {
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

  private initGlobalMode(): void {
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
      .subscribe(this.onGlobalYearChange.bind(this));

    this.selectedMonth.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(this.onGlobalMonthChange.bind(this));
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

  private onGlobalYearChange(year: number | null): void {
    if (year !== null) {
      this.summaryService.fetchGraph(year);
    }
  }

  private onGlobalMonthChange(month: string | null): void {
    if (month !== null) {
      this.selectedMonth.disable({ emitEvent: false });
      this.summaryService.fetchSummary(month, this.enableSelectors.bind(this));
    }
  }
}
