# Story AP.2: Implementation - Wire Sold Positions Table to Trades SmartNgRX

## Story

**As a** frontend developer
**I want** to wire the sold positions table to the trades SmartNgRX entity
**So that** users can see their actual closed trading positions from the database

## Context

**Current System:**

- Story AP.1 created RED unit tests
- Sold positions component exists but shows empty data
- TradesEffects SmartNgRX entity configured and working for open positions

**Problem:**

- Component not connected to real data
- Users cannot see their closed positions

## Acceptance Criteria

### Functional Requirements

- [ ] Component loads trades from SmartNgRX
- [ ] Only displays trades where sell_date is not null (closed positions)
- [ ] Filters by currently selected account
- [ ] Table updates when account changes
- [ ] Loading states displayed during data fetch
- [ ] Capital gains calculated and displayed

### Technical Requirements

- [ ] Re-enable tests from AP.1
- [ ] All unit tests pass (GREEN)
- [ ] Inject TradesEffects properly
- [ ] Use computed signals for filtering
- [ ] Follow SmartNgRX patterns

## Implementation Approach

### Step 1: Re-enable Tests from AP.1

Remove `.skip` from tests in `sold-positions.component.spec.ts`:

```typescript
describe('SoldPositionsComponent - SmartNgRX Integration', () => {
  // Tests now active
});
```

### Step 2: Run Tests (Should Still Fail)

```bash
pnpm nx test dms-material --testFile=sold-positions.component.spec.ts
```

### Step 3: Implement SmartNgRX Integration

Modify `apps/dms-material/src/app/features/account/components/sold-positions/sold-positions.component.ts`:

```typescript
import { Component, computed, inject, OnInit } from '@angular/core';
import { TradesEffects } from '../../../../state/trades/trades.effects';
import { AccountsEffects } from '../../../../state/accounts/accounts.effects';

@Component({
  selector: 'app-sold-positions',
  templateUrl: './sold-positions.component.html',
  styleUrls: ['./sold-positions.component.scss'],
  standalone: true,
  imports: [CommonModule, MatTableModule, MatProgressSpinnerModule],
})
export class SoldPositionsComponent implements OnInit {
  private tradesEffects = inject(TradesEffects);
  private accountsEffects = inject(AccountsEffects);

  // Computed signal for filtered sold positions with capital gains
  displayedPositions = computed(() => {
    const allTrades = this.tradesEffects.entities();
    const selectedAccountId = this.accountsEffects.selectedAccountId();

    return allTrades
      .filter((trade) => trade.sell_date !== null) // Sold positions only
      .filter((trade) => trade.accountId === selectedAccountId)
      .map((trade) => {
        const capitalGain = (trade.sell_price - trade.purchase_price) * trade.quantity;
        const percentGain = ((trade.sell_price - trade.purchase_price) / trade.purchase_price) * 100;

        return {
          ...trade,
          capitalGain,
          percentGain,
          formattedPurchaseDate: this.formatDate(trade.purchase_date),
          formattedSellDate: this.formatDate(trade.sell_date),
        };
      });
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

### Step 4: Update Component Template

Update `apps/dms-material/src/app/features/account/components/sold-positions/sold-positions.component.html`:

```html
@if (loading()) {
<mat-spinner diameter="40"></mat-spinner>
} @else {
<table mat-table [dataSource]="displayedPositions()" class="positions-table">
  <!-- Symbol Column -->
  <ng-container matColumnDef="symbol">
    <th mat-header-cell *matHeaderCellDef>Symbol</th>
    <td mat-cell *matCellDef="let position">{{ position.symbol }}</td>
  </ng-container>

  <!-- Quantity Column -->
  <ng-container matColumnDef="quantity">
    <th mat-header-cell *matHeaderCellDef>Quantity</th>
    <td mat-cell *matCellDef="let position">{{ position.quantity }}</td>
  </ng-container>

  <!-- Purchase Price Column -->
  <ng-container matColumnDef="purchasePrice">
    <th mat-header-cell *matHeaderCellDef>Purchase Price</th>
    <td mat-cell *matCellDef="let position">{{ position.purchase_price | currency }}</td>
  </ng-container>

  <!-- Sell Price Column -->
  <ng-container matColumnDef="sellPrice">
    <th mat-header-cell *matHeaderCellDef>Sell Price</th>
    <td mat-cell *matCellDef="let position">{{ position.sell_price | currency }}</td>
  </ng-container>

  <!-- Capital Gain Column -->
  <ng-container matColumnDef="capitalGain">
    <th mat-header-cell *matHeaderCellDef>Capital Gain</th>
    <td mat-cell *matCellDef="let position" [class.positive]="position.capitalGain > 0" [class.negative]="position.capitalGain < 0">{{ position.capitalGain | currency }}</td>
  </ng-container>

  <!-- Dates Columns -->
  <ng-container matColumnDef="purchaseDate">
    <th mat-header-cell *matHeaderCellDef>Purchase Date</th>
    <td mat-cell *matCellDef="let position">{{ position.formattedPurchaseDate }}</td>
  </ng-container>

  <ng-container matColumnDef="sellDate">
    <th mat-header-cell *matHeaderCellDef>Sell Date</th>
    <td mat-cell *matCellDef="let position">{{ position.formattedSellDate }}</td>
  </ng-container>

  <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
  <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
</table>
}
```

### Step 5: Run Tests (Should Pass)

```bash
pnpm nx test dms-material --testFile=sold-positions.component.spec.ts
```

**Expected Result:** All tests pass (GREEN)

### Step 6: Manual Testing

```bash
pnpm dev
```

Navigate to sold positions and verify:

- Trades with sell_date not null display
- Capital gains calculate correctly
- Changes when switching accounts

## Definition of Done

- [ ] Tests from AP.1 re-enabled
- [ ] All unit tests pass (GREEN)
- [ ] SmartNgRX integration complete
- [ ] Component displays sold positions correctly
- [ ] Capital gains display correctly
- [ ] Loading states work
- [ ] Manual testing completed
- [ ] Code reviewed
- [ ] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:dms-material`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## Notes

- Follow same patterns as open positions (AO.2)
- Capital gains calculations are (sell_price - purchase_price) \* quantity
- Percent gain is ((sell_price - purchase_price) / purchase_price) \* 100

## Dependencies

- Story AP.1 completed
- TradesEffects entity functional
- AccountsEffects entity functional
