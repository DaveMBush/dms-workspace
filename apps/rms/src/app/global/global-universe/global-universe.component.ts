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

@Component({
  selector: 'app-global-universe',
  standalone: true,
  imports: [TagModule, InputNumberModule, SelectModule, DatePipe, DecimalPipe, ToolbarModule, TableModule, DatePickerModule, FormsModule, ButtonModule, TooltipModule],
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
  public searchSymbol = '';
  protected readonly settingsService = inject(UniverseSettingsService);

  public onEditDistributionComplete(row: Universe) {
    console.log('onEditDistributionComplete', row);
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
    console.log('Edit committed:', event.data, event.field, event);
  }

  public onEditCommit(row: Universe, field: string) {
    const universes = selectUniverses();
    for (let i = 0; i < universes.length; i++) {
      if (universes[i].symbol === row.symbol) {
        (universes[i] as any)[field] = (row as any)[field];
        break;
      }
    }
    console.log('Cell edit committed:', row, field);
  }
}
