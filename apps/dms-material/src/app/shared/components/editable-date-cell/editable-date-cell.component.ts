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
  @Input() set value(val: Date | string | null | undefined) {
    if (val === null || val === undefined) {
      this.internalValue = null;
      return;
    }
    if (typeof val === 'string') {
      this.internalValue = this.parseStringToDate(val.trim());
      return;
    }
    this.internalValue = isNaN(val.getTime())
      ? null
      : this.normalizeDateToLocalMidnight(val);
  }

  get value(): Date | null {
    return this.internalValue;
  }

  private internalValue: Date | null = null;

  @Input() dateFormat = 'MM/dd/yyyy';
  @Input() testIdFieldName = '';
  @Input() testId = '';

  @Output() readonly valueChange = new EventEmitter<Date | null>();

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
      const originalTime =
        this.value instanceof Date ? this.value.getTime() : 0;
      const newTime = this.editValue.getTime();

      // Only emit if the date has actually changed
      if (newTime !== originalTime) {
        this.valueChange.emit(this.editValue);
      }
    } else if (this.value !== null) {
      // User cleared the date — emit null so the parent can persist the clear
      this.valueChange.emit(null);
    }
    this.editing = false;
  }

  private openPicker(): void {
    this.picker?.open();
  }

  private parseStringToDate(trimmed: string): Date | null {
    if (trimmed === '') {
      return null;
    }
    return this.parseIsoString(trimmed) ?? this.parseFallbackString(trimmed);
  }

  private parseIsoString(trimmed: string): Date | null {
    if (!trimmed.includes('-') && !trimmed.includes('T')) {
      return null;
    }
    const datePart = trimmed.split('T')[0];
    const parts = datePart.split('-');
    if (parts.length !== 3) {
      return null;
    }
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return null;
    }
    const date = new Date(year, month, day);
    return isNaN(date.getTime()) ? null : date;
  }

  private parseFallbackString(trimmed: string): Date | null {
    const parsed = new Date(trimmed);
    return isNaN(parsed.getTime())
      ? null
      : this.normalizeDateToLocalMidnight(parsed);
  }

  private normalizeDateToLocalMidnight(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
}
