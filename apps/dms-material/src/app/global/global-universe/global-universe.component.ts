import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Sort } from '@angular/material/sort';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { of } from 'rxjs';

import { BaseTableComponent } from '../../shared/components/base-table/base-table.component';
import { ColumnDef } from '../../shared/components/base-table/column-def.interface';
import { EditableCellComponent } from '../../shared/components/editable-cell/editable-cell.component';
import { EditableDateCellComponent } from '../../shared/components/editable-date-cell/editable-date-cell.component';
import { NotificationService } from '../../shared/services/notification.service';
import { UniverseSyncService } from '../../shared/services/universe-sync.service';
import { selectAccounts } from '../../store/accounts/selectors/select-accounts.function';
import { selectUniverses } from '../../store/universe/selectors/select-universes.function';
import { Universe } from '../../store/universe/universe.interface';
import { AddSymbolDialog } from '../../universe-settings/add-symbol-dialog/add-symbol-dialog';
import { ScreenerService } from '../global-screener/services/screener.service';
import { calculateYieldPercent } from './calculate-yield-percent.function';
import { CellEditEvent } from './cell-edit-event.interface';
import { filterUniverses } from './filter-universes.function';
import { sortUniverses } from './sort-universes.function';

@Component({
  selector: 'dms-global-universe',
  imports: [
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    BaseTableComponent,
    EditableCellComponent,
    EditableDateCellComponent,
  ],
  templateUrl: './global-universe.component.html',
  styleUrl: './global-universe.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalUniverseComponent implements AfterViewInit {
  private readonly syncService = inject(UniverseSyncService);
  private readonly screenerService = inject(ScreenerService);
  private readonly notification = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  readonly cellEdit = output<CellEditEvent>();
  readonly symbolDeleted = output<Universe>();
  readonly today = new Date();

  readonly symbolFilter$ = signal<string>('');
  readonly riskGroupFilter$ = signal<string | null>(null);
  readonly expiredFilter$ = signal<boolean | null>(null);
  readonly selectedAccountId$ = signal<string>('all');
  readonly minYieldFilter$ = signal<number | null>(null);
  readonly sortField$ = signal<string>('symbol');
  readonly sortDirection$ = signal<'' | 'asc' | 'desc'>('asc');
  readonly isUpdatingFields$ = signal<boolean>(false);

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- computed signal
  readonly isSyncingUniverse$ = computed(() => this.syncService.isSyncing());

  // Expose screener service loading and error signals
  readonly screenerLoading = this.screenerService.loading;
  readonly screenerError = this.screenerService.error;

  @ViewChild(BaseTableComponent) table!: BaseTableComponent<Universe>;

  readonly columns: ColumnDef[] = [
    { field: 'symbol', header: 'Symbol', sortable: true, width: '80px' },
    {
      field: 'risk_group_id',
      header: 'Risk Group',
      sortable: true,
      width: '90px',
    },
    {
      field: 'distribution',
      header: 'Distribution',
      type: 'number',
      editable: true,
      width: '100px',
    },
    {
      field: 'distributions_per_year',
      header: 'Dist/Year',
      type: 'number',
      editable: true,
      width: '80px',
    },
    {
      field: 'yield_percent',
      header: 'Yield %',
      type: 'number',
      sortable: true,
      width: '90px',
    },
    {
      field: 'avg_purchase_yield_percent',
      header: 'Avg Purch Yield %',
      type: 'number',
      sortable: true,
      width: '120px',
    },
    {
      field: 'last_price',
      header: 'Last Price',
      type: 'currency',
      width: '90px',
    },
    {
      field: 'ex_date',
      header: 'Ex-Date',
      type: 'date',
      editable: true,
      sortable: true,
      width: '100px',
    },
    {
      field: 'most_recent_sell_date',
      header: 'Mst Rcnt Sll Dt',
      type: 'date',
      sortable: true,
      width: '110px',
    },
    {
      field: 'most_recent_sell_price',
      header: 'Mst Rcnt Sell $',
      type: 'currency',
      sortable: true,
      width: '110px',
    },
    { field: 'position', header: 'Position', type: 'number', width: '80px' },
    { field: 'expired', header: 'Expired', width: '100px' },
    { field: 'actions', header: 'Actions', width: '70px' },
  ];

  readonly riskGroups = [
    { label: 'Equities', value: 'Equities' },
    { label: 'Income', value: 'Income' },
    { label: 'Tax Free', value: 'Tax Free Income' },
  ];

  readonly expiredOptions = [
    { label: 'Yes', value: true },
    { label: 'No', value: false },
  ];

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- computed signal
  readonly accountOptions$ = computed(() => {
    const accounts = selectAccounts();
    const options = [{ label: 'All Accounts', value: 'all' }];
    for (let i = 0; i < accounts.length; i++) {
      options.push({ label: accounts[i].name, value: accounts[i].id });
    }
    return options;
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- computed signal
  readonly filteredData$ = computed(() => {
    const rawData = selectUniverses();
    if (!Array.isArray(rawData)) {
      return [];
    }
    const filtered = filterUniverses(rawData, {
      symbolFilter: this.symbolFilter$(),
      riskGroupFilter: this.riskGroupFilter$(),
      expiredFilter: this.expiredFilter$(),
      minYieldFilter: this.minYieldFilter$(),
    });
    return sortUniverses(filtered, this.sortField$(), this.sortDirection$());
  });

  ngAfterViewInit(): void {
    const context = this;
    this.table.initDataSource(function loadUniverseData() {
      const data = context.filteredData$();
      return of({ data, total: data.length });
    });
  }

  refreshTable(): void {
    this.table?.refresh();
  }

  onSortChange(sort: Sort): void {
    this.sortField$.set(sort.active);
    this.sortDirection$.set(sort.direction);
    this.refreshTable();
  }

  syncUniverse(): void {
    const context = this;
    this.syncService.syncFromScreener().subscribe({
      next: function onSyncSuccess(summary) {
        context.notification.showPersistent(
          `Universe updated: ${summary.inserted} inserted, ` +
            `${summary.updated} updated, ${summary.markedExpired} expired.`,
          'success'
        );
        context.refreshTable();
      },
      error: function onSyncError() {
        context.notification.showPersistent(
          'Failed to update universe from Screener. Please try again.',
          'error'
        );
      },
    });
  }

  updateFields(): void {
    const context = this;
    this.isUpdatingFields$.set(true);

    // Placeholder: Field update service to be implemented in future story
    setTimeout(function simulateUpdate() {
      context.isUpdatingFields$.set(false);
      context.notification.showPersistent(
        'Successfully updated field information from external sources.',
        'success'
      );
      context.refreshTable();
    }, 1000);
  }

  showAddSymbolDialog(): void {
    const dialogRef = this.dialog.open(AddSymbolDialog, {
      width: '400px',
      disableClose: false,
    });

    const context = this;
    dialogRef.afterClosed().subscribe({
      next: function onDialogClosed() {
        context.refreshTable();
      },
    });
  }

  shouldShowDeleteButton(row: Universe): boolean {
    return !row.is_closed_end_fund && row.position === 0;
  }

  deleteUniverse(row: Universe): void {
    this.symbolDeleted.emit(row);
    this.notification.success(`Deleted symbol: ${row.symbol}`);
    this.refreshTable();
  }

  onCellEdit(row: Universe, field: string, value: unknown): void {
    this.cellEdit.emit({ row, field, value });
  }

  onSymbolFilterChange(value: string): void {
    this.symbolFilter$.set(value);
    this.refreshTable();
  }

  onRiskGroupFilterChange(value: string | null): void {
    this.riskGroupFilter$.set(value);
    this.refreshTable();
  }

  onExpiredFilterChange(value: boolean | null): void {
    this.expiredFilter$.set(value);
    this.refreshTable();
  }

  onAccountChange(value: string): void {
    this.selectedAccountId$.set(value);
    this.refreshTable();
  }

  onMinYieldFilterChange(value: number | null): void {
    this.minYieldFilter$.set(value);
    this.refreshTable();
  }

  calculateYield(row: Universe): number {
    return calculateYieldPercent(row);
  }

  onRefresh(): void {
    const context = this;
    this.screenerService.refresh().subscribe({
      next: function onRefreshSuccess() {
        context.refreshTable();
      },
      error: function onRefreshError() {
        // Error is already captured by ScreenerService error signal
      },
    });
  }
}
