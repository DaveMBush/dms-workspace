import { Component, inject } from '@angular/core';
import { ToolbarModule } from 'primeng/toolbar';
import { TableModule } from 'primeng/table';
import { selectUniverse } from './universe.selector';
import { DatePickerModule } from 'primeng/datepicker';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { Universe } from '../../store/universe/universe.interface';
import { selectUniverses } from '../../store/universe/universe.selectors';
import { InputNumberModule } from 'primeng/inputnumber';
import { UniverseSettingsService } from '../../universe-settings/universe-settings.service';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-global-universe',
  standalone: true,
  imports: [TagModule, InputNumberModule, SelectModule, DatePipe, DecimalPipe, ToolbarModule, TableModule, DatePickerModule, FormsModule, ButtonModule, TooltipModule, NgClass],
  templateUrl: './global-universe.component.html',
  styleUrls: ['./global-universe.component.scss'],
})
export class GlobalUniverseComponent {
  public readonly universe$ = selectUniverse;
  public readonly today = new Date();
  public riskGroups = [
    { label: 'Equities', value: 'Equities' },
    { label: 'Income', value: 'Income' },
    { label: 'Tax Free', value: 'Tax Free Income' }
  ];
  public expiredOptions = [
    { label: 'Yes', value: true },
    { label: 'No', value: false }
  ];
  public searchSymbol = '';
  protected readonly settingsService = inject(UniverseSettingsService);

  public onEditDistributionComplete(row: Universe) {
    const universes = selectUniverses();
    for (let i = 0; i < universes.length; i++) {
      if (universes[i].symbol === row.symbol) {
        universes[i].distribution = row.distribution;
        break;
      }
    }
  }

  public onEditDistributionsPerYearComplete(row: Universe) {
    const universes = selectUniverses();
    for (let i = 0; i < universes.length; i++) {
      if (universes[i].symbol === row.symbol) {
        universes[i].distributions_per_year = row.distributions_per_year;
        break;
      }
    }
  }

  public onEditDateComplete(row: Universe) {
    const universes = selectUniverses();
    for (let i = 0; i < universes.length; i++) {
      if (universes[i].symbol === row.symbol) {
        universes[i].ex_date = (typeof row.ex_date === 'object' && row.ex_date !== null && (row.ex_date as any) instanceof Date)
          ? (row.ex_date as any).toISOString()
          : row.ex_date;
        break;
      }
    }
  }

  public onEditComplete(event: any) {
    // event.data: the row object
    // event.field: the field name (e.g., 'distribution')
    // event.originalEvent: the DOM event
    const universes = selectUniverses();
    for (let i = 0; i < universes.length; i++) {
      if (universes[i].symbol === event.data.symbol) {
        // Update the field that was edited
        (universes[i] as any)[event.field] = event.data[event.field];
        break;
      }
    }
  }

  public onEditCommit(row: Universe, field: string) {
    const universes = selectUniverses();
    for (let i = 0; i < universes.length; i++) {
      if (universes[i].symbol === row.symbol) {
        (universes[i] as any)[field] = (row as any)[field];
        break;
      }
    }
  }

  stopArrowKeyPropagation(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.stopPropagation();
    }
  }

  /**
   * Returns true if the row should be dimmed: expired or most_recent_sell_date is today or previous trading day.
   */
  public isDimmed(row: Universe): boolean {
    if (row.expired) return true;
    if (!row.most_recent_sell_date) return false;
    const today = new Date();
    const mostRecent = new Date(row.most_recent_sell_date);
    // Normalize to yyyy-mm-dd
    const toYMD = (d: Date) => d.toISOString().slice(0, 10);
    if (toYMD(mostRecent) === toYMD(today)) return true;
    // Previous trading day logic
    let prev = new Date(today);
    prev.setDate(today.getDate() - 1);
    // If today is Monday, previous trading day is Friday
    if (today.getDay() === 1) {
      prev.setDate(today.getDate() - 3);
    }
    if (toYMD(mostRecent) === toYMD(prev)) return true;
    return false;
  }
}
