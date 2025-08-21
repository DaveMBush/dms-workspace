import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
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
  imports: [DialogModule, ButtonModule, Textarea, FormsModule, ProgressSpinnerModule, ToastModule],
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

  // Feature flag and sync state
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- computed signals work better with arrow functions
  protected readonly isFeatureEnabled$ = computed(() => this.featureFlagsService.isUseScreenerForUniverseEnabled());
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- computed signals work better with arrow functions
  protected readonly isSyncing$ = computed(() => this.universeSyncService.isSyncing());

  updateUniverse$(): void {
    const self = this;
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
        }
      });
  }

  updateFields(): void {
    const self = this;
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
    setTimeout(function onDialogShowTimeout() {
      self.equitySymbolsTextarea.nativeElement.focus();
    });
  }
}
