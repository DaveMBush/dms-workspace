# Story AC.3: Create Editable Date Cell Component

## Story

**As a** user editing dates in tables
**I want** to click a date cell and pick a new date
**So that** I can quickly update dates without a separate form

## Context

**Current System:**

- PrimeNG `p-cellEditor` with `p-datepicker`
- Date format configuration

**Migration Target:**

- Custom inline date edit
- `mat-datepicker` for date selection

## Acceptance Criteria

### Functional Requirements

- [ ] Click cell to open datepicker
- [ ] All GUI look as close to the existing RMS app as possible
- [ ] Select date to update value
- [ ] Close picker cancels if no selection
- [ ] Date formatted according to configuration

### Technical Requirements

- [ ] Uses `mat-datepicker`
- [ ] Configurable date format
- [ ] Works within base table rows

## Test-Driven Development Approach

**Write tests BEFORE implementation code.**

### Step 1: Create Unit Tests First

Create `apps/rms-material/src/app/shared/components/editable-date-cell/editable-date-cell.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditableDateCellComponent } from './editable-date-cell.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatNativeDateModule } from '@angular/material/core';

describe('EditableDateCellComponent', () => {
  let component: EditableDateCellComponent;
  let fixture: ComponentFixture<EditableDateCellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditableDateCellComponent, NoopAnimationsModule, MatNativeDateModule],
    }).compileComponents();

    fixture = TestBed.createComponent(EditableDateCellComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('value', new Date('2024-01-15'));
  });

  it('should display formatted date', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('01/15/2024');
  });

  it('should enter edit mode on click', () => {
    fixture.detectChanges();
    component.startEdit();
    expect(component.isEditing()).toBe(true);
  });

  it('should emit new date on change', () => {
    const spy = vi.spyOn(component.valueChange, 'emit');
    const newDate = new Date('2024-02-20');
    component.startEdit();
    component.onDateChange(newDate);
    component.onPickerClosed();
    expect(spy).toHaveBeenCalledWith(newDate);
  });

  it('should not emit if date unchanged', () => {
    const spy = vi.spyOn(component.valueChange, 'emit');
    component.startEdit();
    component.onPickerClosed();
    expect(spy).not.toHaveBeenCalled();
  });

  it('should use custom date format', () => {
    fixture.componentRef.setInput('dateFormat', 'yyyy-MM-dd');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('2024-01-15');
  });
});
```

**TDD Cycle:**

1. Run `pnpm nx run rms-material:test` - tests should fail (RED)
2. Implement minimal code to pass tests (GREEN)
3. Refactor while keeping tests passing (REFACTOR)

## Technical Approach

Create `apps/rms-material/src/app/shared/components/editable-date-cell/editable-date-cell.component.ts`:

```typescript
import { Component, input, output, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule, MatDatepicker } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'rms-editable-date-cell',
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatDatepickerModule, MatNativeDateModule, DatePipe],
  template: `
    @if (isEditing()) {
    <mat-form-field appearance="outline" class="edit-field">
      <input matInput [matDatepicker]="picker" [ngModel]="editValue()" (ngModelChange)="onDateChange($event)" (blur)="onBlur()" />
      <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
      <mat-datepicker #picker (closed)="onPickerClosed()"></mat-datepicker>
    </mat-form-field>
    } @else {
    <span class="display-value" (click)="startEdit()">
      {{ value() | date : dateFormat() }}
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
      }
    `,
  ],
})
export class EditableDateCellComponent {
  value = input.required<Date | null>();
  dateFormat = input<string>('MM/dd/yyyy');

  valueChange = output<Date>();

  isEditing = signal(false);
  editValue = signal<Date | null>(null);

  @ViewChild('picker') picker!: MatDatepicker<Date>;

  startEdit(): void {
    this.editValue.set(this.value());
    this.isEditing.set(true);
    setTimeout(() => this.picker?.open(), 0);
  }

  onDateChange(date: Date): void {
    this.editValue.set(date);
  }

  onPickerClosed(): void {
    if (this.editValue() && this.editValue() !== this.value()) {
      this.valueChange.emit(this.editValue()!);
    }
    this.isEditing.set(false);
  }

  onBlur(): void {
    // Handle blur without picker
  }
}
```

## Definition of Done

- [ ] Click opens datepicker
- [ ] Date selection updates value
- [ ] Value emitted on change
- [ ] Date formatting works
- [ ] All validation commands pass

## E2E Test Requirements

When this story is complete, ensure the following e2e tests exist in `apps/rms-material-e2e/`:

### Core Functionality

- [ ] Clicking date cell opens datepicker
- [ ] Selecting date updates displayed value
- [ ] Datepicker closes after selection
- [ ] Date displays in configured format
- [ ] Cancel/close without selection preserves original value

### Edge Cases

- [ ] Keyboard date entry works (typing MM/DD/YYYY)
- [ ] Invalid date format shows validation error
- [ ] Date min/max constraints enforced (if configured)
- [ ] Future dates disabled (when configured)
- [ ] Past dates disabled (when configured)
- [ ] Leap year dates (Feb 29) handled correctly
- [ ] Date boundaries (Dec 31 → Jan 1) work correctly
- [ ] Timezone handling consistent (UTC vs local)
- [ ] Empty/null date displayed correctly
- [ ] Datepicker positions correctly near viewport edges
- [ ] Datepicker keyboard navigation (arrows, Enter, Escape)
- [ ] Month/year selection works in datepicker
- [ ] Today button works in datepicker
- [ ] Clear button removes date value

Run `pnpm nx run rms-material-e2e:e2e` to verify all e2e tests pass.
