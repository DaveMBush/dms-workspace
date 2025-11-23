# Story AE.3: Migrate Account Summary Component

## Story

**As a** user viewing an account summary
**I want** charts and statistics for this account
**So that** I can understand my account's performance

## Context

**Current System:**

- Location: `apps/rms/src/app/account-panel/summary/`
- PrimeNG components: `p-chart`, `p-select`
- Shows allocation and performance for single account

**Migration Target:**

- Summary display component (ng2-charts)
- Account-specific data

## Acceptance Criteria

### Functional Requirements

- [ ] Pie chart shows account allocation
- [ ] Line chart shows account performance
- [ ] Summary statistics displayed
- [ ] Data scoped to current account

### Technical Requirements

- [ ] Uses summary display from AC.6
- [ ] SmartNgRX signals filtered by account
- [ ] Account ID from route/context

## Technical Approach

Create `apps/rms-material/src/app/account-panel/summary/summary.component.ts`:

```typescript
import { Component, inject, computed } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

import { SummaryDisplayComponent } from '../../shared/components/summary-display/summary-display.component';
import { selectTrades } from '../../store/trades/select-trades.function';
import { ChartData } from 'chart.js';

@Component({
  selector: 'rms-summary',
  imports: [MatCardModule, SummaryDisplayComponent],
  templateUrl: './summary.component.html',
  styleUrl: './summary.component.scss',
})
export class SummaryComponent {
  private tradesSignal = inject(selectTrades);

  allocationData = computed<ChartData<'pie'>>(() => {
    // Build from trades data
    return {
      labels: ['Open', 'Sold', 'Cash'],
      datasets: [{ data: [60, 30, 10], backgroundColor: ['#3B82F6', '#22C55E', '#F59E0B'] }],
    };
  });

  performanceData = computed<ChartData<'line'>>(() => {
    return {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
      datasets: [{ label: 'Value', data: [10000, 10500, 10200, 11000, 11500], borderColor: '#3B82F6' }],
    };
  });

  totalValue = computed(() => 11500);
  totalGain = computed(() => 1500);
  gainPercent = computed(() => 15);
}
```

## Definition of Done

- [ ] Charts render for account
- [ ] Data scoped to account
- [ ] Summary stats display
- [ ] All validation commands pass
