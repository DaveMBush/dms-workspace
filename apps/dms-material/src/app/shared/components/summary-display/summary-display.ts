import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewChild,
} from '@angular/core';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

@Component({
  selector: 'dms-summary-display',
  imports: [BaseChartDirective],
  templateUrl: './summary-display.html',
  styleUrl: './summary-display.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SummaryDisplayComponent {
  chartType$ = input<ChartType>('pie');
  data$ = input.required<ChartData>();
  options$ = input<ChartConfiguration['options']>({});
  height$ = input<string>('300px');
  title$ = input<string>('');
  legendPosition$ = input<'bottom' | 'left' | 'right' | 'top'>('bottom');
  showLegend$ = input<boolean>(true);

  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  chartData$ = computed(this.computeChartData.bind(this));

  hasData$ = computed(this.computeHasData.bind(this));

  chartOptions$ = computed(this.computeChartOptions.bind(this));

  // Expose signals as getters for template compatibility
  chartType = this.chartType$;
  chartData = this.chartData$;
  chartOptions = this.chartOptions$;
  hasData = this.hasData$;
  height = this.height$;

  refresh(): void {
    this.chart?.update();
  }

  private computeChartData(): ChartData {
    return this.data$();
  }

  private computeHasData(): boolean {
    const data = this.data$();
    if (data?.datasets?.length === undefined || data.datasets.length === 0) {
      return false;
    }
    const context = this;
    return data.datasets.some(function checkDataset(dataset) {
      return context.isArrayWithLength(dataset.data) && dataset.data.length > 0;
    });
  }

  private computeChartOptions(): ChartConfiguration['options'] {
    const titleText = this.title$();
    const baseOptions: ChartConfiguration['options'] = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: this.showLegend$(),
          position: this.legendPosition$(),
        },
        tooltip: {
          enabled: true,
        },
        title:
          titleText !== ''
            ? {
                display: true,
                text: titleText,
              }
            : undefined,
      },
    };

    const providedOptions = this.options$();
    return this.deepMerge(baseOptions, providedOptions);
  }

  private isArrayWithLength(value: unknown): value is unknown[] {
    return Array.isArray(value);
  }

  private deepMerge(
    target: ChartConfiguration['options'],
    source: ChartConfiguration['options']
  ): ChartConfiguration['options'] {
    if (source === null || source === undefined) {
      return target;
    }
    if (target === null || target === undefined) {
      return source;
    }

    const result = { ...target };

    for (const key of Object.keys(source) as (keyof typeof source)[]) {
      const sourceValue = source[key];
      const targetValue = result[key as keyof typeof result];

      if (
        this.isNonArrayObject(sourceValue) &&
        this.isNonArrayObject(targetValue)
      ) {
        (result as Record<string, unknown>)[key] = this.deepMerge(
          targetValue as ChartConfiguration['options'],
          sourceValue as ChartConfiguration['options']
        );
      } else if (sourceValue !== undefined) {
        (result as Record<string, unknown>)[key] = sourceValue;
      }
    }

    return result;
  }

  private isNonArrayObject(value: unknown): value is object {
    return (
      value !== null &&
      value !== undefined &&
      typeof value === 'object' &&
      !Array.isArray(value)
    );
  }
}
