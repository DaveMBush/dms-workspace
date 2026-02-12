# Story AO.2: Implementation - Wire Open Positions Table to Trades SmartNgRX

## Story

**As a** frontend developer
**I want** to wire the open positions table to the trades SmartNgRX entity
**So that** users can see their actual open trading positions from the database

## Context

**Current System:**

- Story AO.1 created RED unit tests
- Open positions component exists but shows mock data
- TradesEffects SmartNgRX entity configured

**Problem:**

- Component not connected to real data
- Users cannot see their actual positions

## Acceptance Criteria

### Functional Requirements

- [ ] Component loads trades from SmartNgRX
- [ ] Only displays trades where sell_date is null (open positions)
- [ ] Filters by currently selected account
- [ ] Table updates when account changes
- [ ] Loading states displayed during data fetch

### Technical Requirements

- [ ] Re-enable tests from AO.1
- [ ] All unit tests pass (GREEN)
- [ ] Inject TradesEffects properly
- [ ] Use computed signals for filtering
- [ ] Follow SmartNgRX patterns

## Implementation Approach

### Step 1: Re-enable Tests from AO.1

Remove `.skip` from tests in `open-positions.component.spec.ts`:

```typescript
describe('OpenPositionsComponent - SmartNgRX Integration', () => {
  // Tests now active
});
```

### Step 2: Run Tests (Should Still Fail)

```bash
pnpm nx test dms-material --testFile=open-positions.component.spec.ts
```

### Step 3: Implement SmartNgRX Integration

Modify `apps/dms-material/src/app/features/account/components/open-positions/open-positions.component.ts`:

```typescript
import { Component, computed, inject, OnInit } from '@angular/core';
import { TradesEffects } from '../../../../state/trades/trades.effects';
import { AccountsEffects } from '../../../../state/accounts/accounts.effects';

@Component({
  selector: 'app-open-positions',
  templateUrl: './open-positions.component.html',
  styleUrls: ['./open-positions.component.scss'],
  standalone: true,
  imports: [CommonModule, MatTableModule, MatProgressSpinnerModule],
})
export class OpenPositionsComponent implements OnInit {
  private tradesEffects = inject(TradesEffects);
  private accountsEffects = inject(AccountsEffects);

  // Computed signal for filtered positions
  displayedPositions = computed(() => {
    const allTrades = this.tradesEffects.entities();
    const selectedAccountId = this.accountsEffects.selectedAccountId();

    return allTrades
      .filter((trade) => trade.sell_date === null) // Open positions only
      .filter((trade) => trade.accountId === selectedAccountId)
      .map((trade) => ({
        ...trade,
        value: trade.quantity * trade.price,
        formattedDate: this.formatDate(trade.purchase_date),
      }));
  });

  loading = computed(() => this.tradesEffects.loading());

  ngOnInit(): void {
    // Load trades for current account
    this.tradesEffects.loadByIds([this.accountsEffects.selectedAccountId()]);
  }

  private formatDate(date: string): string {
    return new Date(date).toLocaleDateString();
  }
}
```

Update template to use signals:

```html
<div class="open-positions-container">
  @if (loading()) {
  <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
  } @else {
  <mat-table [dataSource]="displayedPositions()">
    <!-- Table columns -->
  </mat-table>
  }
</div>
```

### Step 4: Run Tests (Should Pass - GREEN)

```bash
pnpm nx test dms-material --testFile=open-positions.component.spec.ts
```

### Step 5: Run All Tests

```bash
pnpm nx test dms-material
```

### Step 6: Manual Testing with Playwright MPC

```bash
pnpm nx serve dms-material
```

Verify:

- ✓ Open positions load from database
- ✓ Only positions without sell_date shown
- ✓ Filtered by selected account
- ✓ Table updates when account changes
- ✓ No console errors

## Technical Approach

### Key Implementation Points

1. Inject TradesEffects and AccountsEffects
2. Create computed signal for filtered data
3. Load trades on init
4. Use template signals syntax (@if)
5. Handle loading states

### SmartNgRX Patterns

- Use `entities()` signal for data
- Use `loading()` signal for loading state
- Use `loadByIds()` for data fetching
- Use computed signals for derived data

## Files Modified

| File                                                                                                    | Changes                      |
| ------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `apps/dms-material/src/app/features/account/components/open-positions/open-positions.component.ts`      | Wire to SmartNgRX            |
| `apps/dms-material/src/app/features/account/components/open-positions/open-positions.component.html`    | Update template with signals |
| `apps/dms-material/src/app/features/account/components/open-positions/open-positions.component.spec.ts` | Re-enable tests              |

## Definition of Done

- [ ] Tests from AO.1 re-enabled
- [ ] All unit tests passing (GREEN)
- [ ] Component loads real data from backend
- [ ] Filtering by account works correctly
- [ ] Loading states working
- [ ] All existing tests still pass
- [ ] Lint passes
- [ ] Manual testing confirms functionality
- [ ] No console errors
- [ ] Code reviewed
- [ ] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:dms-material`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## Notes

- Follow patterns from existing SmartNgRX components
- Reference DMS app for expected behavior
- Ensure proper TypeScript typing
- Use Angular 18 signal syntax

## Dependencies

- Story AO.1 completed
- TradesEffects configured
- AccountsEffects configured
