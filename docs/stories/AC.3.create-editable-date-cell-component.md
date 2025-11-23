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
- [ ] Select date to update value
- [ ] Close picker cancels if no selection
- [ ] Date formatted according to configuration

### Technical Requirements

- [ ] Uses `mat-datepicker`
- [ ] Configurable date format
- [ ] Works within base table rows

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
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    DatePipe,
  ],
  template: `
    @if (isEditing()) {
      <mat-form-field appearance="outline" class="edit-field">
        <input
          matInput
          [matDatepicker]="picker"
          [ngModel]="editValue()"
          (ngModelChange)="onDateChange($event)"
          (blur)="onBlur()"
        />
        <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
        <mat-datepicker #picker (closed)="onPickerClosed()"></mat-datepicker>
      </mat-form-field>
    } @else {
      <span class="display-value" (click)="startEdit()">
        {{ value() | date:dateFormat() }}
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
    .edit-field { width: 100%; }
  `],
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
