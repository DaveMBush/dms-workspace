import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  output,
  signal,
  viewChild,
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
import { handleSocketNotification } from '@smarttools/smart-signals';

import { BaseTableComponent } from '../../shared/components/base-table/base-table.component';
import { ColumnDef } from '../../shared/components/base-table/column-def.interface';
import { EditableCellComponent } from '../../shared/components/editable-cell/editable-cell.component';
import { EditableDateCellComponent } from '../../shared/components/editable-date-cell/editable-date-cell.component';
import { ErrorHandlingService } from '../../shared/services/error-handling.service';
import { GlobalLoadingService } from '../../shared/services/global-loading.service';
import { NotificationService } from '../../shared/services/notification.service';
import { SortColumn } from '../../shared/services/sort-column.interface';
import { SortFilterStateService } from '../../shared/services/sort-filter-state.service';
import { UniverseSyncService } from '../../shared/services/universe-sync.service';
import { UpdateUniverseFieldsService } from '../../shared/services/update-universe-fields.service';
import { selectAccounts } from '../../store/accounts/selectors/select-accounts.function';
import { selectRiskGroup } from '../../store/risk-group/selectors/select-risk-group.function';
import { Universe } from '../../store/universe/universe.interface';
import { AddSymbolDialogComponent } from '../../universe-settings/add-symbol-dialog/add-symbol-dialog';
import { ScreenerService } from '../global-screener/services/screener.service';
import { ImportDialogComponent } from '../import-dialog/import-dialog.component';
import { ImportDialogResult } from '../import-dialog/import-dialog-result.interface';
import { buildShiftSortColumns } from './build-shift-sort-columns.function';
import { calculateYieldPercent } from './calculate-yield-percent.function';
import { CellEditEvent } from './cell-edit-event.interface';
import { enrichUniverseWithRiskGroups } from './enrich-universe-with-risk-groups.function';
import { filterUniverses } from './filter-universes.function';
import { formatPosition } from './format-position.function';
import { UNIVERSE_COLUMNS } from './global-universe.columns';
import { EXPIRED_OPTIONS } from './global-universe.expired-options';
import { handleCellEdit } from './handle-cell-edit.function';
import { parseYieldValue } from './parse-yield-value.function';
import { restoreUniverseFilters } from './restore-universe-filters.function';
import { saveUniverseFiltersAndNotify } from './save-universe-filters-and-notify.function';
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
export class GlobalUniverseComponent implements OnDestroy {
  private readonly syncService = inject(UniverseSyncService);
  private readonly screenerService = inject(ScreenerService);
  private readonly universeService = inject(UniverseService);
  private readonly validationService = inject(UniverseValidationService);
  private readonly globalLoading = inject(GlobalLoadingService);
  private readonly notification = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly updateFieldsService = inject(UpdateUniverseFieldsService);
  private readonly errorHandling = inject(ErrorHandlingService);
  private readonly sortFilterStateService = inject(SortFilterStateService);
  readonly cellEdit = output<CellEditEvent>();
  readonly symbolDeleted = output<Universe>();
  readonly today = new Date();
  private readonly rf = restoreUniverseFilters(
    this.sortFilterStateService.loadFilterState('universes')
  );

  readonly symbolFilter$ = signal<string>(this.rf.symbol);
  readonly riskGroupFilter$ = signal<string | null>(this.rf.riskGroup);
  readonly expiredFilter$ = signal<boolean | null>(this.rf.expired);
  readonly selectedAccountId$ = signal<string>(this.rf.accountId);
  readonly minYieldFilter$ = signal<number | null>(this.rf.minYield);
  readonly sortColumns$ = signal<SortColumn[]>(
    this.sortFilterStateService.loadSortColumnsState('universes') ?? []
  );

  readonly visibleRange = signal({ start: 0, end: 50 });

  private readonly localSyncInProgress$ = signal<boolean>(false);
  private textFilterTimer?: ReturnType<typeof setTimeout>;
  private readonly baseTable = viewChild(BaseTableComponent);

  ngOnDestroy(): void {
    clearTimeout(this.textFilterTimer);
  }

  readonly isSyncingUniverse$ = computed(
    function computeIsUniverseSyncing(this: GlobalUniverseComponent) {
      return this.syncService.isSyncing() || this.localSyncInProgress$();
    }.bind(this)
  );

  readonly isUpdatingFields$ = this.updateFieldsService.isUpdating;

  // Expose screener service loading and error signals
  readonly screenerError$ = this.screenerService.error;
  readonly columns: ColumnDef[] = UNIVERSE_COLUMNS;

  readonly expiredOptions = EXPIRED_OPTIONS;

  readonly calculateYield = calculateYieldPercent;
  readonly formatPosition = formatPosition;

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

  // Server handles symbol/risk_group filtering; expired and yield % need client-side filtering.
  //
  // IMPORTANT — do NOT filter out placeholder rows (symbol === '') here.
  // SmartNgRX marks rows isLoading=true and buildPlaceholderUniverseEntry() returns symbol:''
  // as a temporary stand-in until the real data arrives from the server. CDK virtual scroll
  // requires a STABLE array length to calculate correct scroll-container height. Removing
  // placeholder rows before CDK sees the array causes the array length to fluctuate as rows
  // load, which re-introduces the blank-row / position-jump regression that has been fixed and
  // re-broken across Epics 29, 31, 44, 60, and 64. Placeholder rows render as blank cells for
  // a brief moment during loading — that is intentional and acceptable.
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- computed signal
  readonly filteredData$ = computed(() => {
    const rawData = this.universeService.universes();
    const riskGroups = selectRiskGroup();
    const vr = this.visibleRange();
    const enrichedData = enrichUniverseWithRiskGroups(rawData, riskGroups, vr);
    return filterUniverses(enrichedData, {
      symbolFilter: this.symbolFilter$(),
      riskGroupFilter: this.riskGroupFilter$(),
      expiredFilter: this.expiredFilter$(),
      minYieldFilter: this.minYieldFilter$(),
    });
  });

  onSortChange(sort: Sort): void {
    const shiftKey = this.baseTable()?.getLastShiftKey() ?? false;
    if (sort.direction === '' && !shiftKey) {
      this.sortColumns$.set([]);
      this.sortFilterStateService.clearSortColumnsState('universes');
      handleSocketNotification('top', 'update', ['1']);
      return;
    }
    const direction = sort.direction as 'asc' | 'desc';
    const newColumns = shiftKey
      ? buildShiftSortColumns(this.sortColumns$(), sort.active, direction)
      : [{ column: sort.active, direction }];
    this.sortColumns$.set(newColumns);
    this.sortFilterStateService.saveSortColumnsState('universes', newColumns);
    handleSocketNotification('top', 'update', ['1']);
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
    this.dialog.open(AddSymbolDialogComponent, {
      width: '400px',
      disableClose: false,
      autoFocus: 'dialog',
    });
  }

  openImportDialog(): void {
    const dialogRef = this.dialog.open(ImportDialogComponent, {
      width: '600px',
      disableClose: false,
      data: {
        accountFilter: this.selectedAccountId$(),
      },
    });

    const context = this;
    dialogRef.afterClosed().subscribe({
      next: function onImportDialogClosed(
        result: ImportDialogResult | undefined
      ) {
        if (result?.success === true) {
          context.notification.success(
            `Successfully imported ${result.imported} transactions`
          );
        }
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
    handleCellEdit(row, field, value, {
      validationService: this.validationService,
      emitCellEdit: this.cellEdit.emit.bind(this.cellEdit),
    });
    this.sortColumns$.set([...this.sortColumns$()]);
  }

  onSymbolFilterChange(value: string): void {
    this.symbolFilter$.set(value);
    this.debouncedNotifyFilterChange();
  }

  onRiskGroupFilterChange(value: string | null): void {
    this.riskGroupFilter$.set(value);
    this.notifyFilterChange();
  }

  onExpiredFilterChange(value: boolean | null): void {
    this.expiredFilter$.set(value);
    this.notifyFilterChange();
  }

  onAccountChange(value: string): void {
    this.selectedAccountId$.set(value);
    this.notifyFilterChange();
  }

  readonly parseYieldValue = parseYieldValue;

  onMinYieldFilterChange(value: number | null): void {
    this.minYieldFilter$.set(value);
    this.debouncedNotifyFilterChange();
  }

  onRefresh(): void {
    const context = this;
    this.screenerService.refresh().subscribe({
      next: function onRefreshSuccess() {
        context.notification.success('Universe data refreshed successfully');
      },
      // eslint-disable-next-line @typescript-eslint/no-empty-function -- Error is already captured by ScreenerService error signal
      error: function onRefreshError() {},
    });
  }

  private notifyFilterChange(): void {
    clearTimeout(this.textFilterTimer);
    this.textFilterTimer = undefined;
    saveUniverseFiltersAndNotify(this.sortFilterStateService, {
      symbol: this.symbolFilter$(),
      riskGroup: this.riskGroupFilter$(),
      expired: this.expiredFilter$(),
      minYield: this.minYieldFilter$(),
      accountId: this.selectedAccountId$(),
    });
  }

  private debouncedNotifyFilterChange(): void {
    clearTimeout(this.textFilterTimer);
    this.textFilterTimer = setTimeout(this.notifyFilterChange.bind(this), 300);
  }
}
