# Story AD.3: Migrate Global Summary Component

## Story

**As a** user viewing overall portfolio performance
**I want** charts and statistics for my global portfolio
**So that** I can understand my total investment position

## Context

**Current System:**

- Location: `apps/rms/src/app/global/global-summary/`
- PrimeNG components: `p-chart`, `p-select`
- Displays pie charts and line charts

**Migration Target:**

- Summary display component (ng2-charts)
- Material select for filtering

## Acceptance Criteria

### Functional Requirements

- [ ] Pie chart shows allocation by risk group
- [ ] Line chart shows performance over time
- [ ] Filter by account or view all
- [ ] Summary statistics displayed

### Technical Requirements

- [ ] Uses summary display from AC.6
- [ ] SmartNgRX signals for data
- [ ] Responsive chart sizing

## Technical Approach

Create `apps/rms-material/src/app/global/global-summary/global-summary.component.ts`:

```typescript
import { Component, inject, computed } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';

import { SummaryDisplayComponent } from '../../shared/components/summary-display/summary-display.component';
import { selectAccounts } from '../../store/accounts/select-accounts.function';
import { ChartData } from 'chart.js';

@Component({
  selector: 'rms-global-summary',
  imports: [MatCardModule, MatSelectModule, SummaryDisplayComponent],
  templateUrl: './global-summary.component.html',
  styleUrl: './global-summary.component.scss',
})
export class GlobalSummaryComponent {
  private accountsSignal = inject(selectAccounts);

  allocationChartData = computed<ChartData<'pie'>>(() => {
    // Build chart data from accounts
    return {
      labels: ['Low Risk', 'Medium Risk', 'High Risk'],
      datasets: [
        {
          data: [40, 35, 25],
          backgroundColor: ['#22C55E', '#F59E0B', '#EF4444'],
        },
      ],
    };
  });

  performanceChartData = computed<ChartData<'line'>>(() => {
    return {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [
        {
          label: 'Portfolio Value',
          data: [100000, 102000, 101500, 105000, 108000, 110000],
          borderColor: '#3B82F6',
          tension: 0.2,
        },
      ],
    };
  });
}
```

## Definition of Done

- [ ] Allocation pie chart renders
- [ ] Performance line chart renders
- [ ] Account filter works
- [ ] Charts responsive to container
- [ ] All validation commands pass
