# Story AC.6: Create Summary Display Component (Charts)

## Story

**As a** user viewing portfolio summaries
**I want** charts displaying my investment data
**So that** I can visualize my portfolio allocation and performance

## Context

**Current System:**

- PrimeNG `p-chart` wrapping Chart.js
- Line charts and pie charts used

**Migration Target:**

- `ng2-charts` wrapping Chart.js
- Same chart types and configurations

## Acceptance Criteria

### Functional Requirements

- [ ] Line charts display performance over time
- [ ] Pie charts display allocation by category
- [ ] Charts respond to data changes
- [ ] Tooltips show data on hover
- [ ] Legend displayed when appropriate

### Technical Requirements

- [ ] Uses `ng2-charts` with `BaseChartDirective`
- [ ] Chart.js already installed (shared with current app)
- [ ] Same data format accepted
- [ ] Theme-aware colors

## Technical Approach

Create `apps/rms-material/src/app/shared/components/summary-display/summary-display.component.ts`:

```typescript
import { Component, input, computed, effect, signal, ViewChild } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType, ChartData } from 'chart.js';

@Component({
  selector: 'rms-summary-display',
  imports: [BaseChartDirective],
  template: `
    <div class="chart-container" [style.height]="height()">
      <canvas
        baseChart
        [type]="chartType()"
        [data]="chartData()"
        [options]="chartOptions()"
      ></canvas>
    </div>
  `,
  styles: [`
    .chart-container {
      position: relative;
      width: 100%;
    }
  `],
})
export class SummaryDisplayComponent {
  chartType = input<ChartType>('pie');
  data = input.required<ChartData>();
  options = input<ChartConfiguration['options']>({});
  height = input<string>('300px');

  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  chartData = computed(() => this.data());

  chartOptions = computed<ChartConfiguration['options']>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
      },
      tooltip: {
        enabled: true,
      },
    },
    ...this.options(),
  }));

  refresh(): void {
    this.chart?.update();
  }
}
```

### Usage Example

```typescript
// Line chart for performance
lineChartData: ChartData<'line'> = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
  datasets: [
    {
      label: 'Portfolio Value',
      data: [10000, 10500, 10200, 11000, 11500],
      borderColor: '#3B82F6',
      tension: 0.1,
    },
  ],
};

// Pie chart for allocation
pieChartData: ChartData<'pie'> = {
  labels: ['Stocks', 'Bonds', 'Cash'],
  datasets: [
    {
      data: [60, 30, 10],
      backgroundColor: ['#3B82F6', '#22C55E', '#F59E0B'],
    },
  ],
};
```

## Definition of Done

- [ ] Line charts render correctly
- [ ] Pie charts render correctly
- [ ] Tooltips work on hover
- [ ] Legend displays
- [ ] Charts resize responsively
- [ ] Theme colors applied
- [ ] All validation commands pass
