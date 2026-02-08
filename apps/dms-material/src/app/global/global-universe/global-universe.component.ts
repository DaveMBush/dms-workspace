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
import { selectRiskGroup } from '../../store/risk-group/selectors/select-risk-group.function';
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
import { UniverseService } from './services/universe.service';

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
  private readonly universeService = inject(UniverseService);
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
    const rawData = this.universeService.universes();
    const riskGroups = selectRiskGroup();

    // Create a map of risk group ID to name for fast lookup
    const riskGroupMap = new Map<string, string>();
    if (riskGroups !== null && riskGroups !== undefined && riskGroups.length > 0) {
      for (let i = 0; i < riskGroups.length; i++) {
        riskGroupMap.set(riskGroups[i].id, riskGroups[i].name);
      }
    }

    if (!Array.isArray(rawData)) {
      return [];
    }

    // Enrich universe data with risk group name
    // Must explicitly copy properties from Proxy to create plain objects
    const enrichedData = rawData.map(function enrichWithRiskGroup(universe) {
      return {
        id: universe.id,
        symbol: universe.symbol,
        distribution: universe.distribution,
        distributions_per_year: universe.distributions_per_year,
        last_price: universe.last_price,
        most_recent_sell_date: universe.most_recent_sell_date,
        most_recent_sell_price: universe.most_recent_sell_price,
        ex_date: universe.ex_date,
        risk_group_id: universe.risk_group_id,
        risk_group:
          riskGroupMap.get(universe.risk_group_id) ?? universe.risk_group_id,
        expired: universe.expired,
        is_closed_end_fund: universe.is_closed_end_fund,
        name: universe.name,
        position: universe.position,
      };
    });

    return filterUniverses(enrichedData, {
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
    // Transform value based on field type before validation
    let transformedValue = value;
    if (field === 'ex_date') {
      transformedValue = this.transformExDateValue(value);
    }

    if (!this.validateFieldValue(field, transformedValue)) {
      return;
    }

    // Find the actual universe object in the SmartNgRX store and update it
    // This triggers SmartNgRX to automatically save the changes
    const universes = selectUniverses();
    for (let i = 0; i < universes.length; i++) {
      if (universes[i].id === row.id) {
        // Update the field directly on the SmartNgRX managed object
        (universes[i] as unknown as Record<string, unknown>)[field] =
          transformedValue;
        break;
      }
    }

    // Emit event for any listeners (optional, for compatibility)
    this.cellEdit.emit({ row, field, value: transformedValue });
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

  parseYieldValue(value: string): number | null {
    if (!value || value.trim() === '') {
      return null;
    }
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
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
    // Allow null values to clear the date
    if (value === null) {
      return true;
    }

    if (typeof value !== 'string') {
      return true;
    }

    // Accept both YYYY-MM-DD and ISO DateTime formats
    const isoDateRegex =
      /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z)?$/;

    if (!isoDateRegex.test(value)) {
      this.notification.error('Invalid date format');
      return false;
    }

    return this.validateDateComponents(value);
  }

  private validateDateComponents(value: string): boolean {
    // Extract date components
    const datePart = value.split('T')[0];
    const parts = datePart.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    // Create Date object based on format
    const isUTC = value.includes('T') && value.endsWith('Z');
    const date = isUTC ? new Date(value) : new Date(year, month - 1, day);

    if (isNaN(date.getTime())) {
      this.notification.error('Invalid date value');
      return false;
    }

    // Verify parsed date matches input
    const parsedYear = isUTC ? date.getUTCFullYear() : date.getFullYear();
    const parsedMonth = isUTC ? date.getUTCMonth() + 1 : date.getMonth() + 1;
    const parsedDay = isUTC ? date.getUTCDate() : date.getDate();

    if (parsedYear !== year || parsedMonth !== month || parsedDay !== day) {
      this.notification.error('Invalid date format');
      return false;
    }

    return true;
  }

  private transformExDateValue(value: unknown): unknown {
    // Handle null explicitly
    if (value === null) {
      return null;
    }

    // Handle empty string - convert to null
    if (value === '') {
      return null;
    }

    // Handle Date objects
    if (value instanceof Date) {
      // Check if date is valid
      if (isNaN(value.getTime())) {
        // Return a string that will fail validation
        // This triggers the error in validateExDate
        return 'INVALID_DATE';
      }
      // Convert to ISO DateTime string for Prisma
      // Use UTC midnight to avoid timezone issues
      const utcDate = new Date(
        Date.UTC(
          value.getFullYear(),
          value.getMonth(),
          value.getDate(),
          0,
          0,
          0,
          0
        )
      );
      return utcDate.toISOString();
    }

    // Return string values as-is for validation
    return value;
  }
}
