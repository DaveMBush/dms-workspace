import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { TableModule } from 'primeng/table';

type CellType = 'currency' | 'date' | 'number';

@Component({
  selector: 'rms-editable-cell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    TableModule,
    InputNumberModule,
    DatePickerModule,
    FormsModule,
  ],
  templateUrl: './editable-cell.component.html',
})
export class EditableCellComponent {
  @Input() field = '';
  @Input() value: unknown;
  @Input() type: CellType = 'number';
  @Input() inputClass = 'w-32 block';
  @Input() min = 0;
  @Input() max: number | undefined;
  @Input() step = 1;
  @Input() mode = 'decimal';
  @Input() minFractionDigits = 0;
  @Input() maxFractionDigits = 4;
  @Input() currencyFormat = '1.2-4';

  @Output() readonly commit = new EventEmitter<void>();

  onCommit(): void {
    this.commit.emit();
  }

  stopArrowKeyPropagation(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.stopPropagation();
    }
  }

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  currencyValue$ = computed(() => this.value as number);

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  dateValue$ = computed(() => this.value as Date);
}
