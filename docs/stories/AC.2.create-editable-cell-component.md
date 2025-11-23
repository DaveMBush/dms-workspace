# Story AC.2: Create Editable Cell Component

## Story

**As a** user editing data in tables
**I want** to click a cell and edit its value inline
**So that** I can quickly update data without opening a separate form

## Context

**Current System:**

- PrimeNG `p-cellEditor` with input/output templates
- `p-inputNumber` for numeric values
- Click to edit, blur/enter to save

**Migration Target:**

- Custom inline edit component
- `mat-form-field` with `matInput`
- Same interaction patterns

## Acceptance Criteria

### Functional Requirements

- [ ] Click cell to enter edit mode
- [ ] Number input with proper formatting
- [ ] Enter key saves value
- [ ] Escape key cancels edit
- [ ] Blur saves value
- [ ] Value change emits to parent

### Technical Requirements

- [ ] Uses `mat-form-field` with `matInput`
- [ ] Supports min/max/step for numbers
- [ ] Supports decimal precision
- [ ] Works within base table rows

## Technical Approach

Create `apps/rms-material/src/app/shared/components/editable-cell/editable-cell.component.ts`:

```typescript
import { Component, input, output, signal, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { DecimalPipe, CurrencyPipe } from '@angular/common';

@Component({
  selector: 'rms-editable-cell',
  imports: [FormsModule, MatFormFieldModule, MatInputModule, DecimalPipe, CurrencyPipe],
  template: `
    @if (isEditing()) {
      <mat-form-field appearance="outline" class="edit-field">
        <input
          #inputRef
          matInput
          type="number"
          [ngModel]="value()"
          (ngModelChange)="onValueChange($event)"
          (keydown.enter)="saveEdit()"
          (keydown.escape)="cancelEdit()"
          (blur)="saveEdit()"
          [min]="min()"
          [max]="max()"
          [step]="step()"
        />
      </mat-form-field>
    } @else {
      <span class="display-value" (click)="startEdit()">
        @if (format() === 'currency') {
          {{ value() | currency }}
        } @else if (format() === 'decimal') {
          {{ value() | number:decimalFormat() }}
        } @else {
          {{ value() }}
        }
      </span>
    }
  `,
  styles: [`
    .display-value {
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      &:hover { background-color: rgba(0,0,0,0.04); }
    }
    .edit-field {
      width: 100%;
      ::ng-deep .mat-mdc-form-field-infix { padding: 4px 0; }
    }
  `],
})
export class EditableCellComponent {
  value = input.required<number>();
  min = input<number>();
  max = input<number>();
  step = input<number>(1);
  format = input<'number' | 'currency' | 'decimal'>('number');
  decimalFormat = input<string>('1.2-2');

  valueChange = output<number>();

  isEditing = signal(false);
  editValue = signal<number>(0);

  @ViewChild('inputRef') inputRef!: ElementRef<HTMLInputElement>;

  startEdit(): void {
    this.editValue.set(this.value());
    this.isEditing.set(true);
    setTimeout(() => this.inputRef?.nativeElement?.focus(), 0);
  }

  onValueChange(newValue: number): void {
    this.editValue.set(newValue);
  }

  saveEdit(): void {
    if (this.editValue() !== this.value()) {
      this.valueChange.emit(this.editValue());
    }
    this.isEditing.set(false);
  }

  cancelEdit(): void {
    this.isEditing.set(false);
  }
}
```

## Definition of Done

- [ ] Click to edit works
- [ ] Number input displays correctly
- [ ] Enter saves, Escape cancels
- [ ] Blur saves value
- [ ] Value emitted on change
- [ ] Currency/decimal formatting works
- [ ] All validation commands pass
