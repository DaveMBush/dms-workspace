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

## Test-Driven Development Approach

**Write tests BEFORE implementation code.**

### Step 1: Create Unit Tests First

Create `apps/rms-material/src/app/global/global-summary/global-summary.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GlobalSummaryComponent } from './global-summary.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('GlobalSummaryComponent', () => {
  let component: GlobalSummaryComponent;
  let fixture: ComponentFixture<GlobalSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlobalSummaryComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(GlobalSummaryComponent);
    component = fixture.componentInstance;
  });

  it('should compute allocation chart data', () => {
    fixture.detectChanges();
    const chartData = component.allocationChartData();
    expect(chartData.labels).toBeDefined();
    expect(chartData.datasets.length).toBeGreaterThan(0);
  });

  it('should compute performance chart data', () => {
    fixture.detectChanges();
    const chartData = component.performanceChartData();
    expect(chartData.labels).toBeDefined();
    expect(chartData.datasets.length).toBeGreaterThan(0);
  });

  it('should have correct allocation labels', () => {
    fixture.detectChanges();
    const chartData = component.allocationChartData();
    expect(chartData.labels).toContain('Low Risk');
    expect(chartData.labels).toContain('Medium Risk');
    expect(chartData.labels).toContain('High Risk');
  });

  it('should render summary display components', () => {
    fixture.detectChanges();
    const charts = fixture.nativeElement.querySelectorAll('rms-summary-display');
    expect(charts.length).toBe(2); // pie and line
  });
});
```

**TDD Cycle:**

1. Run `pnpm nx run rms-material:test` - tests should fail (RED)
2. Implement minimal code to pass tests (GREEN)
3. Refactor while keeping tests passing (REFACTOR)

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

## E2E Test Requirements

When this story is complete, ensure the following e2e tests exist in `apps/rms-material-e2e/`:

- [ ] Allocation pie chart displays risk group breakdown
- [ ] Performance line chart displays over time
- [ ] Account filter changes displayed data
- [ ] Summary statistics display correctly
- [ ] Charts resize on window resize
- [ ] Navigation to global summary works

Run `pnpm nx run rms-material-e2e:e2e` to verify all e2e tests pass.
