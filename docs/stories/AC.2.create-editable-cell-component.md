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

## Test-Driven Development Approach

**Write tests BEFORE implementation code.**

### Step 1: Create Unit Tests First

Create `apps/rms-material/src/app/shared/components/editable-cell/editable-cell.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditableCellComponent } from './editable-cell.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('EditableCellComponent', () => {
  let component: EditableCellComponent;
  let fixture: ComponentFixture<EditableCellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditableCellComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(EditableCellComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('value', 100);
  });

  it('should display value in non-edit mode', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.display-value')).toBeTruthy();
  });

  it('should enter edit mode on click', () => {
    fixture.detectChanges();
    component.startEdit();
    expect(component.isEditing()).toBe(true);
  });

  it('should show input in edit mode', () => {
    component.startEdit();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input')).toBeTruthy();
  });

  it('should save value on saveEdit', () => {
    const spy = vi.spyOn(component.valueChange, 'emit');
    component.startEdit();
    component.onValueChange(200);
    component.saveEdit();
    expect(spy).toHaveBeenCalledWith(200);
  });

  it('should not emit if value unchanged', () => {
    const spy = vi.spyOn(component.valueChange, 'emit');
    component.startEdit();
    component.saveEdit();
    expect(spy).not.toHaveBeenCalled();
  });

  it('should cancel edit without emitting', () => {
    const spy = vi.spyOn(component.valueChange, 'emit');
    component.startEdit();
    component.onValueChange(200);
    component.cancelEdit();
    expect(spy).not.toHaveBeenCalled();
    expect(component.isEditing()).toBe(false);
  });

  it('should format as currency when format is currency', () => {
    fixture.componentRef.setInput('format', 'currency');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('$');
  });
});
```

**TDD Cycle:**

1. Run `pnpm nx run rms-material:test` - tests should fail (RED)
2. Implement minimal code to pass tests (GREEN)
3. Refactor while keeping tests passing (REFACTOR)

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
      <input #inputRef matInput type="number" [ngModel]="value()" (ngModelChange)="onValueChange($event)" (keydown.enter)="saveEdit()" (keydown.escape)="cancelEdit()" (blur)="saveEdit()" [min]="min()" [max]="max()" [step]="step()" />
    </mat-form-field>
    } @else {
    <span class="display-value" (click)="startEdit()">
      @if (format() === 'currency') {
      {{ value() | currency }}
      } @else if (format() === 'decimal') {
      {{ value() | number : decimalFormat() }}
      } @else {
      {{ value() }}
      }
    </span>
    }
  `,
  styles: [
    `
      .display-value {
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        &:hover {
          background-color: rgba(0, 0, 0, 0.04);
        }
      }
      .edit-field {
        width: 100%;
        ::ng-deep .mat-mdc-form-field-infix {
          padding: 4px 0;
        }
      }
    `,
  ],
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

## E2E Test Requirements

When this story is complete, ensure the following e2e tests exist in `apps/rms-material-e2e/`:

- [ ] Clicking cell enters edit mode
- [ ] Input field displays current value
- [ ] Enter key saves and exits edit mode
- [ ] Escape key cancels and exits edit mode
- [ ] Clicking outside (blur) saves value
- [ ] Currency format displays correctly
- [ ] Decimal format displays correctly

Run `pnpm nx run rms-material-e2e:e2e` to verify all e2e tests pass.
