import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolbarModule } from 'primeng/toolbar';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { ScreenerService } from './screener.service';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { CheckboxModule } from 'primeng/checkbox';
import { Screen } from '../../store/screen/screen.interface';

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
    if (!selectedRiskGroup) return data;
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
      error: (error) => {
        console.error('Refresh failed:', error);
        this.showOverlay.set(false);
      }
    });
  }

  updateScreener(id: string, field: keyof Screen, value: boolean) {
    this.screenerService.updateScreener(id, field, value);
  }
}
