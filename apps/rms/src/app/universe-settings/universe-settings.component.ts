import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { Textarea } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';

import { FeatureFlagsService } from '../shared/services/feature-flags.service';
import { UniverseSyncService } from '../shared/services/universe-sync.service';
import { UniverseSettingsService } from './universe-settings.service';
import { UpdateUniverseSettingsService } from './update-universe.service';

@Component({
  selector: 'rms-universe-settings',
  templateUrl: './universe-settings.component.html',
  styleUrls: ['./universe-settings.component.scss'],
  standalone: true,
  imports: [DialogModule, ButtonModule, Textarea, FormsModule, ProgressSpinnerModule, ToastModule, MessageModule],
  viewProviders: [UpdateUniverseSettingsService, MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UniverseSettingsComponent {
  protected readonly settingsService = inject(UniverseSettingsService);
  protected readonly updateUniverseService = inject(UpdateUniverseSettingsService);
  protected readonly featureFlagsService = inject(FeatureFlagsService);
  protected readonly universeSyncService = inject(UniverseSyncService);
  protected readonly messageService = inject(MessageService);

  @ViewChild('equitySymbolsTextarea') equitySymbolsTextarea!: ElementRef<HTMLTextAreaElement>;
  equitySymbols = '';
  incomeSymbols = '';
  taxFreeIncomeSymbols = '';
  loading = false;

  // Error state management
  readonly errorMessage = signal<string | null>(null);

  // Feature flag and sync state
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- computed signals work better with arrow functions
  protected readonly isFeatureEnabled$ = computed(() => this.featureFlagsService.isUseScreenerForUniverseEnabled());
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- computed signals work better with arrow functions
  protected readonly isSyncing$ = computed(() => this.universeSyncService.isSyncing());

  // Computed signals for accessibility labels to avoid function calls in templates
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- computed signals work better with arrow functions
  protected readonly updateButtonAriaLabel$ = computed(() => this.getUpdateButtonAriaLabel());
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- computed signals work better with arrow functions
  protected readonly manualUpdateButtonAriaLabel$ = computed(() => this.getManualUpdateButtonAriaLabel());
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- computed signals work better with arrow functions
  protected readonly loadingAriaLabel$ = computed(() => this.getLoadingAriaLabel());
  
  // Computed signals for error state to avoid function calls in templates
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- computed signals work better with arrow functions
  protected readonly hasError$ = computed(() => this.errorMessage() !== null && this.errorMessage() !== '');
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- computed signals work better with arrow functions
  protected readonly errorText$ = computed(() => this.errorMessage() ?? '');

  updateUniverse$(): void {
    const self = this;
    this.errorMessage.set(null);
    this.loading = true;
    this.updateUniverseService.updateUniverse(this.equitySymbols, this.incomeSymbols, this.taxFreeIncomeSymbols)
      .subscribe({
        next: function updateUniverseNext() {
          self.settingsService.hide();
        },
        complete: function updateUniverseComplete() {
          self.loading = false;
        },
        error: function updateUniverseError() {
          self.loading = false;
          self.errorMessage.set('Unable to update universe. Please check your connection and try again.');
          self.announceToScreenReader('Error: Unable to update universe');
        }
      });
  }

  updateFields(): void {
    const self = this;
    this.errorMessage.set(null);
    this.loading = true;
    this.updateUniverseService.updateFields()
      .subscribe({
        next: function updateFieldsNext() {
          self.settingsService.hide();
        },
        complete: function updateFieldsComplete() {
          self.loading = false;
        },
        error: function updateFieldsError() {
          self.loading = false;
          self.errorMessage.set('Unable to update fields. Please check your connection and try again.');
          self.announceToScreenReader('Error: Unable to update fields');
        }
      });
  }


  useScreener$(): void {
    this.universeSyncService.syncFromScreener().subscribe({
      // eslint-disable-next-line @smarttools/no-anonymous-functions -- callback functions for subscribe
      next: (summary) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Universe Updated',
          detail: `Successfully updated universe from Screener. ${summary.inserted} inserted, ${summary.updated} updated, ${summary.markedExpired} expired.`
        });
        this.settingsService.hide();
      },
      // eslint-disable-next-line @smarttools/no-anonymous-functions -- callback functions for subscribe
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Update Failed',
          detail: 'Failed to update universe from Screener. Please try again.'
        });
      }
    });
  }

  onDialogShow(): void {
    const self = this;
    this.errorMessage.set(null); // Clear any previous errors when dialog opens
    setTimeout(function onDialogShowTimeout() {
      self.equitySymbolsTextarea.nativeElement.focus();
    });
  }

  // Accessibility helper methods
  getUpdateButtonAriaLabel(): string {
    if (this.isSyncing$()) {
      return 'Updating universe from screener, please wait';
    }
    return 'Update universe from screener service';
  }

  getManualUpdateButtonAriaLabel(): string {
    const hasSymbols = this.equitySymbols || this.incomeSymbols || this.taxFreeIncomeSymbols;
    if (!hasSymbols) {
      return 'Update universe - disabled, please enter at least one symbol';
    }
    return 'Update universe with entered symbols';
  }

  getLoadingAriaLabel(): string {
    if (this.isFeatureEnabled$()) {
      return 'Updating universe from screener, please wait';
    }
    return 'Updating universe with manual entries, please wait';
  }

  private announceToScreenReader(message: string): void {
    // Create temporary element for screen reader announcement
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'assertive');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    setTimeout(function removeAnnouncement() {
      document.body.removeChild(announcement);
    }, 1000);
  }
}
