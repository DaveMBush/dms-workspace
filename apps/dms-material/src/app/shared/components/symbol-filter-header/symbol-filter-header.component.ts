import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { FilterOption } from './filter-option.interface';

@Component({
  selector: 'dms-symbol-filter-header',
  imports: [MatSelectModule, MatFormFieldModule],
  templateUrl: './symbol-filter-header.component.html',
  styleUrl: './symbol-filter-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SymbolFilterHeaderComponent {
  readonly label = input<string>('Filter');
  readonly options = input<FilterOption[]>([]);
  readonly selectedValue = input<string | null>(null);

  readonly filterChange = output<string | null>();

  protected get labelValue(): string {
    return this.label();
  }

  protected get optionsValue(): FilterOption[] {
    return this.options();
  }

  protected get selectedValueValue(): string | null {
    return this.selectedValue();
  }

  onSelectionChange(value: string | null): void {
    this.filterChange.emit(value);
  }
}
