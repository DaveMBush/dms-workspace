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
  selector: 'rms-editable-date-cell',
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
  @Input() value: Date | null = null;
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

  onDateChange(date: Date | null): void {
    this.editValue = date;
  }

  onPickerClosed(): void {
    if (
      this.editValue &&
      (!this.value || this.editValue.getTime() !== this.value.getTime())
    ) {
      this.valueChange.emit(this.editValue);
    }
    this.editing = false;
  }

  onBlur(): void {
    // close edit mode when focus leaves input (no selection)
    this.editing = false;
  }

  private openPicker(): void {
    this.picker?.open();
  }
}
