import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
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
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { SymbolAutocompleteComponent } from '../../shared/components/symbol-autocomplete/symbol-autocomplete.component';
import { SymbolOption } from '../../shared/components/symbol-autocomplete/symbol-option.interface';
import { selectDivDepositTypes } from '../../store/div-deposit-types/selectors/select-div-deposit-types.function';
import { DivDeposit } from '../../store/div-deposits/div-deposit.interface';
import { selectUniverses } from '../../store/universe/selectors/select-universes.function';
import { DivDepModalData } from './div-dep-modal-data.interface';

@Component({
  selector: 'dms-div-dep-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    SymbolAutocompleteComponent,
  ],
  templateUrl: './div-dep-modal.component.html',
  styleUrl: './div-dep-modal.component.scss',
})
export class DivDepModal implements OnInit, AfterViewInit {
  @ViewChild(SymbolAutocompleteComponent)
  private symbolAutocomplete: SymbolAutocompleteComponent | undefined;

  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<DivDepModal>);
  private cdr = inject(ChangeDetectorRef);
  data = inject<DivDepModalData>(MAT_DIALOG_DATA);

  isLoading$ = signal(false);
  readonly selectedDepositTypeId = signal('');

  private selectedUniverseId: string | null = null;
  private selectedSymbolId: string | null = null;

  readonly symbolSearchFnBound = this.symbolSearchFn.bind(this);

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- computed signal
  readonly depositTypes$ = computed(() => selectDivDepositTypes());

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- computed signal
  readonly isDepositType$ = computed(() => {
    const types = selectDivDepositTypes();
    const id = this.selectedDepositTypeId();
    for (let i = 0; i < types.length; i++) {
      if (types[i].id === id) {
        return types[i].name === 'Deposit';
      }
    }
    return false;
  });

  form = this.fb.group({
    symbol: ['', [Validators.required, this.symbolExistsValidator.bind(this)]],
    date: [null as Date | null, Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    divDepositTypeId: ['', Validators.required],
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- hiding arrow function
  dateHasError$ = computed(() => {
    return this.form.get('date')?.hasError('required') ?? false;
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- hiding arrow function
  amountHasError$ = computed(() => {
    return this.form.get('amount')?.hasError('required') ?? false;
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- hiding arrow function
  buttonLabel$ = computed(() => {
    return this.isEditMode ? 'Update' : 'Save';
  });

  get isEditMode(): boolean {
    return this.data.mode === 'edit';
  }

  get title(): string {
    return this.isEditMode
      ? 'Edit Dividend or Deposit'
      : 'New Dividend or Deposit';
  }

  get symbolControl(): FormControl {
    return this.form.get('symbol') as FormControl;
  }

  ngOnInit(): void {
    if (this.isEditMode && this.data.dividend) {
      this.selectedUniverseId = this.data.dividend.universeId ?? null;
      this.selectedSymbolId = this.data.dividend.symbol ?? null;
      this.form.patchValue({
        symbol: this.data.dividend.symbol ?? '',
        date: this.data.dividend.exDate ?? this.data.dividend.date ?? null,
        amount: this.data.dividend.amount,
        divDepositTypeId: this.data.dividend.divDepositTypeId ?? '',
      });
      this.selectedDepositTypeId.set(this.data.dividend.divDepositTypeId ?? '');
      this.updateSymbolValidators();
    }
    const self = this;
    function onTypeChange(typeId: string | null): void {
      self.selectedDepositTypeId.set(typeId ?? '');
      self.updateSymbolValidators();
    }
    this.form.get('divDepositTypeId')!.valueChanges.subscribe(onTypeChange);
  }

  ngAfterViewInit(): void {
    if (this.symbolAutocomplete === undefined) {
      return;
    }
    const self = this;
    function onSearchValueChange(value: unknown): void {
      if (typeof value === 'string') {
        // Sync text to the outer form control so validators run.
        // Do NOT uppercase here — onSymbolBlur handles that on tab-out.
        self.symbolControl.setValue(value);
        self.symbolControl.markAsTouched();
      }
    }
    this.symbolAutocomplete.searchControl.valueChanges.subscribe(
      onSearchValueChange
    );
    if (
      this.isEditMode &&
      this.selectedSymbolId !== null &&
      this.selectedSymbolId.length > 0
    ) {
      this.symbolAutocomplete.searchControl.setValue(this.selectedSymbolId, {
        emitEvent: false,
      });
    }
  }

  onSymbolSelected(option: SymbolOption): void {
    this.selectedSymbolId = option.symbol.toUpperCase();
    this.selectedUniverseId = option.id ?? null;
    this.symbolControl.setValue(option.symbol.toUpperCase());
    this.symbolControl.markAsTouched();
    this.symbolControl.updateValueAndValidity();
  }

  onSubmit(): void {
    if (
      this.form.invalid ||
      (!this.isDepositType$() && this.selectedUniverseId === null)
    ) {
      this.form.markAllAsTouched();
      return;
    }

    interface FormValue {
      symbol: string;
      date: Date;
      amount: number;
      divDepositTypeId: string;
    }
    const formValue = this.form.value as FormValue;

    const dividend: Partial<DivDeposit> = {
      ...this.data.dividend,
      date: formValue.date,
      amount: parseFloat(String(formValue.amount)),
      divDepositTypeId: formValue.divDepositTypeId,
      universeId: this.selectedUniverseId,
    };

    this.dialogRef.close(dividend);
  }

  onSymbolBlur(): void {
    const currentValue = this.symbolAutocomplete?.searchControl.value;
    if (typeof currentValue !== 'string') {
      return;
    }
    const upper = currentValue.toUpperCase();
    // Always uppercase the visible search text.
    if (upper !== currentValue) {
      this.symbolAutocomplete?.searchControl.setValue(upper, {
        emitEvent: false,
      });
    }
    // Push the uppercased value to the outer form control and re-run
    // validators.  symbolExistsValidator will auto-populate selectedUniverseId
    // if the symbol matches something in the universe.
    this.symbolControl.setValue(upper);
    this.symbolControl.markAsTouched();
    this.symbolControl.updateValueAndValidity();
    this.cdr.markForCheck();
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  private updateSymbolValidators(): void {
    const symbolCtrl = this.form.get('symbol')!;
    if (this.isDepositType$()) {
      symbolCtrl.removeValidators(Validators.required);
    } else {
      symbolCtrl.addValidators(Validators.required);
    }
    symbolCtrl.updateValueAndValidity({ emitEvent: false });
    this.cdr.markForCheck();
  }

  // Validator: finds first exact then partial case-insensitive match.
  // Uses an index-based loop because SmartNgRX returns an array-like object
  // that does not have built-in Array methods such as .find() or .filter().
  private symbolExistsValidator(
    control: AbstractControl
  ): ValidationErrors | null {
    const value: unknown = control.value;
    if (typeof value !== 'string' || value.length === 0) {
      return null; // Let required validator handle empty
    }
    const symbolLower = value.toLowerCase();
    const universes = selectUniverses();
    let exactIdx = -1;
    let partialIdx = -1;
    for (let i = 0; i < universes.length; i++) {
      const u = universes[i];
      if (typeof u.symbol !== 'string') {
        continue;
      }
      const uLower = u.symbol.toLowerCase();
      if (uLower === symbolLower) {
        exactIdx = i;
        break;
      }
      if (partialIdx === -1 && uLower.includes(symbolLower)) {
        partialIdx = i;
      }
    }
    const idx = exactIdx !== -1 ? exactIdx : partialIdx;
    if (idx !== -1) {
      const matched = universes[idx];
      this.selectedSymbolId = matched.symbol.toUpperCase();
      this.selectedUniverseId = matched.id;
      return null;
    }
    this.selectedSymbolId = null;
    this.selectedUniverseId = null;
    return { invalidSymbol: true };
  }

  private async symbolSearchFn(query: string): Promise<SymbolOption[]> {
    return Promise.resolve(this.searchSymbolsSync(query));
  }

  private searchSymbolsSync(query: string): SymbolOption[] {
    const universes = selectUniverses();
    const lowerQuery = query.toLowerCase();
    const results: SymbolOption[] = [];
    const maxResults = 50;

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
