# Story AO.8: Implementation - Implement Auto-Close Logic When Sell/Sell_Date Filled

## Story

**As a** user
**I want** positions to automatically close when I fill in the sell date
**So that** sold positions are properly recorded and move to the sold positions tab

## Context

**Current System:**

- Story AO.7 created RED unit tests
- Open positions table displays open trades
- Need to close positions when sold

**Problem:**

- No automatic closing of positions
- Users need this to match DMS app behavior

## Acceptance Criteria

### Functional Requirements

- [ ] Sell and sell_date columns visible in table
- [ ] Editing sell price updates without closing
- [ ] Editing sell_date with sell price closes position
- [ ] Confirmation dialog shown before closing
- [ ] Validation: sell_date must be after purchase_date
- [ ] Validation: sell price required to close
- [ ] Position removed from open positions after close
- [ ] Capital gain calculated and displayed

### Technical Requirements

- [ ] Re-enable tests from AO.7
- [ ] All unit tests pass (GREEN)
- [ ] Use editable cells for sell fields
- [ ] Update via TradesEffects.update()
- [ ] Proper validation and confirmation

## Implementation Approach

### Step 1: Re-enable Tests from AO.7

```typescript
describe('Auto-Close Logic', () => {
  // Tests now active
});
```

### Step 2: Run Tests (Should Fail)

```bash
pnpm nx test dms-material --testFile=open-positions.component.spec.ts
```

### Step 3: Add Sell Columns to Table

Update `open-positions.component.ts`:

```typescript
export class OpenPositionsComponent {
  displayColumns = ['symbol', 'quantity', 'price', 'purchase_date', 'sell', 'sell_date', 'value', 'capitalGain'];

  // Computed signal for positions with capital gains
  displayedPositions = computed(() => {
    const allTrades = this.tradesEffects.entities();
    const selectedAccountId = this.accountsEffects.selectedAccountId();

    return allTrades
      .filter((trade) => trade.sell_date === null)
      .filter((trade) => trade.accountId === selectedAccountId)
      .map((trade) => ({
        ...trade,
        value: trade.quantity * trade.price,
        capitalGain: trade.sell ? (trade.sell - trade.price) * trade.quantity : 0,
        formattedDate: this.formatDate(trade.purchase_date),
      }));
  });

  updateSellPrice(tradeId: string, newSellPrice: number): void {
    if (newSellPrice <= 0) {
      this.errorMessage.set('Sell price must be positive');
      return;
    }

    this.updating.set(true);
    this.tradesEffects
      .update({
        id: tradeId,
        sell: newSellPrice,
      })
      .then(() => {
        this.updating.set(false);
        this.errorMessage.set('');
      })
      .catch((error) => {
        this.updating.set(false);
        this.errorMessage.set(`Update failed: ${error.message}`);
      });
  }

  async updateSellDate(tradeId: string, newSellDate: string): Promise<void> {
    // Find the trade
    const trade = this.tradesEffects.entities().find((t) => t.id === tradeId);
    if (!trade) {
      this.errorMessage.set('Trade not found');
      return;
    }

    // Validate date format
    if (!this.isValidDate(newSellDate)) {
      this.errorMessage.set('Invalid date format');
      return;
    }

    // Validate sell date is after purchase date
    if (new Date(newSellDate) <= new Date(trade.purchase_date)) {
      this.errorMessage.set('Sell date must be after purchase date');
      return;
    }

    // Require sell price to close position
    if (!trade.sell) {
      this.errorMessage.set('Sell price is required to close position');
      return;
    }

    // Confirm before closing
    const confirmed = confirm('Close this position?');
    if (!confirmed) {
      return;
    }

    this.updating.set(true);
    try {
      await this.tradesEffects.update({
        id: tradeId,
        sell_date: newSellDate,
      });
      this.updating.set(false);
      this.successMessage.set('Position closed successfully');
      setTimeout(() => this.successMessage.set(''), 3000);
    } catch (error: any) {
      this.updating.set(false);
      this.errorMessage.set(`Failed to close position: ${error.message}`);
    }
  }
}
```

### Step 4: Update Template

Update `open-positions.component.html`:

```html
<mat-table [dataSource]="displayedPositions()">
  <!-- Existing columns -->

  <ng-container matColumnDef="sell">
    <mat-header-cell *matHeaderCellDef>Sell Price</mat-header-cell>
    <mat-cell *matCellDef="let trade">
      <app-editable-cell [value]="trade.sell" [type]="'number'" (valueChange)="updateSellPrice(trade.id, $event)" [disabled]="updating()" [placeholder]="'--'" />
    </mat-cell>
  </ng-container>

  <ng-container matColumnDef="sell_date">
    <mat-header-cell *matHeaderCellDef>Sell Date</mat-header-cell>
    <mat-cell *matCellDef="let trade">
      <app-editable-date-cell [value]="trade.sell_date" (valueChange)="updateSellDate(trade.id, $event)" [disabled]="updating()" [placeholder]="'--'" />
    </mat-cell>
  </ng-container>

  <ng-container matColumnDef="capitalGain">
    <mat-header-cell *matHeaderCellDef>Capital Gain</mat-header-cell>
    <mat-cell *matCellDef="let trade">
      <span [class.positive]="trade.capitalGain > 0" [class.negative]="trade.capitalGain < 0"> {{ trade.capitalGain | currency }} </span>
    </mat-cell>
  </ng-container>
</mat-table>
```

Add styles for capital gain colors:

```scss
.positive {
  color: green;
}

.negative {
  color: red;
}
```

### Step 5: Run Tests (Should Pass - GREEN)

```bash
pnpm nx test dms-material --testFile=open-positions.component.spec.ts
```

### Step 6: Run All Tests

```bash
pnpm nx test dms-material
```

### Step 7: Manual Testing

Verify:

- ✓ Sell columns visible
- ✓ Can edit sell price without closing
- ✓ Filling sell_date shows confirmation
- ✓ Position closes after confirmation
- ✓ Validation prevents invalid dates
- ✓ Capital gain calculated correctly
- ✓ No console errors

## Files Modified

| File                                                                                                    | Changes                 |
| ------------------------------------------------------------------------------------------------------- | ----------------------- |
| `apps/dms-material/src/app/features/account/components/open-positions/open-positions.component.ts`      | Add auto-close logic    |
| `apps/dms-material/src/app/features/account/components/open-positions/open-positions.component.html`    | Add sell columns        |
| `apps/dms-material/src/app/features/account/components/open-positions/open-positions.component.scss`    | Add capital gain styles |
| `apps/dms-material/src/app/features/account/components/open-positions/open-positions.component.spec.ts` | Re-enable tests         |

## Definition of Done

- [ ] Tests from AO.7 re-enabled
- [ ] All unit tests passing (GREEN)
- [ ] Auto-close logic working correctly
- [ ] Validation working
- [ ] Confirmation dialog working
- [ ] Capital gains calculated
- [ ] Visual feedback for gains/losses
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

- Match DMS app UX exactly
- Use confirm dialog (or Material confirm dialog if preferred)
- Ensure proper TypeScript typing
- Handle async operations properly
- Consider adding toast notification on successful close

## Dependencies

- Story AO.7 completed
- Editable cell components available
- TradesEffects.update() working
