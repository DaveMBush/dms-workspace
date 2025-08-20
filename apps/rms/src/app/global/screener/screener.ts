import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';

import { FeatureFlagsService } from '../../shared/services/feature-flags.service';
import { Screen } from '../../store/screen/screen.interface';
import { ScreenerService } from './screener.service';

@Component({
  selector: 'rms-screener',
  imports: [
    CheckboxModule,
    CommonModule,
    ToolbarModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    FormsModule,
    ProgressSpinnerModule,
    SelectModule,
    TagModule,
    ToastModule
  ],
  viewProviders: [ScreenerService, MessageService],
  templateUrl: './screener.html',
  styleUrl: './screener.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Screener {
  screenerService = inject(ScreenerService);
  featureFlags = inject(FeatureFlagsService);
  messageService = inject(MessageService);
  showOverlay$ = signal<boolean>(false);
  
  // Computed signals for template
  readonly isFeatureEnabled = computed(() => this.featureFlags.isUseScreenerForUniverseEnabled());
  readonly isSyncing = computed(() => this.screenerService.isSyncing());

  riskGroups = [
    { label: 'Equities', value: 'Equities' },
    { label: 'Income', value: 'Income' },
    { label: 'Tax Free Income', value: 'Tax Free Income' }
  ];

  selectedRiskGroup = signal<{ label: string; value: string } | null>(null);

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- hides this
  protected filteredScreenerData$ = computed(() => {
    const data = this.screenerService.screens();
    const selectedRiskGroup = this.selectedRiskGroup();
    if (!selectedRiskGroup) {
      return data;
    }
    return data.filter(function screenerFilter(row) {
      return row.risk_group === selectedRiskGroup.value
    });
  });

  protected trackById(index: number, item: Screen): string {
    return item.id;
  }

  protected refresh(): void {
    const self = this;
    this.showOverlay$.set(true);
    this.screenerService.refresh().subscribe({
      next: function refreshSubscribeNext() {
        self.showOverlay$.set(false);
      },
      error: function refreshSubscribeError() {
        self.showOverlay$.set(false);
      }
    });
  }

  protected updateScreener(id: string, field: keyof Screen, value: boolean): void {
    this.screenerService.updateScreener(id, field, value);
  }
  
  protected async syncFromScreener(): Promise<void> {
    try {
      await this.screenerService.syncFromScreener();
      
      const result = this.screenerService.lastSyncResult();
      if (result) {
        this.messageService.add({
          severity: 'success',
          summary: 'Sync Successful',
          detail: `Updated ${result.updated} records, inserted ${result.inserted} new records, and marked ${result.markedExpired} as expired.`,
          life: 5000
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.messageService.add({
        severity: 'error',
        summary: 'Sync Failed',
        detail: errorMessage,
        life: 8000
      });
    }
  }
  
  protected clearSyncState(): void {
    this.screenerService.clearSyncState();
  }
}
