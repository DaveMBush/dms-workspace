import { CurrencyPipe, PercentPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { ChartModule } from 'primeng/chart';

interface SummaryData {
  deposits: number;
  dividends: number;
  capitalGains: number;
}

@Component({
  selector: 'rms-summary-display',
  standalone: true,
  imports: [CurrencyPipe, PercentPipe, ChartModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './summary-display.component.html',
})
export class SummaryDisplayComponent {
  summary = input.required<SummaryData>();
  compositionData = input.required<object>();
  compositionOptions = input.required<object>();

  // Signal aliases with $ suffix for template
  summary$ = this.summary;
  compositionData$ = this.compositionData;
  compositionOptions$ = this.compositionOptions;

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  percentIncrease$ = computed(() => {
    const s = this.summary();
    return (12 * (s.capitalGains + s.dividends)) / s.deposits;
  });
}
