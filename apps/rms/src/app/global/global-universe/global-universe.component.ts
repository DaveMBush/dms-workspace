import { DatePipe, DecimalPipe , NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';

import { UniverseSyncService } from '../../shared/services/universe-sync.service';
import { selectAccounts } from '../../store/accounts/selectors/select-accounts.function';
import { Universe } from '../../store/universe/universe.interface';
import { UniverseSettingsService } from '../../universe-settings/universe-settings.service';
import { UpdateUniverseSettingsService } from '../../universe-settings/update-universe.service';
import { GlobalUniverseStorageService } from './global-universe-storage.service';
import { isRowDimmed } from './is-row-dimmed.function';
import { createSortComputedSignals } from './sort-computed-signals.function';
import { selectUniverse } from './universe.selector';
import { UniverseDataService } from './universe-data.service';


@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'rms-global-universe',
  standalone: true,
  imports: [TagModule, InputNumberModule, SelectModule, DatePipe, DecimalPipe, ToolbarModule, TableModule, DatePickerModule, FormsModule, ButtonModule, TooltipModule, NgClass, ToastModule, ProgressSpinnerModule],
  templateUrl: './global-universe.component.html',
  styleUrls: ['./global-universe.component.scss'],
  viewProviders: [GlobalUniverseStorageService, UpdateUniverseSettingsService, MessageService]
})
export class GlobalUniverseComponent {
  private readonly storageService = inject(GlobalUniverseStorageService);
  private readonly dataService = inject(UniverseDataService);
  private readonly updateUniverseService = inject(UpdateUniverseSettingsService);
  private readonly universeSyncService = inject(UniverseSyncService);
  private readonly messageService = inject(MessageService);
  readonly today = new Date();
  readonly isUpdatingFields = signal<boolean>(false);
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- computed signals work better with arrow functions
  readonly isUpdatingFields$ = computed(() => this.isUpdatingFields());
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- computed signals work better with arrow functions
  readonly isSyncingUniverse$ = computed(() => this.universeSyncService.isSyncing());
  readonly showOverlay$ = signal<boolean>(false);
  readonly overlayText = signal<string>('');
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- computed signals work better with arrow functions
  readonly overlayText$ = computed(() => this.overlayText());
  sortCriteria = signal<Array<{field: string, order: number}>>(this.storageService.loadSortCriteria());
  minYieldFilter = signal<number | null>(this.storageService.loadMinYieldFilter());
  selectedAccountId = signal<string>(this.storageService.loadSelectedAccountId());
  riskGroupFilter = signal<string | null>(this.storageService.loadRiskGroupFilter());
  expiredFilter = signal<boolean | null>(this.storageService.loadExpiredFilter());
  symbolFilter = signal<string>(this.storageService.loadSymbolFilter());
  riskGroups = [
    { label: 'Equities', value: 'Equities' },
    { label: 'Income', value: 'Income' },
    { label: 'Tax Free', value: 'Tax Free Income' }
  ];

  expiredOptions = [
    { label: 'Yes', value: true },
    { label: 'No', value: false }
  ];

  searchSymbol = '';
  protected readonly settingsService = inject(UniverseSettingsService);

  // Account options for the dropdown
  accountOptions$ = computed(function accountOptionsComputed() {
    const accounts = selectAccounts();
    const options = [
      { label: 'All Accounts', value: 'all' }
    ];

    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      options.push({
        label: account.name,
        value: account.id
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
      expiredFilter: this.expiredFilter()
    });
  });

  updateFields(): void {
    const self = this;
    this.isUpdatingFields.set(true);
    this.showOverlay$.set(true);
    this.overlayText.set('Updating field information...');
    
    this.updateUniverseService.updateFields()
      .subscribe({
        next: function updateFieldsNext() {
          self.isUpdatingFields.set(false);
          self.showOverlay$.set(false);
        },
        complete: function updateFieldsComplete() {
          self.isUpdatingFields.set(false);
          self.showOverlay$.set(false);
        },
        error: function updateFieldsError() {
          self.isUpdatingFields.set(false);
          self.showOverlay$.set(false);
        }
      });
  }

  syncUniverse(): void {
    const self = this;
    this.showOverlay$.set(true);
    this.overlayText.set('Updating universe from screener...');
    
    this.universeSyncService.syncFromScreener().subscribe({
      // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
      next: (summary) => {
        self.showOverlay$.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Universe Updated',
          detail: `Successfully updated universe from Screener. ${summary.inserted} inserted, ${summary.updated} updated, ${summary.markedExpired} expired.`
        });
      },
      // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
      error: () => {
        self.showOverlay$.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Update Failed',
          detail: 'Failed to update universe from Screener. Please try again.'
        });
      }
    });
  }

  onEditDistributionComplete(row: Universe): void {
    const universe = this.dataService.findUniverseBySymbol(row.symbol);
    if (universe) {
      universe.distribution = row.distribution;
    }
  }

  onEditDistributionsPerYearComplete(row: Universe): void {
    const universe = this.dataService.findUniverseBySymbol(row.symbol);
    if (universe) {
      universe.distributions_per_year = row.distributions_per_year;
    }
  }

  onEditDateComplete(row: Universe): void {
    const universe = this.dataService.findUniverseBySymbol(row.symbol);
    if (universe) {
      universe.ex_date = (typeof row.ex_date === 'object' && row.ex_date !== null && (row.ex_date as unknown) instanceof Date)
        ? (row.ex_date as Date).toISOString()
        : row.ex_date;
    }
  }

  onEditComplete(event: {data: Record<string, unknown>, field: string}): void {
    // event.data: the row object
    // event.field: the field name (e.g., 'distribution')
    // event.originalEvent: the DOM event
    const universe = this.dataService.findUniverseBySymbol(event.data['symbol'] as string);
    if (universe) {
      // Update the field that was edited
      (universe as unknown as Record<string, unknown>)[event.field] = event.data[event.field];
    }
  }

  protected trackById(index: number, row: Universe): string {
    return row.id;
  }

  protected onEditCommit(row: Record<string, unknown>, field: string): void {
    const universe = this.dataService.findUniverseBySymbol(row['symbol'] as string);
    if (universe) {
      (universe as unknown as Record<string, unknown>)[field] = row[field];
    }
  }

  protected stopArrowKeyPropagation(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.stopPropagation();
    }
  }

    /**
   * Handles column sorting with multi-column support
   * Cycles through: ascending → descending → no sort (removed)
   */
  protected onSort(field: string): void {
    const currentCriteria = this.sortCriteria();
    const existingIndex = currentCriteria.findIndex(
      function findCriteria(criteria) { return criteria.field === field });

    if (existingIndex >= 0) {
      // Field exists in sort criteria - cycle through states
      const updatedCriteria = [...currentCriteria];
      const currentOrder = updatedCriteria[existingIndex].order;

      if (currentOrder === 1) {
        // Currently ascending, change to descending
        updatedCriteria[existingIndex].order = -1;
        this.sortCriteria.set(updatedCriteria);
        this.storageService.saveSortCriteria(updatedCriteria);
      } else {
        // Currently descending, remove from sort criteria
        updatedCriteria.splice(existingIndex, 1);
        this.sortCriteria.set(updatedCriteria);
        this.storageService.saveSortCriteria(updatedCriteria);
      }
    } else {
      // Field not in sort criteria, add as ascending
      const newCriteria = [...currentCriteria, { field, order: 1 }];
      this.sortCriteria.set(newCriteria);
      this.storageService.saveSortCriteria(newCriteria);
    }
    // The computed signal will automatically re-evaluate and apply sorting
  }

    /**
   * Gets the sort order (1, 2, 3, etc.) for a field in multi-column sort
   */
  protected getSortOrder(field: string): number | null {
    const currentCriteria = this.sortCriteria();
    const index = currentCriteria.findIndex(
      function findCriteria(criteria) { return criteria.field === field });

    return index >= 0 ? index + 1 : null;
  }

    /**
   * Handles min yield filter changes and saves to localStorage
   */
  protected onMinYieldFilterChange(): void {
    this.storageService.saveMinYieldFilter(this.minYieldFilter());
  }

  /**
   * Handles risk group filter changes and saves to localStorage
   */
  protected onRiskGroupFilterChange(): void {
    this.storageService.saveRiskGroupFilter(this.riskGroupFilter());
  }

    /**
   * Handles risk group filter changes from PrimeNG filter
   */
  protected onRiskGroupFilterChangeFromPrimeNG(value: string | null): void {
    this.riskGroupFilter.set(value);
    this.storageService.saveRiskGroupFilter(value);
  }

    /**
   * Handles expired filter changes and saves to localStorage
   */
  protected onExpiredFilterChange(): void {
    this.storageService.saveExpiredFilter(this.expiredFilter());
  }

    /**
   * Handles expired filter changes from PrimeNG filter
   */
  protected onExpiredFilterChangeFromPrimeNG(value: boolean | null): void {
    this.expiredFilter.set(value);
    this.storageService.saveExpiredFilter(value);
  }

    /**
   * Handles symbol filter changes and saves to localStorage
   */
  protected onSymbolFilterChange(): void {
    this.storageService.saveSymbolFilter(this.symbolFilter());
    // The filtering is handled by the computed signal universe$
  }

  /**
   * Handles selected account ID changes and saves to localStorage
   */
  protected onSelectedAccountIdChange(): void {
    this.storageService.saveSelectedAccountId(this.selectedAccountId());
  }

  // Create sort computed signals
  readonly sortSignals = createSortComputedSignals(this.sortCriteria, this.getSortOrder.bind(this));



  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  readonly universeWithDimmedState$ = computed(() => {
    const universes = this.universe$() as unknown as Universe[];
    return universes.map(function mapUniverse(universe) {
      return {
        ...universe,
        isDimmed: isRowDimmed(universe)
      };
    });
  });

}
