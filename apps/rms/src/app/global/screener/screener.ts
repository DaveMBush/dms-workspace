import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolbarModule } from 'primeng/toolbar';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { ScreenerService } from './screener.service';

@Component({
  selector: 'app-screener',
  imports: [
    CommonModule,
    ToolbarModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    FormsModule
  ],
  viewProviders: [ScreenerService],
  templateUrl: './screener.html',
  styleUrl: './screener.scss',
})
export class Screener {
  screenerService = inject(ScreenerService);
  screenerData = signal([
    {
      id: 1,
      symbol: 'ABC',
      riskGroup: 'Equities',
      has_volitility: true,
      objectives_understood: true,
      graph_higher_before_2008: true
    },
    {
      id: 2,
      symbol: 'DEF',
      riskGroup: 'Income',
      has_volitility: false,
      objectives_understood: false,
      graph_higher_before_2008: false
    },
    {
      id: 3,
      symbol: 'GHI',
      riskGroup: 'Tax-Free',
      has_volitility: true,
      objectives_understood: true,
      graph_higher_before_2008: true
    }
  ]);

  riskGroups = [
    { label: 'Low', value: 'Low' },
    { label: 'Medium', value: 'Medium' },
    { label: 'High', value: 'High' }
  ];

  trackById(index: number, item: any): number {
    return item.id;
  }

  refresh() {
    this.screenerService.refresh().subscribe((data) => {
      console.log(data);
    });
  }
}
