# Story AP.6: Implementation - Add Filtering by Date Range

## Story

**As a** user
**I want** to filter sold positions by date range
**So that** I can view positions sold within specific time periods for tax reporting

## Context

**Current System:**

- Story AP.5 created RED unit tests
- All sold positions display without filtering
- Need date range controls for tax year analysis

**Problem:**

- Users need to filter positions by sell date
- Tax reporting requires viewing specific date ranges
- Need UI controls for date selection

## Acceptance Criteria

### Functional Requirements

- [ ] Date range picker controls added to UI
- [ ] Start date filter works correctly
- [ ] End date filter works correctly
- [ ] Both filters work together
- [ ] Clear filters button resets to show all
- [ ] Date filters persist when switching accounts
- [ ] Loading state during filter application

### Technical Requirements

- [ ] Re-enable tests from AP.5
- [ ] All unit tests pass (GREEN)
- [ ] Use Angular Material date picker
- [ ] Use signals for date filter state
- [ ] Computed signal for filtered positions

## Implementation Approach

### Step 1: Re-enable Tests from AP.5

Remove `.skip` from date filtering tests in `sold-positions.component.spec.ts`:

```typescript
describe('Date Range Filtering', () => {
  // Tests now active
});
```

### Step 2: Run Tests (Should Still Fail)

```bash
pnpm nx test dms-material --testFile=sold-positions.component.spec.ts
```

### Step 3: Add Date Filter Signals to Component

Update `apps/dms-material/src/app/features/account/components/sold-positions/sold-positions.component.ts`:

```typescript
import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-sold-positions',
  templateUrl: './sold-positions.component.html',
  styleUrls: ['./sold-positions.component.scss'],
  standalone: true,
  imports: [CommonModule, MatTableModule, MatProgressSpinnerModule, MatDatepickerModule, MatNativeDateModule, MatFormFieldModule, MatInputModule, MatButtonModule],
})
export class SoldPositionsComponent implements OnInit {
  private tradesEffects = inject(TradesEffects);
  private accountsEffects = inject(AccountsEffects);

  // Date filter signals
  startDate = signal<string | null>(null);
  endDate = signal<string | null>(null);

  // Derived signals for date picker values (convert string back to Date for UI binding)
  startDateValue = computed(() => {
    const dateStr = this.startDate();
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  });

  endDateValue = computed(() => {
    const dateStr = this.endDate();
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  });

  // Computed signal with date filtering
  displayedPositions = computed(() => {
    const allTrades = this.tradesEffects.entities();
    const selectedAccountId = this.accountsEffects.selectedAccountId();
    const startDateFilter = this.startDate();
    const endDateFilter = this.endDate();

    let filtered = allTrades.filter((trade) => trade.sell_date !== null).filter((trade) => trade.accountId === selectedAccountId);

    // Apply date filters using string comparison (YYYY-MM-DD is lexicographically comparable)
    if (startDateFilter) {
      filtered = filtered.filter((trade) => trade.sell_date! >= startDateFilter);
    }

    if (endDateFilter) {
      filtered = filtered.filter((trade) => trade.sell_date! <= endDateFilter);
    }

    return filtered.map((trade) => {
      const capitalGain = (trade.sell_price - trade.purchase_price) * trade.quantity;
      const percentGain = trade.purchase_price && trade.purchase_price !== 0 ? ((trade.sell_price - trade.purchase_price) / trade.purchase_price) * 100 : 0;
      const gainLossType = capitalGain > 0 ? 'gain' : capitalGain < 0 ? 'loss' : 'neutral';

      return {
        ...trade,
        capitalGain,
        percentGain,
        gainLossType,
        formattedCapitalGain: this.formatCurrency(capitalGain),
        formattedPercentGain: Number.isFinite(percentGain) ? `${percentGain.toFixed(2)}%` : 'N/A',
        formattedPurchaseDate: this.formatDate(trade.purchase_date),
        formattedSellDate: this.formatDate(trade.sell_date!),
      };
    });
  });

  loading = computed(() => this.tradesEffects.loading());

  constructor() {
    // React to account changes and reload trades
    effect(() => {
      const selectedAccountId = this.accountsEffects.selectedAccountId();
      if (selectedAccountId) {
        this.tradesEffects.loadByIds([selectedAccountId]);
      }
    });
  }

  ngOnInit(): void {
    // Initial load handled by effect in constructor
  }

  onStartDateChange(date: Date | null): void {
    if (date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      this.startDate.set(`${year}-${month}-${day}`);
    } else {
      this.startDate.set(null);
    }
  }

  onEndDateChange(date: Date | null): void {
    if (date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      this.endDate.set(`${year}-${month}-${day}`);
    } else {
      this.endDate.set(null);
    }
  }

  clearFilters(): void {
    this.startDate.set(null);
    this.endDate.set(null);
    // Note: UI inputs will clear automatically because they're bound to startDateValue/endDateValue computed signals
  }

  private formatDate(date: string): string {
    // Parse YYYY-MM-DD string as local date to avoid timezone shifts
    const [year, month, day] = date.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    return localDate.toLocaleDateString();
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  }
}
```

### Step 4: Add Date Filter UI

Update `apps/dms-material/src/app/features/account/components/sold-positions/sold-positions.component.html`:

```html
<div class="date-filters">
  <mat-form-field appearance="outline">
    <mat-label>Start Date</mat-label>
    <input matInput [matDatepicker]="startPicker" [value]="startDateValue()" (dateChange)="onStartDateChange($event.value)" />
    <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
    <mat-datepicker #startPicker></mat-datepicker>
  </mat-form-field>

  <mat-form-field appearance="outline">
    <mat-label>End Date</mat-label>
    <input matInput [matDatepicker]="endPicker" [value]="endDateValue()" (dateChange)="onEndDateChange($event.value)" />
    <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
    <mat-datepicker #endPicker></mat-datepicker>
  </mat-form-field>

  <button mat-raised-button (click)="clearFilters()">Clear Filters</button>
</div>

@if (loading()) {
<mat-spinner diameter="40"></mat-spinner>
} @else {
<table mat-table [dataSource]="displayedPositions()" class="positions-table">
  <!-- ... existing columns ... -->
</table>
}
```

### Step 5: Add CSS for Date Filters

Update `apps/dms-material/src/app/features/account/components/sold-positions/sold-positions.component.scss`:

```scss
.date-filters {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  align-items: center;

  mat-form-field {
    flex: 0 0 200px;
  }

  button {
    margin-top: 4px;
  }
}

.positions-table {
  width: 100%;

  .gain {
    color: #4caf50;
    font-weight: 500;
  }

  .loss {
    color: #f44336;
    font-weight: 500;
  }

  .neutral {
    color: #757575;
  }

  td,
  th {
    text-align: right;

    &:first-child {
      text-align: left;
    }
  }
}
```

### Step 6: Run Tests (Should Pass)

```bash
pnpm nx test dms-material --testFile=sold-positions.component.spec.ts
```

**Expected Result:** All tests pass (GREEN)

### Step 7: Manual Testing

```bash
pnpm dev
```

Navigate to sold positions and verify:

- Date pickers appear and work
- Start date filter works
- End date filter works
- Both filters work together
- Clear filters button resets view
- Filters work when switching accounts

## Definition of Done

- [ ] Tests from AP.5 re-enabled
- [ ] All unit tests pass (GREEN)
- [ ] Date range picker implemented
- [ ] Start date filter works
- [ ] End date filter works
- [ ] Clear filters button works
- [ ] Filters persist across account changes
- [ ] CSS follows Material Design
- [ ] Manual testing completed
- [ ] Code reviewed
- [ ] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:dms-material`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## Notes

- Use Angular Material date picker for consistency
- Date filters use ISO 8601 format (YYYY-MM-DD) internally
- Consider adding preset date ranges (This Year, Last Year, etc.)
- Handle timezone considerations for accurate filtering

## Dependencies

- Story AP.5 completed
- Angular Material date picker available
- Component has computed signals implemented
