import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';

import { GlobalLoadingService } from '../../shared/services/global-loading.service';
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
  ],
  viewProviders: [ScreenerService],
  templateUrl: './screener.html',
  styleUrl: './screener.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Screener {
  screenerService = inject(ScreenerService);
  globalLoading = inject(GlobalLoadingService);

  riskGroups = [
    { label: 'Equities', value: 'Equities' },
    { label: 'Income', value: 'Income' },
    { label: 'Tax Free Income', value: 'Tax Free Income' },
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
      return row.risk_group === selectedRiskGroup.value;
    });
  });

  protected trackById(index: number, item: Screen): string {
    return item.id;
  }

  protected refresh(): void {
    const self = this;
    this.globalLoading.show('Refreshing data...');
    this.screenerService.refresh().subscribe({
      next: function refreshSubscribeNext() {
        self.globalLoading.hide();
      },
      error: function refreshSubscribeError() {
        self.globalLoading.hide();
      },
    });
  }

  protected updateScreener(
    id: string,
    field: keyof Screen,
    value: boolean
  ): void {
    this.screenerService.updateScreener(id, field, value);
  }
}
