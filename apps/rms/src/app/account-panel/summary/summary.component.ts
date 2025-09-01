import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChartModule } from 'primeng/chart';
import { SelectModule } from 'primeng/select';

import { BaseSummaryComponent } from '../../shared/base-summary.component';
import { SummaryDisplayComponent } from '../../shared/summary-display.component';
import { Graph } from './graph.interface';
import { SummaryComponentService } from './summary-component.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'rms-summary',
  standalone: true,
  imports: [SelectModule, FormsModule, ChartModule, SummaryDisplayComponent],
  templateUrl: './summary.component.html',
  styleUrls: ['./summary.component.scss'],
  viewProviders: [SummaryComponentService],
})
export class SummaryComponent extends BaseSummaryComponent {
  summaryComponentService = inject(SummaryComponentService);
  summary$ = this.summaryComponentService.summary;
  selectedMonth = this.summaryComponentService.selectedMonth;
  months$ = this.summaryComponentService.months;

  getGraph(): Graph[] {
    return this.summaryComponentService.graph();
  }
}
