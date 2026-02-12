# Story AO.4: Implementation - Implement Editable Cells for Quantity/Dates

## Story

**As a** user
**I want** to edit quantity, price, and purchase date directly in the open positions table
**So that** I can correct or update position information

## Context

**Current System:**

- Story AO.3 created RED unit tests
- Open positions table displays data
- Editable cell components exist

**Problem:**

- Cannot edit position data inline
- Need to enable editing functionality

## Acceptance Criteria

### Functional Requirements

- [ ] Clicking quantity cell makes it editable
- [ ] Clicking price cell makes it editable
- [ ] Clicking purchase_date cell makes it editable
- [ ] Changes saved on blur or Enter key
- [ ] Validation prevents invalid values
- [ ] Error messages shown for invalid input
- [ ] Loading indicator during save

### Technical Requirements

- [ ] Re-enable tests from AO.3
- [ ] All unit tests pass (GREEN)
- [ ] Use existing editable cell components
- [ ] Update via TradesEffects.update()
- [ ] Proper error handling

## Implementation Approach

### Step 1: Re-enable Tests from AO.3

```typescript
describe('Editable Cells', () => {
  // Tests now active
});
```

### Step 2: Run Tests (Should Fail)

```bash
pnpm nx test dms-material --testFile=open-positions.component.spec.ts
```

### Step 3: Implement Editable Cells

Update `open-positions.component.ts`:

```typescript
import { EditableCellComponent } from '../../../shared/components/editable-cell/editable-cell.component';
import { EditableDateCellComponent } from '../../../shared/components/editable-date-cell/editable-date-cell.component';

export class OpenPositionsComponent implements OnInit {
  private tradesEffects = inject(TradesEffects);

  errorMessage = signal<string>('');
  updating = signal<boolean>(false);

  updateQuantity(tradeId: string, newQuantity: number): void {
    if (newQuantity <= 0) {
      this.errorMessage.set('Quantity must be positive');
      return;
    }

    this.updating.set(true);
    this.tradesEffects
      .update({
        id: tradeId,
        quantity: newQuantity,
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

  updatePrice(tradeId: string, newPrice: number): void {
    if (newPrice <= 0) {
      this.errorMessage.set('Price must be positive');
      return;
    }

    this.updating.set(true);
    this.tradesEffects
      .update({
        id: tradeId,
        price: newPrice,
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

  updatePurchaseDate(tradeId: string, newDate: string): void {
    if (!this.isValidDate(newDate)) {
      this.errorMessage.set('Invalid date format');
      return;
    }

    this.updating.set(true);
    this.tradesEffects
      .update({
        id: tradeId,
        purchase_date: newDate,
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

  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }
}
```

Update template:

```html
<mat-table [dataSource]="displayedPositions()">
  <ng-container matColumnDef="quantity">
    <mat-header-cell *matHeaderCellDef>Quantity</mat-header-cell>
    <mat-cell *matCellDef="let trade">
      <app-editable-cell [value]="trade.quantity" [type]="'number'" (valueChange)="updateQuantity(trade.id, $event)" [disabled]="updating()" />
    </mat-cell>
  </ng-container>

  <ng-container matColumnDef="price">
    <mat-header-cell *matHeaderCellDef>Price</mat-header-cell>
    <mat-cell *matCellDef="let trade">
      <app-editable-cell [value]="trade.price" [type]="'number'" (valueChange)="updatePrice(trade.id, $event)" [disabled]="updating()" />
    </mat-cell>
  </ng-container>

  <ng-container matColumnDef="purchaseDate">
    <mat-header-cell *matHeaderCellDef>Purchase Date</mat-header-cell>
    <mat-cell *matCellDef="let trade">
      <app-editable-date-cell [value]="trade.purchase_date" (valueChange)="updatePurchaseDate(trade.id, $event)" [disabled]="updating()" />
    </mat-cell>
  </ng-container>
</mat-table>

@if (errorMessage()) {
<mat-error>{{ errorMessage() }}</mat-error>
}
```

### Step 4: Run Tests (Should Pass - GREEN)

```bash
pnpm nx test dms-material --testFile=open-positions.component.spec.ts
```

### Step 5: Run All Tests

```bash
pnpm nx test dms-material
```

### Step 6: Manual Testing

Verify:

- ✓ Click cell to edit
- ✓ Enter saves value
- ✓ Blur saves value
- ✓ Invalid values rejected
- ✓ Error messages shown
- ✓ No console errors

## Files Modified

| File                                                                                                    | Changes             |
| ------------------------------------------------------------------------------------------------------- | ------------------- |
| `apps/dms-material/src/app/features/account/components/open-positions/open-positions.component.ts`      | Add editing methods |
| `apps/dms-material/src/app/features/account/components/open-positions/open-positions.component.html`    | Add editable cells  |
| `apps/dms-material/src/app/features/account/components/open-positions/open-positions.component.spec.ts` | Re-enable tests     |

## Definition of Done

- [ ] Tests from AO.3 re-enabled
- [ ] All unit tests passing (GREEN)
- [ ] Inline editing works for all fields
- [ ] Validation working correctly
- [ ] Error handling working
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

- Use existing editable cell components
- Follow DMS app UX patterns
- Ensure proper TypeScript typing
- Handle async updates properly

## Dependencies

- Story AO.3 completed
- Editable cell components available
