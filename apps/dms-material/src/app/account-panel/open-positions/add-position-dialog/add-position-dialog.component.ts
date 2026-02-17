import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  ViewChild,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { SymbolAutocompleteComponent } from '../../../shared/components/symbol-autocomplete/symbol-autocomplete.component';
import { SymbolOption } from '../../../shared/components/symbol-autocomplete/symbol-option.interface';
import { selectUniverses } from '../../../store/universe/selectors/select-universes.function';
import { AddPositionData } from './add-position-data.interface';

@Component({
  selector: 'dms-add-position-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './add-position-dialog.component.html',
  styleUrl: './add-position-dialog.component.scss',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    SymbolAutocompleteComponent,
  ],
})
export class AddPositionDialogComponent implements AfterViewInit {
  @ViewChild(SymbolAutocompleteComponent)
  private symbolAutocomplete!: SymbolAutocompleteComponent;

  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<AddPositionDialogComponent>);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly data: AddPositionData = inject<AddPositionData>(MAT_DIALOG_DATA);

  form: FormGroup;
  private selectedSymbolId: string | null = null;
  private selectedUniverseId: string | null = null;

  // Price pattern: 2-5 decimal places
  private readonly pricePattern = /^\d+\.\d{2,5}$/;
  // Quantity pattern: integers only
  private readonly quantityPattern = /^\d+$/;

  // Bound symbol search function for autocomplete
  readonly symbolSearchFnBound = this.symbolSearchFn.bind(this);

  constructor() {
    this.form = this.fb.group({
      symbol: [
        '',
        [Validators.required, this.symbolExistsValidator.bind(this)],
      ],
      quantity: [
        '',
        [
          Validators.required,
          Validators.min(1),
          Validators.pattern(this.quantityPattern),
        ],
      ],
      price: [
        '',
        [
          Validators.required,
          Validators.min(0.01),
          Validators.pattern(this.pricePattern),
        ],
      ],
      purchase_date: ['', [Validators.required]],
    });
  }

  ngAfterViewInit(): void {
    // Subscribe to autocomplete search control changes to sync with form control
    // This ensures validation runs even when user types free text without selecting
    const self = this;
    function onSearchValueChange(value: unknown): void {
      if (typeof value === 'string') {
        self.symbolControl.setValue(value);
        self.symbolControl.markAsTouched();
      }
    }
    this.symbolAutocomplete.searchControl.valueChanges.subscribe(
      onSearchValueChange
    );
  }

  // Expose controls for template access without function calls
  get symbolControl(): FormControl {
    return this.form.get('symbol') as FormControl;
  }

  get quantityControl(): FormControl {
    return this.form.get('quantity') as FormControl;
  }

  get priceControl(): FormControl {
    return this.form.get('price') as FormControl;
  }

  get purchaseDateControl(): FormControl {
    return this.form.get('purchase_date') as FormControl;
  }

  // Symbol search function for autocomplete - bound method
  async symbolSearchFn(query: string): Promise<SymbolOption[]> {
    return Promise.resolve(this.searchSymbolsSync(query));
  }

  onSymbolSelected(option: SymbolOption): void {
    this.selectedSymbolId = option.symbol.toUpperCase();
    this.selectedUniverseId = option.id ?? null;
    this.symbolControl.setValue(option.symbol.toUpperCase());
    this.symbolControl.markAsTouched();
    // Trigger validation after selection
    this.symbolControl.updateValueAndValidity();
  }

  onSymbolBlur(): void {
    // Convert to uppercase and use matched symbol if valid
    const currentValue: unknown = this.symbolControl.value;
    if (typeof currentValue !== 'string' || !currentValue) {
      return;
    }

    // Trigger validation which will auto-select if match exists
    this.symbolControl.updateValueAndValidity();

    // If valid (has a match), set the matched symbol value
    const isValid = this.symbolControl.valid;
    const hasSelectedId =
      this.selectedSymbolId !== null && this.selectedSymbolId !== '';
    if (!isValid || !hasSelectedId) {
      return;
    }

    this.symbolControl.setValue(this.selectedSymbolId, { emitEvent: false });
    this.updateAutocompleteDisplay();
    this.cdr.markForCheck();
  }

  onQuantityInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value;

    // Remove any non-digit characters
    value = value.replace(/\D/g, '');

    // Update the input and form control
    input.value = value;
    this.quantityControl.setValue(value || null);
    this.quantityControl.updateValueAndValidity();
    this.cdr.markForCheck();
  }

  onPriceInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value;

    // Allow digits, one decimal point, and up to 5 decimal places
    // Remove any characters that aren't digits or decimal point
    value = value.replace(/[^0-9.]/g, '');

    // Only keep first decimal point
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }

    // Limit to 5 decimal places
    if (parts.length === 2 && parts[1].length > 5) {
      value = parts[0] + '.' + parts[1].substring(0, 5);
    }

    // Update the input and form control
    input.value = value;
    this.priceControl.setValue(value || null);
    this.priceControl.updateValueAndValidity();
    this.cdr.markForCheck();
  }

  onSave(): void {
    const hasValidUniverse =
      this.selectedUniverseId !== null &&
      this.selectedUniverseId !== undefined &&
      this.selectedUniverseId !== '';

    if (!this.form.valid || !hasValidUniverse) {
      return;
    }

    interface FormValue {
      symbol: string;
      quantity: string;
      price: string;
      // eslint-disable-next-line @typescript-eslint/naming-convention -- backend field name
      purchase_date: string;
    }
    const formValue = this.form.value as FormValue;
    this.dialogRef.close({
      symbol: this.selectedSymbolId!,
      universeId: this.selectedUniverseId!,
      quantity: parseInt(formValue.quantity, 10),
      price: parseFloat(formValue.price),
      purchase_date: formValue.purchase_date,
    });
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  private updateAutocompleteDisplay(): void {
    const autocomplete = this.symbolAutocomplete;
    const selectedId = this.selectedSymbolId;
    const hasAutocomplete = autocomplete !== null && autocomplete !== undefined;
    const hasSelectedId =
      selectedId !== null && selectedId !== undefined && selectedId !== '';

    if (hasAutocomplete && hasSelectedId) {
      autocomplete.searchControl.setValue(selectedId, { emitEvent: false });
    }
  }

  // Custom validator to check if symbol exists in universe
  // Also auto-selects first match (exact match first, then partial match)
  private symbolExistsValidator(
    control: AbstractControl
  ): ValidationErrors | null {
    const value: unknown = control.value;
    if (typeof value !== 'string' || value.length === 0) {
      return null; // Let required validator handle empty values
    }

    const universes = selectUniverses();
    const symbolValue: string = value.toLowerCase();

    // Find first matching symbol in universe
    const matchedUniverse = this.findMatchingUniverse(universes, symbolValue);

    if (matchedUniverse) {
      this.updateSelectedSymbol(matchedUniverse);
      return null; // Valid
    }

    // Symbol doesn't exist - clear selection
    this.clearSelectedSymbol();
    return { invalidSymbol: true };
  }

  private findMatchingUniverse(
    universes: ReturnType<typeof selectUniverses>,
    symbolValue: string
  ): (typeof universes)[0] | null {
    let partialMatch: (typeof universes)[0] | null = null;

    for (let i = 0; i < universes.length; i++) {
      const universe = universes[i];
      if (typeof universe.symbol !== 'string') {
        continue;
      }

      const uSymbol = universe.symbol.toLowerCase();
      if (uSymbol === symbolValue) {
        return universe; // Exact match - return immediately
      }

      if (!partialMatch && uSymbol.includes(symbolValue)) {
        partialMatch = universe;
      }
    }

    return partialMatch;
  }

  private updateSelectedSymbol(
    universe: ReturnType<typeof selectUniverses>[0]
  ): void {
    const upperSymbol = universe.symbol.toUpperCase();
    if (this.selectedSymbolId !== upperSymbol) {
      this.selectedSymbolId = upperSymbol;
      this.selectedUniverseId = universe.id;
    }
  }

  private clearSelectedSymbol(): void {
    this.selectedSymbolId = null;
    this.selectedUniverseId = null;
  }

  private searchSymbolsSync(query: string): SymbolOption[] {
    const universes = selectUniverses();
    const lowerQuery = query.toLowerCase();
    const results: SymbolOption[] = [];
    const maxResults = 50;

    // Iterate using index-based loop since SmartSignals are array-like but not true arrays
    for (let i = 0; i < universes.length && results.length < maxResults; i++) {
      const u = universes[i];
      const symbolMatch = u.symbol.toLowerCase().includes(lowerQuery);
      const nameMatch = u.name.toLowerCase().includes(lowerQuery);

      if (symbolMatch || nameMatch) {
        results.push({
          id: u.id,
          symbol: u.symbol.toUpperCase(),
          name: u.name,
        });
      }
    }

    return results;
  }
}
