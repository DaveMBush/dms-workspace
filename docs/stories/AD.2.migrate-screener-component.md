# Story AD.2: Migrate Screener Component

## Story

**As a** user screening stocks for investment
**I want** to view and filter screened stocks in a Material table
**So that** I can identify potential investment opportunities

## Context

**Current System:**

- Location: `apps/dms/src/app/global/screener/`
- PrimeNG components: `p-table`, `p-toolbar`, `p-select`, `p-button`
- Displays screened stocks with filtering by various criteria

**Migration Target:**

- Base table with Material styling
- Material select for filters
- Material toolbar

## Acceptance Criteria

### Functional Requirements

- [ ] Screener data displays in table
- [ ] All GUI look as close to the existing DMS app as possible
- [ ] Filter by risk group, frequency, etc.
- [ ] Sortable columns
- [ ] Refresh button to re-run screener
- [ ] Add to universe action

### Technical Requirements

- [ ] Uses base table from AC.1
- [ ] SmartNgRX signal for screen data
- [ ] Filter controls in toolbar

## Test-Driven Development Approach

**Write tests BEFORE implementation code.**

### Step 1: Create Unit Tests First

Create `apps/dms-material/src/app/global/screener/screener.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Screener } from './screener';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('Screener', () => {
  let component: Screener;
  let fixture: ComponentFixture<Screener>;
  let mockNotification: { info: ReturnType<typeof vi.fn>; success: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockNotification = { info: vi.fn(), success: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [Screener, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(Screener);
    component = fixture.componentInstance;
  });

  it('should define columns for screener', () => {
    expect(component.columns.length).toBeGreaterThan(0);
    expect(component.columns.find((c) => c.field === 'symbol')).toBeTruthy();
  });

  it('should initialize filters to null', () => {
    expect(component.riskGroupFilter()).toBeNull();
    expect(component.frequencyFilter()).toBeNull();
  });

  it('should show notification on refresh', () => {
    component.onRefresh();
    expect(mockNotification.info).toHaveBeenCalledWith('Refreshing screener...');
  });

  it('should show success notification when adding to universe', () => {
    component.onAddToUniverse('AAPL');
    expect(mockNotification.success).toHaveBeenCalledWith('Added AAPL to universe');
  });

  it('should have risk groups defined', () => {
    expect(component.riskGroups.length).toBeGreaterThan(0);
  });

  it('should have frequencies defined', () => {
    expect(component.frequencies.length).toBeGreaterThan(0);
  });
});
```

**TDD Cycle:**

1. Run `pnpm nx run dms-material:test` - tests should fail (RED)
2. Implement minimal code to pass tests (GREEN)
3. Refactor while keeping tests passing (REFACTOR)

## Technical Approach

Create `apps/dms-material/src/app/global/screener/screener.ts`:

```typescript
import { Component, inject, signal } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';

import { BaseTableComponent, ColumnDef } from '../../shared/components/base-table/base-table.component';
import { selectScreen } from '../../store/screen/select-screen.function';
import { NotificationService } from '../../shared/services/notification.service';

@Component({
  selector: 'dms-screener',
  imports: [MatToolbarModule, MatButtonModule, MatIconModule, MatSelectModule, BaseTableComponent],
  templateUrl: './screener.html',
  styleUrl: './screener.scss',
})
export class Screener {
  private screenSignal = inject(selectScreen);
  private notification = inject(NotificationService);

  columns: ColumnDef[] = [
    { field: 'symbol', header: 'Symbol', sortable: true },
    { field: 'name', header: 'Name', sortable: true },
    { field: 'yield', header: 'Yield', type: 'number', sortable: true },
    { field: 'price', header: 'Price', type: 'currency', sortable: true },
    { field: 'frequency', header: 'Frequency', sortable: true },
    { field: 'riskGroup', header: 'Risk Group', sortable: true },
  ];

  riskGroupFilter = signal<string | null>(null);
  frequencyFilter = signal<string | null>(null);

  riskGroups = ['Low', 'Medium', 'High'];
  frequencies = ['Monthly', 'Quarterly', 'Annual'];

  onRefresh(): void {
    // Trigger screener refresh
    this.notification.info('Refreshing screener...');
  }

  onAddToUniverse(symbol: string): void {
    // Add symbol to universe
    this.notification.success(`Added ${symbol} to universe`);
  }
}
```

## Definition of Done

- [ ] Screener table displays data
- [ ] Filters work correctly
- [ ] Refresh triggers screener update
- [ ] Add to universe works
- [ ] All validation commands pass

## E2E Test Requirements

When this story is complete, ensure the following e2e tests exist in `apps/dms-material-e2e/`:

### Core Functionality

- [ ] Screener table displays screened stocks
- [ ] Risk group filter filters table data
- [ ] Frequency filter filters table data
- [ ] Refresh button updates screener results
- [ ] Add to universe action adds symbol
- [ ] Success notification shows after adding
- [ ] Sorting by columns works

### Edge Cases

- [ ] Multiple filters combined correctly (AND logic)
- [ ] Clear all filters returns to unfiltered state
- [ ] Filter state preserved during refresh
- [ ] No results state displays appropriate message
- [ ] Add already-existing symbol shows warning
- [ ] Bulk add multiple symbols works correctly
- [ ] Refresh during data load handled gracefully
- [ ] Network error during refresh shows retry
- [ ] Screener criteria changes trigger auto-refresh (if configured)
- [ ] Large result sets (1000+) perform well
- [ ] Export filtered results to CSV works
- [ ] Screen reader announces filter changes

Run `pnpm nx run dms-material-e2e:e2e` to verify all e2e tests pass.
