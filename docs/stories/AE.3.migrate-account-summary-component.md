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

## Test-Driven Development Approach

**Write tests BEFORE implementation code.**

### Step 1: Create Unit Tests First

Create `apps/rms-material/src/app/account-panel/summary/summary.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SummaryComponent } from './summary.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('SummaryComponent', () => {
  let component: SummaryComponent;
  let fixture: ComponentFixture<SummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SummaryComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(SummaryComponent);
    component = fixture.componentInstance;
  });

  it('should compute allocation data', () => {
    fixture.detectChanges();
    const data = component.allocationData();
    expect(data.labels).toBeDefined();
    expect(data.datasets.length).toBeGreaterThan(0);
  });

  it('should compute performance data', () => {
    fixture.detectChanges();
    const data = component.performanceData();
    expect(data.labels).toBeDefined();
    expect(data.datasets.length).toBeGreaterThan(0);
  });

  it('should compute total value', () => {
    fixture.detectChanges();
    expect(component.totalValue()).toBeDefined();
  });

  it('should compute total gain', () => {
    fixture.detectChanges();
    expect(component.totalGain()).toBeDefined();
  });

  it('should compute gain percent', () => {
    fixture.detectChanges();
    expect(component.gainPercent()).toBeDefined();
  });

  it('should render summary display components', () => {
    fixture.detectChanges();
    const charts = fixture.nativeElement.querySelectorAll('rms-summary-display');
    expect(charts.length).toBeGreaterThan(0);
  });
});
```

**TDD Cycle:**

1. Run `pnpm nx run rms-material:test` - tests should fail (RED)
2. Implement minimal code to pass tests (GREEN)
3. Refactor while keeping tests passing (REFACTOR)

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

## E2E Test Requirements

When this story is complete, ensure the following e2e tests exist in `apps/rms-material-e2e/`:

### Core Functionality

- [ ] Allocation pie chart shows account-specific data
- [ ] Performance line chart shows account history
- [ ] Total value statistic displays correctly
- [ ] Total gain/loss displays correctly
- [ ] Percentage gain displays correctly
- [ ] Data is scoped to selected account

### Edge Cases

- [ ] Empty account (no positions) shows appropriate empty state
- [ ] Account with single position renders correctly
- [ ] Very large gain/loss values formatted correctly
- [ ] Negative gain displayed in red
- [ ] Percentage gain calculation handles edge cases (division by zero)
- [ ] Account switch updates all charts and statistics
- [ ] Real-time price updates reflected in statistics
- [ ] Print view renders charts and statistics correctly
- [ ] Dark theme applies correct colors
- [ ] Charts responsive on mobile viewport
- [ ] Statistics match detailed position calculations
- [ ] Historical performance data handles missing data points

Run `pnpm nx run rms-material-e2e:e2e` to verify all e2e tests pass.
