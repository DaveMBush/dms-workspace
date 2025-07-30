import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';

import { Screen } from '../../store/screen/screen.interface';
import { ScreenerService } from './screener.service';

@Component({
  selector: 'app-screener',
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
    TagModule
  ],
  viewProviders: [ScreenerService],
  templateUrl: './screener.html',
  styleUrl: './screener.scss',
})
export class Screener {
  screenerService = inject(ScreenerService);
  showOverlay = signal(false);

  riskGroups = [
    { label: 'Equities', value: 'Equities' },
    { label: 'Income', value: 'Income' },
    { label: 'Tax Free Income', value: 'Tax Free Income' }
  ];

  selectedRiskGroup = signal<{ label: string; value: string } | null>(null);

  filteredScreenerData = computed(() => {
    const data = this.screenerService.screens();
    const selectedRiskGroup = this.selectedRiskGroup();
    if (!selectedRiskGroup) {return data;}
    return data.filter(row => row.risk_group === selectedRiskGroup.value);
  });

  trackById(index: number, item: any): number {
    return item.id;
  }

  refresh() {
    this.showOverlay.set(true);
    this.screenerService.refresh().subscribe({
      next: (data) => {
        console.log(data);
        this.showOverlay.set(false);
      },
      error: (error: unknown) => {
        console.error('Refresh failed:', error);
        this.showOverlay.set(false);
      }
    });
  }

  updateScreener(id: string, field: keyof Screen, value: boolean) {
    this.screenerService.updateScreener(id, field, value);
  }
}
