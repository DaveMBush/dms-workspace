# Story AO.6: Implementation - Wire "Add New Position" Button and Dialog

## Story

**As a** user
**I want** to manually add new positions via a dialog
**So that** I can record positions that weren't automatically imported

## Context

**Current System:**

- Story AO.5 created RED unit tests
- Open positions table functional
- Need UI to add positions manually

**Problem:**

- No way to manually add positions
- Users need this for corrections or manual entries

## Acceptance Criteria

### Functional Requirements

- [ ] "Add New Position" button visible on screen
- [ ] Button opens dialog with form
- [ ] Form has fields: symbol, quantity, price, purchase_date
- [ ] Form validates required fields
- [ ] Save creates new trade record
- [ ] Cancel closes dialog without saving
- [ ] Success/error messages shown

### Technical Requirements

- [ ] Re-enable tests from AO.5
- [ ] All unit tests pass (GREEN)
- [ ] Use MatDialog service
- [ ] Create trade via TradesEffects.create()
- [ ] Proper form validation

## Implementation Approach

### Step 1: Re-enable Tests from AO.5

```typescript
describe('Add New Position Dialog', () => {
  // Tests now active
});
```

### Step 2: Run Tests (Should Fail)

```bash
pnpm nx test dms-material --testFile=open-positions.component.spec.ts
```

### Step 3: Create Dialog Component

Create `add-position-dialog.component.ts`:

```typescript
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

export interface AddPositionData {
  accountId: string;
}

@Component({
  selector: 'app-add-position-dialog',
  templateUrl: './add-position-dialog.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatDatepickerModule],
})
export class AddPositionDialogComponent {
  form: FormGroup;

  constructor(private fb: FormBuilder, private dialogRef: MatDialogRef<AddPositionDialogComponent>, @Inject(MAT_DIALOG_DATA) public data: AddPositionData) {
    this.form = this.fb.group({
      symbol: ['', [Validators.required]],
      quantity: [null, [Validators.required, Validators.min(1)]],
      price: [null, [Validators.required, Validators.min(0.01)]],
      purchase_date: ['', [Validators.required]],
    });
  }

  onSave(): void {
    if (this.form.valid) {
      this.dialogRef.close({
        ...this.form.value,
        accountId: this.data.accountId,
        sell_date: null,
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
```

Create template:

```html
<h2 mat-dialog-title>Add New Position</h2>

<mat-dialog-content>
  <form [formGroup]="form">
    <mat-form-field>
      <mat-label>Symbol</mat-label>
      <input matInput formControlName="symbol" placeholder="AAPL" />
      <mat-error *ngIf="form.get('symbol')?.hasError('required')"> Symbol is required </mat-error>
    </mat-form-field>

    <mat-form-field>
      <mat-label>Quantity</mat-label>
      <input matInput type="number" formControlName="quantity" />
      <mat-error *ngIf="form.get('quantity')?.hasError('required')"> Quantity is required </mat-error>
      <mat-error *ngIf="form.get('quantity')?.hasError('min')"> Quantity must be at least 1 </mat-error>
    </mat-form-field>

    <mat-form-field>
      <mat-label>Price</mat-label>
      <input matInput type="number" formControlName="price" step="0.01" />
      <mat-error *ngIf="form.get('price')?.hasError('required')"> Price is required </mat-error>
      <mat-error *ngIf="form.get('price')?.hasError('min')"> Price must be positive </mat-error>
    </mat-form-field>

    <mat-form-field>
      <mat-label>Purchase Date</mat-label>
      <input matInput [matDatepicker]="picker" formControlName="purchase_date" />
      <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
      <mat-datepicker #picker></mat-datepicker>
      <mat-error *ngIf="form.get('purchase_date')?.hasError('required')"> Purchase date is required </mat-error>
    </mat-form-field>
  </form>
</mat-dialog-content>

<mat-dialog-actions>
  <button mat-button (click)="onCancel()">Cancel</button>
  <button mat-raised-button color="primary" (click)="onSave()" [disabled]="!form.valid">Add Position</button>
</mat-dialog-actions>
```

### Step 4: Wire Dialog to Component

Update `open-positions.component.ts`:

```typescript
import { MatDialog } from '@angular/material/dialog';
import { AddPositionDialogComponent } from './add-position-dialog/add-position-dialog.component';

export class OpenPositionsComponent {
  private dialog = inject(MatDialog);
  private tradesEffects = inject(TradesEffects);
  private accountsEffects = inject(AccountsEffects);

  successMessage = signal<string>('');
  errorMessage = signal<string>('');

  openAddPositionDialog(): void {
    const dialogRef = this.dialog.open(AddPositionDialogComponent, {
      width: '500px',
      data: {
        accountId: this.accountsEffects.selectedAccountId(),
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Validate required fields
        if (!result.symbol || !result.quantity || !result.price) {
          this.errorMessage.set('All fields are required');
          return;
        }

        this.tradesEffects
          .create(result)
          .then(() => {
            this.successMessage.set('Position added successfully');
            setTimeout(() => this.successMessage.set(''), 3000);
          })
          .catch((error) => {
            this.errorMessage.set(`Failed to add position: ${error.message}`);
          });
      }
    });
  }
}
```

Update template to add button:

```html
<div class="open-positions-header">
  <h2>Open Positions</h2>
  <button mat-raised-button color="primary" (click)="openAddPositionDialog()">Add New Position</button>
</div>

@if (successMessage()) {
<mat-card class="success-message">{{ successMessage() }}</mat-card>
} @if (errorMessage()) {
<mat-card class="error-message">{{ errorMessage() }}</mat-card>
}

<!-- Rest of table -->
```

### Step 5: Run Tests (Should Pass - GREEN)

```bash
pnpm nx test dms-material --testFile=open-positions.component.spec.ts
```

### Step 6: Manual Testing

Verify:

- ✓ Button opens dialog
- ✓ Form validation works
- ✓ Save creates position
- ✓ Cancel closes dialog
- ✓ Success message shown
- ✓ No console errors

## Files Modified

| File                                                                                                                          | Changes         |
| ----------------------------------------------------------------------------------------------------------------------------- | --------------- |
| `apps/dms-material/src/app/features/account/components/open-positions/add-position-dialog/add-position-dialog.component.ts`   | Create dialog   |
| `apps/dms-material/src/app/features/account/components/open-positions/add-position-dialog/add-position-dialog.component.html` | Create template |
| `apps/dms-material/src/app/features/account/components/open-positions/open-positions.component.ts`                            | Wire dialog     |
| `apps/dms-material/src/app/features/account/components/open-positions/open-positions.component.html`                          | Add button      |
| `apps/dms-material/src/app/features/account/components/open-positions/open-positions.component.spec.ts`                       | Re-enable tests |

## Definition of Done

- [ ] Tests from AO.5 re-enabled
- [ ] All unit tests passing (GREEN)
- [ ] Dialog opens and closes correctly
- [ ] Form validation working
- [ ] Position creation working
- [ ] Success/error messages working
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

- Follow Material Design guidelines
- Match DMS app UX patterns
- Ensure proper form validation
- Handle async operations properly

## Dependencies

- Story AO.5 completed
- MatDialog available
- TradesEffects.create() method exists
