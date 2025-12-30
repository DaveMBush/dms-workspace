import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { TableModule } from 'primeng/table';

@Component({
  selector: 'dms-editable-date-cell',
  templateUrl: './editable-date-cell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, DatePickerModule, TableModule],
})
export class EditableDateCellComponent {
  field = input.required<string>();
  value = model.required<Date | null>();
  isExpired = input<boolean>(false);
  readonly editCommit = output();

  // Signal aliases with $ suffix for template
  field$ = this.field;
  value$ = this.value;

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  cellClass$ = computed(() =>
    this.isExpired()
      ? 'bg-red-300 dark:bg-red-700'
      : 'bg-gray-300 dark:bg-gray-700'
  );

  stopArrowKeyPropagation(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.stopPropagation();
    }
  }
}
