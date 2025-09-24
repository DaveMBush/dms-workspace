import { DatePipe, DecimalPipe, NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';

import { EditableDateCellComponent } from '../../shared/editable-date-cell.component';
import { GlobalLoadingService } from '../../shared/services/global-loading.service';
import { UniverseSyncService } from '../../shared/services/universe-sync.service';
import { selectAccounts } from '../../store/accounts/selectors/select-accounts.function';
import { Universe } from '../../store/universe/universe.interface';
import { AddSymbolDialog } from '../../universe-settings/add-symbol-dialog/add-symbol-dialog';
import { UpdateUniverseSettingsService } from '../../universe-settings/update-universe.service';
import { DeleteUniverseHelper } from './delete-universe.helper';
import { createEditHandlers } from './edit-handlers.function';
import { createFilterHandlers } from './filter-handlers.function';
import { GlobalUniverseStorageService } from './global-universe-storage.service';
import { isRowDimmed } from './is-row-dimmed.function';
import { createSortComputedSignals } from './sort-computed-signals.function';
import { createSortingHandlers } from './sorting-handlers.function';
import { selectUniverse } from './universe.selector';
import { UniverseDataService } from './universe-data.service';

/**
 * Global Universe Component
 *
 * Displays and manages the universe of securities with icon-based controls for data updates.
 * Features direct access to universe field updates and full universe synchronization through
 * toolbar icons without modal dialogs.
 *
 * Key Features:
 * - Icon-based update controls (pi-refresh for fields, pi-sync for universe)
 * - Real-time data synchronization with external screener
 * - Sortable table with dimmed overlay during updates
 * - Toast notifications for operation feedback
 * - Always-enabled universe sync (no feature flag dependency)
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'rms-global-universe',
  standalone: true,
  imports: [
    TagModule,
    InputNumberModule,
    SelectModule,
    DatePipe,
    DecimalPipe,
    ToolbarModule,
    TableModule,
    DatePickerModule,
    FormsModule,
    ButtonModule,
    TooltipModule,
    NgClass,
    ToastModule,
    ProgressSpinnerModule,
    DialogModule,
    EditableDateCellComponent,
    AddSymbolDialog,
  ],
  templateUrl: './global-universe.component.html',
  styleUrls: ['./global-universe.component.scss'],
  viewProviders: [
    GlobalUniverseStorageService,
    UpdateUniverseSettingsService,
    MessageService,
    DeleteUniverseHelper,
  ],
})
export class GlobalUniverseComponent {
  private readonly storageService = inject(GlobalUniverseStorageService);
  private readonly dataService = inject(UniverseDataService);
  private readonly updateUniverseService = inject(
    UpdateUniverseSettingsService
  );

  readonly addSymbolDialog = viewChild.required(AddSymbolDialog);

  private readonly universeSyncService = inject(UniverseSyncService);
  protected readonly messageService = inject(MessageService);
  private readonly globalLoading = inject(GlobalLoadingService);
  readonly deleteHelper = inject(DeleteUniverseHelper);
  readonly today = new Date();
  readonly isUpdatingFields = signal<boolean>(false);
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- computed signals work better with arrow functions
  readonly isUpdatingFields$ = computed(() => this.isUpdatingFields());
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- computed signals work better with arrow functions
  readonly isSyncingUniverse$ = computed(() =>
    this.universeSyncService.isSyncing()
  );

  sortCriteria = signal<Array<{ field: string; order: number }>>(
    this.storageService.loadSortCriteria()
  );

  minYieldFilter = signal<number | null>(
    this.storageService.loadMinYieldFilter()
  );

  selectedAccountId = signal<string>(
    this.storageService.loadSelectedAccountId()
  );

  riskGroupFilter = signal<string | null>(
    this.storageService.loadRiskGroupFilter()
  );

  expiredFilter = signal<boolean | null>(
    this.storageService.loadExpiredFilter()
  );

  symbolFilter = signal<string>(this.storageService.loadSymbolFilter());

  riskGroups = [
    { label: 'Equities', value: 'Equities' },
    { label: 'Income', value: 'Income' },
    { label: 'Tax Free', value: 'Tax Free Income' },
  ];

  expiredOptions = [
    { label: 'Yes', value: true },
    { label: 'No', value: false },
  ];

  searchSymbol = '';

  // Account options for the dropdown
  accountOptions$ = computed(function accountOptionsComputed() {
    const accounts = selectAccounts();
    const options = [{ label: 'All Accounts', value: 'all' }];
    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      options.push({
        label: account.name,
        value: account.id,
      });
    }
    return options;
  });

  // Computed signal that automatically applies sorting when data changes
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  readonly universe$ = computed(() => {
    const rawData = selectUniverse();
    return this.dataService.filterAndSortUniverses({
      rawData,
      sortCriteria: this.sortCriteria(),
      minYield: this.minYieldFilter(),
      selectedAccount: this.selectedAccountId(),
      symbolFilter: this.symbolFilter(),
      riskGroupFilter: this.riskGroupFilter(),
      expiredFilter: this.expiredFilter(),
    });
  });

  updateFields(): void {
    const self = this;
    this.isUpdatingFields.set(true);
    this.globalLoading.show('Updating field information...');

    this.updateUniverseService.updateFields().subscribe({
      next: function updateFieldsNext() {
        self.isUpdatingFields.set(false);
        self.globalLoading.hide();
      },
      complete: function updateFieldsComplete() {
        self.isUpdatingFields.set(false);
        self.globalLoading.hide();
        self.messageService.add({
          severity: 'success',
          summary: 'Fields Updated',
          detail:
            'Successfully updated field information from external sources.',
          sticky: true,
        });
      },
      error: function updateFieldsError() {
        self.isUpdatingFields.set(false);
        self.globalLoading.hide();
        self.messageService.add({
          severity: 'error',
          summary: 'Update Failed',
          detail: 'Failed to update field information. Please try again.',
          sticky: true,
        });
      },
    });
  }

  syncUniverse(): void {
    const self = this;
    this.globalLoading.show('Updating universe from screener...');

    this.universeSyncService.syncFromScreener().subscribe({
      // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
      next: (summary) => {
        self.globalLoading.hide();
        this.messageService.add({
          severity: 'success',
          summary: 'Universe Updated',
          detail: `Successfully updated universe from Screener. ${summary.inserted} inserted, ${summary.updated} updated, ${summary.markedExpired} expired.`,
          sticky: true,
        });
      },
      // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
      error: () => {
        self.globalLoading.hide();
        this.messageService.add({
          severity: 'error',
          summary: 'Update Failed',
          detail: 'Failed to update universe from Screener. Please try again.',
          sticky: true,
        });
      },
    });
  }

  showAddSymbolDialog(): void {
    this.addSymbolDialog().show();
  }

  // Create filter handlers
  readonly filterHandlers = createFilterHandlers(this.storageService, {
    minYieldFilter: this.minYieldFilter,
    riskGroupFilter: this.riskGroupFilter,
    expiredFilter: this.expiredFilter,
    symbolFilter: this.symbolFilter,
    selectedAccountId: this.selectedAccountId,
  });

  // Create edit handlers
  readonly editHandlers = createEditHandlers(this.dataService);

  // Create sorting handlers
  readonly sortingHandlers = createSortingHandlers(
    this.sortCriteria,
    this.storageService
  );

  // Create sort computed signals
  readonly sortSignals = createSortComputedSignals(
    this.sortCriteria,
    this.sortingHandlers.getSortOrder.bind(this.sortingHandlers)
  );

  // Edit handlers are now provided by editHandlers object
  readonly onEditDistributionComplete =
    this.editHandlers.onEditDistributionComplete.bind(this.editHandlers);

  readonly onEditDistributionsPerYearComplete =
    this.editHandlers.onEditDistributionsPerYearComplete.bind(
      this.editHandlers
    );

  readonly onEditDateComplete = this.editHandlers.onEditDateComplete.bind(
    this.editHandlers
  );

  readonly onEditComplete = this.editHandlers.onEditComplete.bind(
    this.editHandlers
  );

  protected readonly onEditCommit = this.editHandlers.onEditCommit.bind(
    this.editHandlers
  );

  // Sorting handlers are now provided by sortingHandlers object
  protected readonly onSort = this.sortingHandlers.onSort.bind(
    this.sortingHandlers
  );

  protected readonly getSortOrder = this.sortingHandlers.getSortOrder.bind(
    this.sortingHandlers
  );

  // Filter handlers are now provided by filterHandlers object
  protected readonly onMinYieldFilterChange =
    this.filterHandlers.onMinYieldFilterChange.bind(this.filterHandlers);

  protected readonly onRiskGroupFilterChange =
    this.filterHandlers.onRiskGroupFilterChange.bind(this.filterHandlers);

  protected readonly onRiskGroupFilterChangeFromPrimeNG =
    this.filterHandlers.onRiskGroupFilterChangeFromPrimeNG.bind(
      this.filterHandlers
    );

  protected readonly onExpiredFilterChange =
    this.filterHandlers.onExpiredFilterChange.bind(this.filterHandlers);

  protected readonly onExpiredFilterChangeFromPrimeNG =
    this.filterHandlers.onExpiredFilterChangeFromPrimeNG.bind(
      this.filterHandlers
    );

  protected readonly onSymbolFilterChange =
    this.filterHandlers.onSymbolFilterChange.bind(this.filterHandlers);

  protected readonly onSelectedAccountIdChange =
    this.filterHandlers.onSelectedAccountIdChange.bind(this.filterHandlers);

  // Bind helper methods to avoid function calls in template
  readonly shouldShowDeleteButton =
    this.deleteHelper.shouldShowDeleteButton.bind(this.deleteHelper);

  readonly confirmDelete = this.deleteHelper.confirmDelete.bind(
    this.deleteHelper
  );

  protected trackById(index: number, row: Universe): string {
    return row.id;
  }

  protected stopArrowKeyPropagation(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.stopPropagation();
    }
  }

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  readonly universeWithDimmedState$ = computed(() => {
    const universes = this.universe$() as unknown as Universe[];
    return universes.map(function mapUniverse(universe) {
      return {
        ...universe,
        isDimmed: isRowDimmed(universe),
      };
    });
  });
}
