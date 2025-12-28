import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChartModule } from 'primeng/chart';
import { SelectModule } from 'primeng/select';

import { Graph } from '../../account-panel/summary/graph.interface';
import { BaseSummaryComponent } from '../../shared/base-summary.component';
import { SummaryDisplayComponent } from '../../shared/summary-display.component';
import { GlobalSummaryComponentService } from './global-summary-component.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'rms-global-summary',
  standalone: true,
  imports: [SelectModule, FormsModule, ChartModule, SummaryDisplayComponent],
  templateUrl: './global-summary.component.html',
  styleUrls: ['./global-summary.component.scss'],
  viewProviders: [GlobalSummaryComponentService],
})
export class GlobalSummaryComponent extends BaseSummaryComponent {
  globalSummaryComponentService = inject(GlobalSummaryComponentService);
  summary$ = this.globalSummaryComponentService.summary;
  selectedMonth = this.globalSummaryComponentService.selectedMonth;
  months$ = this.globalSummaryComponentService.months;

  getGraph(): Graph[] {
    return this.globalSummaryComponentService.graph();
  }
}
