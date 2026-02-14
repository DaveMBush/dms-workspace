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

| File                                                                                      | Changes             |
| ----------------------------------------------------------------------------------------- | ------------------- |
| `apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts`      | Add editing methods |
| `apps/dms-material/src/app/account-panel/open-positions/open-positions.component.spec.ts` | Re-enable tests     |

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

## Dev Agent Record

_This section populated by the development agent during implementation_

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-20250514)

### Debug Log References

**Build & Validation Issues:**

1. **Vitest vs Jest Mock Functions** - Initial tests used `jest.fn()` causing ReferenceError. Fixed by replacing with `vi.fn()` from vitest.

2. **Empty Lifecycle Method** - Removed empty `ngOnInit()` and `OnInit` interface per lint rules.

3. **RxJS Handler Context** - Initial implementation used `.bind(this)` causing 24 lint errors (unsafe any). Fixed by using named handler functions with explicit context pattern:

   ```typescript
   const context = this;
   const handler = function () {
     context.method();
   };
   ```

4. **Observable vs Promise Mocks** - Test mocks initially used `mockResolvedValue()` (Promise). Fixed to use `mockReturnValue(of([]))` (Observable) to match service signature.

5. **Production Build Type Errors** - TypeScript strict checking in production build failed with TS2352 errors on partial Trade objects. Fixed by adding double type assertion: `as unknown as Trade` for partial updates.

### Completion Notes List

- ✅ Re-enabled 8 unit tests from Story AO.3 (confirmed RED state with 34 failures across project)
- ✅ Implemented `updateQuantity()` method with validation and error handling
- ✅ Implemented `updatePrice()` method with validation and error handling
- ✅ Implemented `updatePurchaseDate()` method with date validation- ✅ Added `isValidDate()` helper for date validation
- ✅ Added `errorMessage` and `updating` signals for UI feedback
- ✅ Injected `TradeEffectsService` via `tradeEffectsServiceToken`
- ✅ All 26 component tests passing (GREEN state achieved)
- ✅ Fixed 25 lint errors (empty lifecycle method, unsafe any with bind)
- ✅ All 1048 project tests passing across 64 test files
- ✅ Production build successful with 1.11 MB initial bundle
- ✅ Code formatting applied via `pnpm format`
- ⚠️ E2E and dupcheck validation blocked by system file watcher limit (ENOSPC error - requires system configuration, not a code issue)

### File List

**Modified Files:**

- `apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts`

  - Added imports: `inject`, `tradeEffectsServiceToken`, `TradeEffectsService`
  - Added signals: `errorMessage = signal<string>('')`, `updating = signal<boolean>(false)`
  - Injected service: `tradesEffects = inject(tradeEffectsServiceToken)`
  - Added method: `updateQuantity(tradeId, newQuantity)` - validates positive value, calls `tradesEffects.update()`
  - Added method: `updatePrice(tradeId, newPrice)` - validates positive value, calls `tradesEffects.update()`
  - Added method: `updatePurchaseDate(tradeId, newDate)` - validates date format, calls `tradesEffects.update()`
  - Added method: `isValidDate(dateString)` - validates date format using Date constructor
  - Used RxJS subscribe pattern with context binding to avoid lint errors
  - Applied type casting `as unknown as Trade` for partial Trade objects in updates

- `apps/dms-material/src/app/account-panel/open-positions/open-positions.component.spec.ts`
  - Added imports: `of`, `throwError`, `delay` from rxjs, `vi` from vitest
  - Updated TestBed provider for `tradeEffectsServiceToken` with mock implementation
  - Re-enabled "Editable Cells" describe block (removed `.skip`) - Added 8 tests for editable cell functionality
  - Fixed mock setup to return Observables instead of Promises
  - Updated all tests to use `vi.fn()` instead of `jest.fn()`

### Status

**Current State:** Implementation complete, core validation passed

**Validation Results:**

- ✅ Unit tests: 26/26 passing
- ✅ All project tests: 1048 passing, 8 skipped
- ✅ Lint: All files pass
- ✅ Production build: Successful
- ✅ Format: Applied
- ⚠️ E2E tests: Blocked by system file watcher limit (ENOSPC)
- ⚠️ Dupcheck: Blocked by system file watcher limit (ENOSPC)

**Blocking Issues:**

- System file watcher limit reached (ENOSPC error). Requires user to increase inotify watchers limit:
  ```bash
  sudo sysctl fs.inotify.max_user_watches=524288
  sudo sysctl -p
  ```

**Next Steps:**

- User to resolve file watcher limit
- Re-run e2e and dupcheck validation
- Commit changes (awaiting user approval per initial instruction: "Do not commit until I say so")

## QA Results

Gate: PASS → docs/qa/gates/AO.4-implement-editable-cells.yml
