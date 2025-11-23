# Story AF.2: Migrate Add Symbol Dialog

## Story

**As a** user adding symbols to my universe
**I want** a dialog to search and add symbols
**So that** I can expand my investment universe

## Context

**Current System:**

- Location: `apps/rms/src/app/universe-settings/add-symbol-dialog/`
- PrimeNG components: `p-dialog`, `p-autoComplete`, `p-select`, `p-message`, `p-button`

**Migration Target:**

- Material Dialog
- Symbol autocomplete from AC.4
- Material form fields

## Acceptance Criteria

### Functional Requirements

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

## Technical Approach

Create `apps/rms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.ts`:

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
  selector: 'rms-add-symbol-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    SymbolAutocompleteComponent,
  ],
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

Create `apps/rms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.html`:

```html
<h2 mat-dialog-title>Add Symbol to Universe</h2>

<mat-dialog-content>
  <form [formGroup]="form">
    <rms-symbol-autocomplete
      label="Search Symbol"
      placeholder="Enter ticker or company name..."
      [searchFn]="searchSymbols.bind(this)"
      (symbolSelected)="onSymbolSelected($event)"
    />

    @if (selectedSymbol()) {
      <div class="selected-symbol">
        <strong>{{ selectedSymbol()?.symbol }}</strong> - {{ selectedSymbol()?.name }}
      </div>
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
  <button
    mat-raised-button
    color="primary"
    (click)="onSubmit()"
    [disabled]="isLoading() || !selectedSymbol()"
  >
    @if (isLoading()) {
      <mat-spinner diameter="20"></mat-spinner>
    } @else {
      Add to Universe
    }
  </button>
</mat-dialog-actions>
```

## Files Created

| File | Purpose |
|------|---------|
| `universe-settings/add-symbol-dialog/add-symbol-dialog.ts` | Dialog component |
| `universe-settings/add-symbol-dialog/add-symbol-dialog.html` | Template |
| `universe-settings/add-symbol-dialog/add-symbol-dialog.scss` | Styles |

## Definition of Done

- [ ] Dialog opens correctly
- [ ] Symbol autocomplete works
- [ ] Risk group selection works
- [ ] Validation displays errors
- [ ] Submit adds to universe
- [ ] Cancel closes dialog
- [ ] All validation commands pass
