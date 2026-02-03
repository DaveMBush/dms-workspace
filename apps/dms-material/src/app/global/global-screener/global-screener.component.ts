import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  effect,
  inject,
  output,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { Sort } from '@angular/material/sort';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { BaseTableComponent } from '../../shared/components/base-table/base-table.component';
import { ColumnDef } from '../../shared/components/base-table/column-def.interface';
import { ErrorHandlingService } from '../../shared/services/error-handling.service';
import { GlobalLoadingService } from '../../shared/services/global-loading.service';
import { NotificationService } from '../../shared/services/notification.service';
import { Screen } from '../../store/screen/screen.interface';
import { ScreenCellEditEvent } from './screen-cell-edit-event.interface';
import { ScreenerService } from './services/screener.service';

@Component({
  selector: 'dms-global-screener',
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatCheckboxModule,
    MatTooltipModule,
    BaseTableComponent,
  ],
  templateUrl: './global-screener.component.html',
  styleUrl: './global-screener.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalScreenerComponent {
  private readonly globalLoading = inject(GlobalLoadingService);
  private readonly notification = inject(NotificationService);
  private readonly screenerService = inject(ScreenerService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly errorHandling = inject(ErrorHandlingService);

  constructor() {
    // Force change detection when filteredData$ changes
    effect(
      // eslint-disable-next-line @smarttools/no-anonymous-functions -- Required for effect
      () => {
        // Read the signal to track it and trigger change detection
        this.filteredData$();
        this.cdr.markForCheck();
      }
    );
  }

  readonly cellEdit = output<ScreenCellEditEvent>();
  readonly loading$ = this.screenerService.loading;
  readonly error = this.screenerService.error;

  readonly riskGroupFilter$ = signal<string | null>(null);

  readonly columns: ColumnDef[] = [
    { field: 'symbol', header: 'Symbol', sortable: true, width: '100px' },
    {
      field: 'risk_group',
      header: 'Risk Group',
      sortable: true,
      width: '120px',
    },
    {
      field: 'has_volitility',
      header: 'Has Volatility',
      type: 'boolean',
      width: '120px',
    },
    {
      field: 'objectives_understood',
      header: 'Objectives Understood',
      type: 'boolean',
      width: '160px',
    },
    {
      field: 'graph_higher_before_2008',
      header: 'Graph Higher Before 2008',
      type: 'boolean',
      width: '180px',
    },
  ];

  readonly riskGroups = [
    { label: 'Equities', value: 'Equities' },
    { label: 'Income', value: 'Income' },
    { label: 'Tax Free Income', value: 'Tax Free Income' },
  ];

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- computed signal
  readonly filteredData$ = computed(() => {
    const screens = this.screenerService.screens();
    const riskGroupFilter = this.riskGroupFilter$();

    if (riskGroupFilter === null) {
      return screens;
    }

    return screens.filter(function filterByRiskGroup(row) {
      return row.risk_group === riskGroupFilter;
    });
  });

  onSortChange(_: Sort): void {
    // Sorting is handled automatically by the table
  }

  onRefresh(): void {
    this.globalLoading.show('Refreshing screener data...');
    const context = this;
    this.screenerService.refresh().subscribe({
      next: function handleRefresh() {
        const errorValue = context.screenerService.error();
        if (errorValue === null || errorValue === '') {
          context.notification.show('Screener data refreshed successfully');
        }
        context.globalLoading.hide();
      },
      error: function handleError(error: unknown) {
        context.errorHandling.handleOperationError(
          error,
          'refresh screener data'
        );
      },
    });
  }

  onRiskGroupFilterChange(value: string | null): void {
    this.riskGroupFilter$.set(value);
  }

  onCellEdit(row: Screen, field: string, value: unknown): void {
    if (
      field === 'has_volitility' ||
      field === 'objectives_understood' ||
      field === 'graph_higher_before_2008'
    ) {
      this.screenerService.updateScreener(
        row.id,
        field as keyof Screen,
        value as boolean
      );
    }

    this.cellEdit.emit({ row, field, value });
  }

  getCefConnectUrl(symbol: string): string {
    return `https://www.cefconnect.com/fund/${symbol}`;
  }
}
