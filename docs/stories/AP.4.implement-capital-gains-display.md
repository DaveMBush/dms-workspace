# Story AP.4: Implementation - Display Capital Gains Calculations

## Story

**As a** user
**I want** to see capital gains/losses with clear visual indicators
**So that** I can quickly understand my trading performance

## Context

**Current System:**

- Story AP.3 created RED unit tests
- Basic capital gains calculated but not enhanced
- Need better formatting and visual cues

**Problem:**

- Users need to see gains vs losses at a glance
- Need formatted currency display
- Need percentage calculations alongside dollar amounts

## Acceptance Criteria

### Functional Requirements

- [ ] Capital gains display with dollar formatting
- [ ] Percent gain display with % symbol
- [ ] Positive gains show in green
- [ ] Negative losses show in red
- [ ] Zero gains show in neutral color
- [ ] Values align properly in table

### Technical Requirements

- [ ] Re-enable tests from AP.3
- [ ] All unit tests pass (GREEN)
- [ ] Use Intl.NumberFormat for currency formatting
- [ ] Add CSS classes for color coding
- [ ] Follow Material Design patterns

## Implementation Approach

### Step 1: Re-enable Tests from AP.3

Remove `.skip` from capital gains tests in `sold-positions.component.spec.ts`:

```typescript
describe('Capital Gains Display Logic', () => {
  // Tests now active
});
```

### Step 2: Run Tests (Should Still Fail)

```bash
pnpm nx test dms-material --testFile=sold-positions.component.spec.ts
```

### Step 3: Enhance Component Logic

Update `apps/dms-material/src/app/features/account/components/sold-positions/sold-positions.component.ts`:

```typescript
displayedPositions = computed(() => {
  const allTrades = this.tradesEffects.entities();
  const selectedAccountId = this.accountsEffects.selectedAccountId();

  return allTrades
    .filter((trade) => trade.sell_date !== null)
    .filter((trade) => trade.accountId === selectedAccountId)
    .map((trade) => {
      const capitalGain = (trade.sell_price - trade.purchase_price) * trade.quantity;
      const percentGain = trade.purchase_price && trade.purchase_price !== 0
        ? ((trade.sell_price - trade.purchase_price) / trade.purchase_price) * 100
        : 0;

      // Classify gain/loss type for styling
      const gainLossType = capitalGain > 0 ? 'gain' : capitalGain < 0 ? 'loss' : 'neutral';

      return {
        ...trade,
        capitalGain,
        percentGain,
        gainLossType,
        formattedCapitalGain: this.formatCurrency(capitalGain),
        formattedPercentGain: Number.isFinite(percentGain) ? `${percentGain.toFixed(2)}%` : 'N/A',
        formattedPurchaseDate: this.formatDate(trade.purchase_date),
        formattedSellDate: this.formatDate(trade.sell_date),
      };
    });
});

private formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}
```

### Step 4: Update Component Template

Update `apps/dms-material/src/app/features/account/components/sold-positions/sold-positions.component.html`:

```html
<!-- Capital Gain Column -->
<ng-container matColumnDef="capitalGain">
  <th mat-header-cell *matHeaderCellDef>Capital Gain</th>
  <td mat-cell *matCellDef="let position" [class.gain]="position.gainLossType === 'gain'" [class.loss]="position.gainLossType === 'loss'" [class.neutral]="position.gainLossType === 'neutral'">{{ position.formattedCapitalGain }}</td>
</ng-container>

<!-- Percent Gain Column -->
<ng-container matColumnDef="percentGain">
  <th mat-header-cell *matHeaderCellDef>% Gain/Loss</th>
  <td mat-cell *matCellDef="let position" [class.gain]="position.gainLossType === 'gain'" [class.loss]="position.gainLossType === 'loss'" [class.neutral]="position.gainLossType === 'neutral'">{{ position.formattedPercentGain }}</td>
</ng-container>
```

### Step 5: Add CSS Styling

Update `apps/dms-material/src/app/features/account/components/sold-positions/sold-positions.component.scss`:

```scss
.positions-table {
  width: 100%;

  .gain {
    color: #4caf50; // Material green
    font-weight: 500;
  }

  .loss {
    color: #f44336; // Material red
    font-weight: 500;
  }

  .neutral {
    color: #757575; // Material grey
  }

  td,
  th {
    text-align: right;

    &:first-child {
      text-align: left; // Symbol column left-aligned
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

- Capital gains show with $ formatting
- Percent gains show with % symbol
- Gains appear in green
- Losses appear in red
- Zero values appear in neutral color

## Definition of Done

- [ ] Tests from AP.3 re-enabled
- [ ] All unit tests pass (GREEN)
- [ ] Capital gains display with formatting
- [ ] Percent gains display correctly
- [ ] Color coding works (green/red/neutral)
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

- Color choices follow Material Design guidelines
- Currency formatting uses Intl.NumberFormat for localization
- Consider accessibility for color-blind users (use icons if needed)

## Dependencies

- Story AP.3 completed
- Material Design Angular components available
- CSS styling infrastructure in place
