import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatNativeDateModule } from '@angular/material/core';
import {
  MatDatepicker,
  MatDatepickerModule,
} from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'dms-editable-date-cell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  templateUrl: './editable-date-cell.component.html',
  styleUrls: ['./editable-date-cell.component.scss'],
})
export class EditableDateCellComponent {
  @Input() set value(val: Date | string | null) {
    // Convert string dates to Date objects for internal use
    if (typeof val === 'string') {
      // Parse ISO date string and create local date at midnight
      // This avoids timezone offset issues where UTC midnight becomes previous day in local time
      const datePart = val.split('T')[0];
      const parts = datePart.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
        const day = parseInt(parts[2], 10);
        this.internalValue = new Date(year, month, day);
      } else {
        this.internalValue = new Date(val);
      }
    } else {
      this.internalValue = val;
    }
  }

  get value(): Date | null {
    return this.internalValue;
  }

  private internalValue: Date | null = null;

  @Input() dateFormat = 'MM/dd/yyyy';

  @Output() readonly valueChange = new EventEmitter<Date>();

  @ViewChild('picker') picker!: MatDatepicker<Date>;

  editing = false;

  editValue: Date | null = null;

  startEdit(): void {
    this.editValue = this.value ? new Date(this.value) : null;
    this.editing = true;
    // open picker shortly after entering edit mode (use named method reference)
    setTimeout(this.openPicker.bind(this), 0);
  }

  isEditing(): boolean {
    return this.editing;
  }

  onDateSelected(event: unknown): void {
    // When a date is selected from the picker, close it immediately
    const dateEvent = event as { value: Date | null };
    this.editValue = dateEvent.value;
    this.picker?.close();
  }

  onDateChange(date: Date | null): void {
    this.editValue = date;
  }

  onPickerClosed(): void {
    this.commitEdit();
  }

  onBlur(): void {
    // close edit mode when focus leaves input (no selection)
    this.editing = false;
  }

  cancelEdit(): void {
    this.editing = false;
    // Close picker if open
    this.picker?.close();
  }

  saveEdit(): void {
    this.commitEdit();
  }

  private commitEdit(): void {
    if (this.editValue) {
      const originalTime = this.value !== null ? this.value.getTime() : 0;
      const newTime = this.editValue.getTime();

      // Only emit if the date has actually changed
      if (newTime !== originalTime) {
        this.valueChange.emit(this.editValue);
      }
    }
    this.editing = false;
  }

  private openPicker(): void {
    this.picker?.open();
  }
}
