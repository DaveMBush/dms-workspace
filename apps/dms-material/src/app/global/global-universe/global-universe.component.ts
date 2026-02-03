import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Sort } from '@angular/material/sort';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { BaseTableComponent } from '../../shared/components/base-table/base-table.component';
import { ColumnDef } from '../../shared/components/base-table/column-def.interface';
import { EditableCellComponent } from '../../shared/components/editable-cell/editable-cell.component';
import { EditableDateCellComponent } from '../../shared/components/editable-date-cell/editable-date-cell.component';
import { ErrorHandlingService } from '../../shared/services/error-handling.service';
import { GlobalLoadingService } from '../../shared/services/global-loading.service';
import { NotificationService } from '../../shared/services/notification.service';
import { UniverseSyncService } from '../../shared/services/universe-sync.service';
import { UpdateUniverseFieldsService } from '../../shared/services/update-universe-fields.service';
import { selectAccounts } from '../../store/accounts/selectors/select-accounts.function';
import { selectUniverses } from '../../store/universe/selectors/select-universes.function';
import { Universe } from '../../store/universe/universe.interface';
import { AddSymbolDialog } from '../../universe-settings/add-symbol-dialog/add-symbol-dialog';
import { ScreenerService } from '../global-screener/services/screener.service';
import { calculateYieldPercent } from './calculate-yield-percent.function';
import { CellEditEvent } from './cell-edit-event.interface';
import { filterUniverses } from './filter-universes.function';
import { UNIVERSE_COLUMNS } from './global-universe.columns';
import { EXPIRED_OPTIONS } from './global-universe.expired-options';
import { RISK_GROUPS } from './global-universe.risk-groups';

@Component({
  selector: 'dms-global-universe',
  imports: [
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    MatToolbarModule,
    MatButtonModule,
    MatCardModule,
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
export class GlobalUniverseComponent {
  private readonly syncService = inject(UniverseSyncService);
  private readonly screenerService = inject(ScreenerService);
  private readonly globalLoading = inject(GlobalLoadingService);
  private readonly notification = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly updateFieldsService = inject(UpdateUniverseFieldsService);
  private readonly errorHandling = inject(ErrorHandlingService);
  readonly cellEdit = output<CellEditEvent>();
  readonly symbolDeleted = output<Universe>();
  readonly today = new Date();
  readonly symbolFilter$ = signal<string>('');
  readonly riskGroupFilter$ = signal<string | null>(null);
  readonly expiredFilter$ = signal<boolean | null>(null);
  readonly selectedAccountId$ = signal<string>('all');
  readonly minYieldFilter$ = signal<number | null>(null);
  private readonly localSyncInProgress$ = signal<boolean>(false);
  readonly isSyncingUniverse$ = computed(
    function computeIsUniverseSyncing(this: GlobalUniverseComponent) {
      return this.syncService.isSyncing() || this.localSyncInProgress$();
    }.bind(this)
  );

  readonly isUpdatingFields$ = this.updateFieldsService.isUpdating;

  // Expose screener service loading and error signals
  readonly screenerLoading = this.screenerService.loading;
  readonly screenerError = this.screenerService.error;
  readonly columns: ColumnDef[] = UNIVERSE_COLUMNS;

  readonly riskGroups = RISK_GROUPS;

  readonly expiredOptions = EXPIRED_OPTIONS;

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
    return filterUniverses(rawData, {
      symbolFilter: this.symbolFilter$(),
      riskGroupFilter: this.riskGroupFilter$(),
      expiredFilter: this.expiredFilter$(),
      minYieldFilter: this.minYieldFilter$(),
    });
  });

  onSortChange(_: Sort): void {
    // code coming
  }

  syncUniverse(): void {
    // Set local guard immediately to prevent concurrent calls before change detection
    this.localSyncInProgress$.set(true);

    // Double-check after setting the guard (for extra safety with rapid clicks)
    if (this.syncService.isSyncing()) {
      this.localSyncInProgress$.set(false);
      return;
    }

    this.globalLoading.show('Updating universe from screener...');

    const context = this;
    this.syncService.syncFromScreener().subscribe({
      next: function onSyncSuccess(summary) {
        context.localSyncInProgress$.set(false);
        context.globalLoading.hide();
        const totalSymbols =
          summary.selectedCount ||
          summary.inserted + summary.updated + summary.markedExpired;
        context.notification.showPersistent(
          `Universe updated: ${summary.inserted} inserted, ` +
            `${summary.updated} updated, ${summary.markedExpired} expired ` +
            `(${totalSymbols} symbols processed).`,
          'success'
        );
      },
      error: function onSyncError(error: unknown) {
        context.localSyncInProgress$.set(false);
        context.errorHandling.handleOperationError(error, 'update universe');
      },
    });
  }

  updateFields(): void {
    this.globalLoading.show('Updating universe fields...');
    const context = this;
    this.updateFieldsService.updateFields().subscribe({
      next: function onUpdateSuccess(summary) {
        context.globalLoading.hide();
        context.notification.showPersistent(
          `Universe fields updated: ${summary.updated} entries updated.`,
          'success'
        );
      },
      error: function onUpdateError(error: unknown) {
        context.errorHandling.handleOperationError(error, 'update fields');
      },
    });
  }

  showAddSymbolDialog(): void {
    const dialogRef = this.dialog.open(AddSymbolDialog, {
      width: '400px',
      disableClose: false,
    });

    dialogRef.afterClosed().subscribe({
      next: function onDialogClosed() {
        // Table will automatically update via signals
      },
    });
  }

  shouldShowDeleteButton(row: Universe): boolean {
    return !row.is_closed_end_fund && row.position === 0;
  }

  deleteUniverse(row: Universe): void {
    this.symbolDeleted.emit(row);
    this.notification.success(`Deleted symbol: ${row.symbol}`);
  }

  onCellEdit(row: Universe, field: string, value: unknown): void {
    if (!this.validateFieldValue(field, value)) {
      return;
    }
    this.cellEdit.emit({ row, field, value });
  }

  onSymbolFilterChange(value: string): void {
    this.symbolFilter$.set(value);
  }

  onRiskGroupFilterChange(value: string | null): void {
    this.riskGroupFilter$.set(value);
  }

  onExpiredFilterChange(value: boolean | null): void {
    this.expiredFilter$.set(value);
  }

  onAccountChange(value: string): void {
    this.selectedAccountId$.set(value);
  }

  onMinYieldFilterChange(value: number | null): void {
    this.minYieldFilter$.set(value);
  }

  calculateYield(row: Universe): number {
    return calculateYieldPercent(row);
  }

  onRefresh(): void {
    const context = this;
    this.screenerService.refresh().subscribe({
      next: function onRefreshSuccess() {
        context.notification.success('Universe data refreshed successfully');
      },
      error: function onRefreshError() {
        // Error is already captured by ScreenerService error signal
      },
    });
  }

  private validateFieldValue(field: string, value: unknown): boolean {
    if (field === 'distribution') {
      return this.validateDistribution(value);
    }
    if (field === 'distributions_per_year') {
      return this.validateDistributionsPerYear(value);
    }
    if (field === 'ex_date') {
      return this.validateExDate(value);
    }
    return true;
  }

  private validateDistribution(value: unknown): boolean {
    if (typeof value === 'number' && value < 0) {
      this.notification.error('Distribution value cannot be negative');
      return false;
    }
    return true;
  }

  private validateDistributionsPerYear(value: unknown): boolean {
    if (typeof value !== 'number') {
      return true;
    }
    if (value < 0) {
      this.notification.error('Distributions per year cannot be negative');
      return false;
    }
    if (!Number.isInteger(value)) {
      this.notification.error('Distributions per year must be a whole number');
      return false;
    }
    return true;
  }

  private validateExDate(value: unknown): boolean {
    if (typeof value !== 'string') {
      return true;
    }

    const ERROR_MESSAGE = 'Invalid date format. Please use YYYY-MM-DD';
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (!isoDateRegex.test(value)) {
      this.notification.error(ERROR_MESSAGE);
      return false;
    }

    const date = new Date(value + 'T00:00:00Z');
    if (isNaN(date.getTime())) {
      this.notification.error(ERROR_MESSAGE);
      return false;
    }

    const parts = value.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() + 1 !== month ||
      date.getUTCDate() !== day
    ) {
      this.notification.error(ERROR_MESSAGE);
      return false;
    }

    return true;
  }
}
