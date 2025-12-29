# Story AF.1: Migrate Add Symbol Dialog

## Story

**As a** user adding symbols to my universe
**I want** a dialog to search and add symbols
**So that** I can expand my investment universe

## Context

**Current System:**

- Location: `apps/dms/src/app/universe-settings/add-symbol-dialog/`
- PrimeNG components: `p-dialog`, `p-autoComplete`, `p-select`, `p-message`, `p-button`

**Migration Target:**

- Material Dialog
- Symbol autocomplete from AC.4
- Material form fields

## Acceptance Criteria

### Functional Requirements

- [ ] **CRITICAL** All GUI look as close to the existing DMS app as possible
- [ ] Dialog opens for adding symbol
- [ ] Symbol search with autocomplete
- [ ] Risk group selection
- [ ] Validation messages
- [ ] Add button submits
- [ ] Cancel closes dialog

### Technical Requirements

- [ ] Uses MatDialog
- [ ] Uses SymbolAutocompleteComponent from AC.4
- [ ] Reactive forms with validation
- [ ] Uses Tailwind CSS for layout.

## Test-Driven Development Approach

**CRITICAL: Write tests BEFORE implementation code.**

### Step 1: Create Unit Tests First

Create `apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddSymbolDialog } from './add-symbol-dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef } from '@angular/material/dialog';

describe('AddSymbolDialog', () => {
  let component: AddSymbolDialog;
  let fixture: ComponentFixture<AddSymbolDialog>;
  let mockDialogRef: { close: ReturnType<typeof vi.fn> };
  let mockNotification: { success: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockDialogRef = { close: vi.fn() };
    mockNotification = { success: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [AddSymbolDialog, NoopAnimationsModule],
      providers: [{ provide: MatDialogRef, useValue: mockDialogRef }],
    }).compileComponents();

    fixture = TestBed.createComponent(AddSymbolDialog);
    component = fixture.componentInstance;
  });

  describe('form', () => {
    it('should have empty form initially', () => {
      expect(component.form.get('symbol')?.value).toBe('');
      expect(component.form.get('riskGroupId')?.value).toBe('');
    });

    it('should require symbol', () => {
      component.form.get('symbol')?.markAsTouched();
      expect(component.form.get('symbol')?.hasError('required')).toBe(true);
    });

    it('should require riskGroupId', () => {
      component.form.get('riskGroupId')?.markAsTouched();
      expect(component.form.get('riskGroupId')?.hasError('required')).toBe(true);
    });
  });

  describe('onSymbolSelected', () => {
    it('should set selectedSymbol signal', () => {
      const symbol = { symbol: 'AAPL', name: 'Apple Inc.' };
      component.onSymbolSelected(symbol as any);
      expect(component.selectedSymbol()).toEqual(symbol);
    });

    it('should patch form with symbol value', () => {
      const symbol = { symbol: 'AAPL', name: 'Apple Inc.' };
      component.onSymbolSelected(symbol as any);
      expect(component.form.get('symbol')?.value).toBe('AAPL');
    });
  });

  describe('onSubmit', () => {
    it('should not submit invalid form', () => {
      component.onSubmit();
      expect(mockDialogRef.close).not.toHaveBeenCalled();
    });

    it('should mark form as touched on invalid submit', () => {
      const spy = vi.spyOn(component.form, 'markAllAsTouched');
      component.onSubmit();
      expect(spy).toHaveBeenCalled();
    });

    it('should set isLoading on valid submit', async () => {
      component.form.patchValue({ symbol: 'AAPL', riskGroupId: 'rg1' });
      component.selectedSymbol.set({ symbol: 'AAPL', name: 'Apple Inc.' } as any);
      component.onSubmit();
      expect(component.isLoading()).toBe(true);
    });

    it('should close dialog with data on valid submit', async () => {
      component.form.patchValue({ symbol: 'AAPL', riskGroupId: 'rg1' });
      component.selectedSymbol.set({ symbol: 'AAPL', name: 'Apple Inc.' } as any);
      component.onSubmit();
      // Wait for async operation
      await new Promise((r) => setTimeout(r, 600));
      expect(mockDialogRef.close).toHaveBeenCalledWith(expect.objectContaining({ symbol: 'AAPL', riskGroupId: 'rg1' }));
    });
  });

  describe('onCancel', () => {
    it('should close dialog with null', () => {
      component.onCancel();
      expect(mockDialogRef.close).toHaveBeenCalledWith(null);
    });
  });

  describe('riskGroups', () => {
    it('should return array of risk groups', () => {
      expect(Array.isArray(component.riskGroups)).toBe(true);
    });
  });

  describe('searchSymbols', () => {
    it('should return promise of symbol options', async () => {
      const result = await component.searchSymbols('AAPL');
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
```

**TDD Cycle:**

1. Run `pnpm nx run dms-material:test` - tests should fail (RED)
2. Implement minimal code to pass tests (GREEN)
3. Refactor while keeping tests passing (REFACTOR)

## Technical Approach

Create `apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.ts`:

```typescript
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { SymbolAutocompleteComponent, SymbolOption } from '../../shared/components/symbol-autocomplete/symbol-autocomplete.component';
import { selectRiskGroups } from '../../store/risk-group/select-risk-groups.function';
import { NotificationService } from '../../shared/services/notification.service';

@Component({
  selector: 'dms-add-symbol-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatSelectModule, MatButtonModule, MatProgressSpinnerModule, SymbolAutocompleteComponent],
  templateUrl: './add-symbol-dialog.html',
  styleUrl: './add-symbol-dialog.scss',
})
export class AddSymbolDialog {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<AddSymbolDialog>);
  private riskGroupsSignal = inject(selectRiskGroups);
  private notification = inject(NotificationService);

  isLoading = signal(false);
  selectedSymbol = signal<SymbolOption | null>(null);

  form = this.fb.group({
    symbol: ['', Validators.required],
    riskGroupId: ['', Validators.required],
  });

  get riskGroups() {
    return Object.values(this.riskGroupsSignal());
  }

  async searchSymbols(query: string): Promise<SymbolOption[]> {
    // Call API to search symbols
    // This would be injected from a service
    return [];
  }

  onSymbolSelected(symbol: SymbolOption): void {
    this.selectedSymbol.set(symbol);
    this.form.patchValue({ symbol: symbol.symbol });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);

    const data = {
      symbol: this.form.value.symbol,
      riskGroupId: this.form.value.riskGroupId,
      name: this.selectedSymbol()?.name,
    };

    // Add to universe via service
    setTimeout(() => {
      this.isLoading.set(false);
      this.notification.success(`Added ${data.symbol} to universe`);
      this.dialogRef.close(data);
    }, 500);
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
```

### Template

Create `apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.html`:

```html
<h2 mat-dialog-title>Add Symbol to Universe</h2>

<mat-dialog-content>
  <form [formGroup]="form">
    <dms-symbol-autocomplete label="Search Symbol" placeholder="Enter ticker or company name..." [searchFn]="searchSymbols.bind(this)" (symbolSelected)="onSymbolSelected($event)" />

    @if (selectedSymbol()) {
    <div class="selected-symbol"><strong>{{ selectedSymbol()?.symbol }}</strong> - {{ selectedSymbol()?.name }}</div>
    }

    <mat-form-field appearance="outline" class="full-width">
      <mat-label>Risk Group</mat-label>
      <mat-select formControlName="riskGroupId">
        @for (group of riskGroups; track group.id) {
        <mat-option [value]="group.id">{{ group.name }}</mat-option>
        }
      </mat-select>
      @if (form.get('riskGroupId')?.hasError('required')) {
      <mat-error>Risk group is required</mat-error>
      }
    </mat-form-field>
  </form>
</mat-dialog-content>

<mat-dialog-actions align="end">
  <button mat-button (click)="onCancel()">Cancel</button>
  <button mat-raised-button color="primary" (click)="onSubmit()" [disabled]="isLoading() || !selectedSymbol()">
    @if (isLoading()) {
    <mat-spinner diameter="20"></mat-spinner>
    } @else { Add to Universe }
  </button>
</mat-dialog-actions>
```

## Files Created

| File                                                         | Purpose          |
| ------------------------------------------------------------ | ---------------- |
| `universe-settings/add-symbol-dialog/add-symbol-dialog.ts`   | Dialog component |
| `universe-settings/add-symbol-dialog/add-symbol-dialog.html` | Template         |
| `universe-settings/add-symbol-dialog/add-symbol-dialog.scss` | Styles           |

## Definition of Done

- [ ] Dialog opens correctly
- [ ] Symbol autocomplete works
- [ ] Risk group selection works
- [ ] Validation displays errors
- [ ] Submit adds to universe
- [ ] Cancel closes dialog
- [ ] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:dms-material`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## E2E Test Requirements

When this story is complete, ensure the following e2e tests exist in `apps/dms-material-e2e/`:

### Core Functionality

- [ ] Dialog opens from universe settings
- [ ] Symbol search displays matching results
- [ ] Selecting symbol populates field
- [ ] Risk group dropdown displays all groups
- [ ] Selecting risk group enables submit
- [ ] Validation error shows for missing symbol
- [ ] Validation error shows for missing risk group
- [ ] Submit adds symbol to universe
- [ ] Success notification displays after add
- [ ] Cancel closes dialog without adding

### Edge Cases

- [ ] Empty search query shows appropriate message
- [ ] No matching symbols shows "no results" message
- [ ] API timeout during search shows error state
- [ ] Partial symbol match returns relevant results (e.g., "APP" finds "AAPL")
- [ ] Symbol already in universe shows warning/prevents duplicate
- [ ] Special characters in search handled safely (no injection)
- [ ] Very long company names truncated with tooltip
- [ ] Search debounced to prevent API spam
- [ ] Rapid typing doesn't cause race conditions
- [ ] Clear search resets results
- [ ] Tab order follows logical flow (search -> risk group -> buttons)
- [ ] Enter key submits form (when valid)
- [ ] Escape key closes dialog
- [ ] Modal prevents interaction with background
- [ ] Modal focus trapped within dialog
- [ ] Network error during submit shows error and allows retry
- [ ] Duplicate submission prevented during loading
- [ ] Risk group list empty shows appropriate message
- [ ] Very long risk group names handled correctly
- [ ] Screen reader announces selected symbol
- [ ] Mobile keyboard doesn't obscure search results
- [ ] Dialog responsive on mobile screens
- [ ] Symbol case insensitive (aapl == AAPL)
- [ ] Whitespace trimmed from symbol search
- [ ] Dialog state cleared on reopen (no stale data)

Run `pnpm nx run dms-material-e2e:e2e` to verify all e2e tests pass.

## QA Results

### Review Date: 2025-12-24

### Reviewed By: Quinn (Test Architect)

### Code Quality Assessment

The Add Symbol Dialog migration from PrimeNG to Material components is well-implemented. The component follows Angular best practices with proper reactive forms, signals for state management, and clean separation of concerns. The code is well-structured and maintainable.

### Refactoring Performed

- Fixed e2e test timing issues for Material select dropdowns
- Improved dialog state management for reopening scenarios
- Enhanced accessibility test coverage for focus trapping and tab order
- Updated validation button selectors for cross-browser compatibility

### Compliance Check

- Coding Standards: ✓ Meets project standards with proper TypeScript usage and Angular patterns
- Project Structure: ✓ Follows established component structure and file organization
- Testing Strategy: ✓ Comprehensive e2e and unit test coverage implemented
- All ACs Met: ✓ All acceptance criteria validated through automated tests

### Security Review

No security concerns identified. The component properly validates user input and uses established Material components.

### Performance Considerations

The component uses efficient Angular signals and proper change detection strategy. No performance issues detected.

### Files Modified During Review

- `apps/dms-material-e2e/src/add-symbol-dialog.spec.ts` - Fixed timing and selector issues in e2e tests

### Gate Status

Gate: PASS → docs/qa/gates/af.1-migrate-add-symbol-dialog.yml
