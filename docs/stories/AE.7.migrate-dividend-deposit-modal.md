# Story AE.7: Migrate Dividend Deposit Modal

## Story

**As a** user adding or editing dividend deposits
**I want** a modal form to enter dividend details
**So that** I can manage my dividend records

## Context

**Current System:**

- Location: `apps/rms/src/app/account-panel/div-dep-modal/`
- PrimeNG components: `p-dialog`, `p-select`, `p-inputNumber`, `p-datepicker`, `p-button`

**Migration Target:**

- Material Dialog
- Material form fields

## Acceptance Criteria

### Functional Requirements

- [ ] **CRITICAL** All GUI look as close to the existing RMS app as possible
- [ ] **CRITICAL** Use the playwright mcp server to verify that the new screen matches the existing screen in terms of layout and functionality, but not necessarily pixel-perfect visual design.
- [ ] **CRITICAL** Use the playwright mcp server to check for
- [ ] Modal opens for add/edit mode
- [ ] Symbol selection (autocomplete or select)
- [ ] Date inputs for ex-date and pay-date
- [ ] Amount and shares inputs
- [ ] Type selection (regular, special, etc.)
- [ ] Save button submits data
- [ ] Cancel button closes without saving

### Technical Requirements

- [ ] Uses MatDialog
- [ ] Reactive forms with validation
- [ ] Mode-aware (add vs edit)
- [ ] Uses Tailwind CSS for layout.

## Test-Driven Development Approach

**CRITICAL: Write tests BEFORE implementation code.**

### Step 1: Create Unit Tests First

Create `apps/rms-material/src/app/account-panel/div-dep-modal/div-dep-modal.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DivDepModal, DivDepModalData } from './div-dep-modal.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatNativeDateModule } from '@angular/material/core';

describe('DivDepModal', () => {
  let component: DivDepModal;
  let fixture: ComponentFixture<DivDepModal>;
  let mockDialogRef: { close: ReturnType<typeof vi.fn> };

  const createComponent = (data: DivDepModalData) => {
    mockDialogRef = { close: vi.fn() };
    TestBed.configureTestingModule({
      imports: [DivDepModal, NoopAnimationsModule, MatNativeDateModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });
    fixture = TestBed.createComponent(DivDepModal);
    component = fixture.componentInstance;
  };

  describe('add mode', () => {
    beforeEach(() => createComponent({ mode: 'add' }));

    it('should have empty form', () => {
      expect(component.form.get('symbol')?.value).toBe('');
    });

    it('should return false for isEditMode', () => {
      expect(component.isEditMode).toBe(false);
    });

    it('should have title "Add Dividend Deposit"', () => {
      expect(component.title).toBe('Add Dividend Deposit');
    });
  });

  describe('edit mode', () => {
    const dividend = { id: '1', symbol: 'AAPL', amount: 0.25, shares: 100 };

    beforeEach(() => createComponent({ mode: 'edit', dividend: dividend as any }));

    it('should populate form with dividend data', () => {
      component.ngOnInit();
      expect(component.form.get('symbol')?.value).toBe('AAPL');
      expect(component.form.get('amount')?.value).toBe(0.25);
    });

    it('should return true for isEditMode', () => {
      expect(component.isEditMode).toBe(true);
    });

    it('should have title "Edit Dividend Deposit"', () => {
      expect(component.title).toBe('Edit Dividend Deposit');
    });
  });

  describe('validation', () => {
    beforeEach(() => createComponent({ mode: 'add' }));

    it('should require symbol', () => {
      component.form.get('symbol')?.markAsTouched();
      expect(component.form.get('symbol')?.hasError('required')).toBe(true);
    });

    it('should require exDate', () => {
      component.form.get('exDate')?.markAsTouched();
      expect(component.form.get('exDate')?.hasError('required')).toBe(true);
    });

    it('should require amount > 0', () => {
      component.form.patchValue({ amount: 0 });
      expect(component.form.get('amount')?.hasError('min')).toBe(true);
    });

    it('should require shares >= 1', () => {
      component.form.patchValue({ shares: 0 });
      expect(component.form.get('shares')?.hasError('min')).toBe(true);
    });
  });

  describe('submit', () => {
    beforeEach(() => createComponent({ mode: 'add' }));

    it('should not submit invalid form', () => {
      component.onSubmit();
      expect(mockDialogRef.close).not.toHaveBeenCalled();
    });

    it('should close dialog with data on valid submit', async () => {
      component.form.patchValue({
        symbol: 'AAPL',
        exDate: new Date(),
        amount: 0.25,
        shares: 100,
        type: 'Regular',
      });
      component.onSubmit();
      // Wait for async operation
      await new Promise((r) => setTimeout(r, 600));
      expect(mockDialogRef.close).toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    beforeEach(() => createComponent({ mode: 'add' }));

    it('should close dialog with null', () => {
      component.onCancel();
      expect(mockDialogRef.close).toHaveBeenCalledWith(null);
    });
  });
});
```

**TDD Cycle:**

1. Run `pnpm nx run rms-material:test` - tests should fail (RED)
2. Implement minimal code to pass tests (GREEN)
3. Refactor while keeping tests passing (REFACTOR)

## Technical Approach

Create `apps/rms-material/src/app/account-panel/div-dep-modal/div-dep-modal.component.ts`:

```typescript
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { DivDeposit } from '../../store/div-deposits/div-deposit.interface';
import { SymbolAutocompleteComponent } from '../../shared/components/symbol-autocomplete/symbol-autocomplete.component';

export interface DivDepModalData {
  mode: 'add' | 'edit';
  dividend?: DivDeposit;
}

@Component({
  selector: 'rms-div-dep-modal',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule, MatButtonModule, MatProgressSpinnerModule, SymbolAutocompleteComponent],
  templateUrl: './div-dep-modal.component.html',
  styleUrl: './div-dep-modal.component.scss',
})
export class DivDepModal implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<DivDepModal>);
  data = inject<DivDepModalData>(MAT_DIALOG_DATA);

  isLoading = signal(false);

  depositTypes = ['Regular', 'Special', 'Return of Capital', 'Qualified'];

  form = this.fb.group({
    symbol: ['', Validators.required],
    exDate: [null as Date | null, Validators.required],
    payDate: [null as Date | null],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    shares: [0, [Validators.required, Validators.min(1)]],
    type: ['Regular', Validators.required],
  });

  get isEditMode(): boolean {
    return this.data.mode === 'edit';
  }

  get title(): string {
    return this.isEditMode ? 'Edit Dividend Deposit' : 'Add Dividend Deposit';
  }

  ngOnInit(): void {
    if (this.isEditMode && this.data.dividend) {
      this.form.patchValue({
        symbol: this.data.dividend.symbol,
        exDate: this.data.dividend.exDate,
        payDate: this.data.dividend.payDate,
        amount: this.data.dividend.amount,
        shares: this.data.dividend.shares,
        type: this.data.dividend.type,
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);

    // Build dividend object
    const dividend: Partial<DivDeposit> = {
      ...this.data.dividend,
      ...this.form.value,
    } as Partial<DivDeposit>;

    // In real implementation, save via SmartNgRX
    setTimeout(() => {
      this.isLoading.set(false);
      this.dialogRef.close(dividend);
    }, 500);
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
```

### Template

Create `apps/rms-material/src/app/account-panel/div-dep-modal/div-dep-modal.component.html`:

```html
<h2 mat-dialog-title>{{ title }}</h2>

<mat-dialog-content>
  <form [formGroup]="form">
    <mat-form-field appearance="outline" class="full-width">
      <mat-label>Symbol</mat-label>
      <input matInput formControlName="symbol" [readonly]="isEditMode" />
      @if (form.get('symbol')?.hasError('required')) {
      <mat-error>Symbol is required</mat-error>
      }
    </mat-form-field>

    <div class="form-row">
      <mat-form-field appearance="outline">
        <mat-label>Ex-Date</mat-label>
        <input matInput [matDatepicker]="exPicker" formControlName="exDate" />
        <mat-datepicker-toggle matSuffix [for]="exPicker"></mat-datepicker-toggle>
        <mat-datepicker #exPicker></mat-datepicker>
        @if (form.get('exDate')?.hasError('required')) {
        <mat-error>Ex-Date is required</mat-error>
        }
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Pay Date</mat-label>
        <input matInput [matDatepicker]="payPicker" formControlName="payDate" />
        <mat-datepicker-toggle matSuffix [for]="payPicker"></mat-datepicker-toggle>
        <mat-datepicker #payPicker></mat-datepicker>
      </mat-form-field>
    </div>

    <div class="form-row">
      <mat-form-field appearance="outline">
        <mat-label>Amount per Share</mat-label>
        <input matInput type="number" formControlName="amount" step="0.01" />
        <span matPrefix>$&nbsp;</span>
        @if (form.get('amount')?.hasError('required')) {
        <mat-error>Amount is required</mat-error>
        }
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Shares</mat-label>
        <input matInput type="number" formControlName="shares" />
        @if (form.get('shares')?.hasError('required')) {
        <mat-error>Shares is required</mat-error>
        }
      </mat-form-field>
    </div>

    <mat-form-field appearance="outline" class="full-width">
      <mat-label>Type</mat-label>
      <mat-select formControlName="type">
        @for (type of depositTypes; track type) {
        <mat-option [value]="type">{{ type }}</mat-option>
        }
      </mat-select>
    </mat-form-field>
  </form>
</mat-dialog-content>

<mat-dialog-actions align="end">
  <button mat-button (click)="onCancel()">Cancel</button>
  <button mat-raised-button color="primary" (click)="onSubmit()" [disabled]="isLoading()">
    @if (isLoading()) {
    <mat-spinner diameter="20"></mat-spinner>
    } @else { {{ isEditMode ? 'Update' : 'Add' }} }
  </button>
</mat-dialog-actions>
```

## Definition of Done

- [ ] Modal opens from add/edit actions
- [ ] Form fields display correctly
- [ ] Validation works
- [ ] Edit mode pre-fills data
- [ ] Submit saves and closes
- [ ] Cancel closes without saving
- [ ] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:rms-material`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## E2E Test Requirements

When this story is complete, ensure the following e2e tests exist in `apps/rms-material-e2e/`:

### Core Functionality

- [ ] Modal opens for add mode with empty fields
- [ ] Modal opens for edit mode with pre-filled data
- [ ] Symbol field validates required
- [ ] Ex-Date field validates required
- [ ] Amount field validates required and min value
- [ ] Shares field validates required and min value
- [ ] Type dropdown displays all options
- [ ] Submit button disabled while loading
- [ ] Submit saves data and closes modal
- [ ] Cancel closes modal without saving
- [ ] Datepickers open and select dates

### Edge Cases

- [ ] Symbol field readonly in edit mode
- [ ] Pay-date optional (can be empty)
- [ ] Amount accepts decimal values (0.01 precision)
- [ ] Amount max value handled (very large dividends)
- [ ] Shares accepts only integers
- [ ] Tab order follows logical flow through fields
- [ ] Enter key submits form (when valid)
- [ ] Escape key cancels modal
- [ ] Modal prevents interaction with background
- [ ] Modal focus trapped within dialog
- [ ] Network error during submit shows error and allows retry
- [ ] Duplicate submission prevented during loading
- [ ] Form dirty state tracked (unsaved changes warning)
- [ ] Validation errors cleared on field correction
- [ ] Modal responsive on mobile screens
- [ ] Screen reader announces modal title and errors

Run `pnpm nx run rms-material-e2e:e2e` to verify all e2e tests pass.

## QA Results

### Requirements Traceability

- **Modal opens for add/edit mode**: IMPLEMENTED - Component supports both modes with proper data injection.
- **Symbol selection (autocomplete or select)**: PARTIAL - Input field exists but missing autocomplete functionality as specified in technical approach.
- **Date inputs for ex-date and pay-date**: PARTIAL - Only single date field implemented; missing separate ex-date and pay-date fields.
- **Amount and shares inputs**: PARTIAL - Amount field implemented; shares field missing from form.
- **Type selection (regular, special, etc.)**: IMPLEMENTED - Mat-select with predefined options.
- **Save button submits data**: IMPLEMENTED - Form validation and submit logic present (currently mocked).
- **Cancel button closes without saving**: IMPLEMENTED - Cancel method closes dialog with null.

### Code Quality Assessment

- **Architecture**: Good use of Angular signals and reactive forms.
- **Reactive Forms**: Properly implemented with validation.
- **Material Design**: Correct usage of MatDialog and form components.
- **Tailwind CSS**: Applied for layout styling.
- **Type Safety**: Strong typing with interfaces.

### Test Coverage

- **Unit Tests**: Comprehensive spec file covering add/edit modes, validation, and form submission.
- **E2E Tests**: NOT IMPLEMENTED - Story requires e2e tests but none exist in rms-material-e2e.
- **Test Quality**: Unit tests follow good practices with proper mocking.

### Non-Functional Requirements

- **Performance**: No issues identified; simple form component.
- **Security**: No security concerns; form data validation present.
- **Accessibility**: Basic Material components provide good accessibility; no custom ARIA needed.
- **Maintainability**: Clean code structure, good separation of concerns.

### Testability

- **Controllability**: Good - Form inputs easily controllable in tests.
- **Observability**: Good - Dialog close behavior observable.
- **Debuggability**: Good - Clear error handling and validation messages.

### Technical Debt

- Mock save implementation using setTimeout instead of real SmartNgRX integration.
- Missing form fields (shares, pay-date, symbol autocomplete).
- No e2e test implementation.

### Acceptance Criteria Validation

**NOT MET:**

- Symbol selection with autocomplete
- Separate ex-date and pay-date fields
- Shares input field
- E2E tests implementation
- Playwright verification of UI similarity

**MET:**

- MatDialog usage
- Reactive forms with validation
- Mode-aware functionality
- Tailwind CSS layout
- Basic form submission and cancellation

### Recommendations

1. **MEDIUM PRIORITY**: Implement required e2e tests in rms-material-e2e.

### Risk Assessment

**Overall Risk**: MEDIUM

- Mock implementation delays real testing.
- No e2e coverage increases regression risk.

**Probability**: HIGH (missing features are obvious in manual testing)
**Impact**: MEDIUM (affects dividend deposit functionality)

### Gate Recommendation

CONCERNS - Core migration completed but missing required fields and real implementation. Proceed with awareness of gaps to be addressed in follow-up work.
