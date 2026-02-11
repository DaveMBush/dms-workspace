import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
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
import { enrichUniverseWithRiskGroups } from './enrich-universe-with-risk-groups.function';
import { filterUniverses } from './filter-universes.function';
import { UNIVERSE_COLUMNS } from './global-universe.columns';
import { EXPIRED_OPTIONS } from './global-universe.expired-options';
import { UniverseService } from './services/universe.service';
import { UniverseValidationService } from './services/universe-validation.service';

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
  private readonly validationService = inject(UniverseValidationService);
  private readonly globalLoading = inject(GlobalLoadingService);
  private readonly notification = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly updateFieldsService = inject(UpdateUniverseFieldsService);
  private readonly errorHandling = inject(ErrorHandlingService);
  private readonly cdr = inject(ChangeDetectorRef);
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

  readonly expiredOptions = EXPIRED_OPTIONS;

  readonly calculateYield = calculateYieldPercent;

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
  readonly riskGroupOptions$ = computed(() => {
    const riskGroups = selectRiskGroup();
    const options: { label: string; value: string }[] = [];
    for (let i = 0; i < riskGroups.length; i++) {
      options.push({ label: riskGroups[i].name, value: riskGroups[i].id });
    }
    return options;
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- computed signal
  readonly filteredData$ = computed(() => {
    const rawData = this.universeService.universes();
    const riskGroups = selectRiskGroup();

    if (!Array.isArray(rawData)) {
      return [];
    }

    const enrichedData = enrichUniverseWithRiskGroups(rawData, riskGroups);

    return filterUniverses(enrichedData, {
      symbolFilter: this.symbolFilter$(),
      riskGroupFilter: this.riskGroupFilter$(),
      expiredFilter: this.expiredFilter$(),
      minYieldFilter: this.minYieldFilter$(),
    });
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- computed signal
  readonly showEmptyState$ = computed(() => {
    return !this.screenerLoading() && this.filteredData$().length === 0;
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

  onCellEdit(row: Universe, field: keyof Universe, value: unknown): void {
    // Transform value based on field type before validation
    let transformedValue = value;
    if (field === 'ex_date') {
      transformedValue = this.validationService.transformExDateValue(value);
    }

    if (!this.validationService.validateFieldValue(field, transformedValue)) {
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
}
