import { CurrencyPipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'dms-editable-cell',
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    DecimalPipe,
    CurrencyPipe,
  ],
  templateUrl: './editable-cell.component.html',
  styleUrl: './editable-cell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditableCellComponent {
  value = input.required<number>();
  min = input<number>();
  max = input<number>();
  step = input<number>(1);
  format = input<'currency' | 'decimal' | 'number'>('number');
  decimalFormat = input<string>('1.2-2');

  readonly valueChange = output<number>();

  isEditing$ = signal(false);
  editValue$ = signal<number>(0);
  rawEditValue$ = signal<string>('');

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- needed to capture this
  displayValue$ = computed(() => this.value());
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- needed to capture this
  formatType$ = computed(() => this.format());
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- needed to capture this
  min$ = computed(() => this.min() ?? null);
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- needed to capture this
  max$ = computed(() => this.max() ?? null);
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- needed to capture this
  step$ = computed(() => this.step());

  @ViewChild('inputRef') inputRef!: ElementRef<HTMLInputElement>;

  startEdit(): void {
    this.editValue$.set(this.value());
    this.rawEditValue$.set(String(this.value()));
    this.isEditing$.set(true);
    const context = this;
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- needed to capture this
    setTimeout(() => {
      context.inputRef?.nativeElement?.focus();
    }, 0);
  }

  onValueChange(newValue: number | string): void {
    // Store raw string value while editing to preserve decimal punctuation
    this.rawEditValue$.set(String(newValue));
  }

  saveEdit(): void {
    // Parse and validate the raw string value
    const numericValue = parseFloat(this.rawEditValue$());

    // Only save if it's a valid number
    if (!isNaN(numericValue)) {
      this.editValue$.set(numericValue);
      if (numericValue !== this.value()) {
        this.valueChange.emit(numericValue);
      }
    }

    this.isEditing$.set(false);
  }

  cancelEdit(): void {
    this.isEditing$.set(false);
  }
}
